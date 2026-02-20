'use strict';
// ═══════════════════════════════════════════════════════════════
//  DICE BROKER — game.js
//
//  Architecture:
//   DiceRenderer  — shared Three.js scene that draws individual
//                   dice onto offscreen canvases (rack) or the
//                   tray canvas, with face-number textures
//   Player class  — game logic
//   Game state    — round lifecycle, UI updates
// ═══════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────
//  CONSTANTS
// ───────────────────────────────────────────────────────────────
const DICE_SIDES = [4, 6, 8, 10, 12, 20, 30, 40, 60, 100];

const DIE_HEX = {
  4:   0xe84040,  6:  0xe87820,  8:  0xd4b800,
  10:  0x28c8e8,  12: 0x28d890,  20: 0x8870f8,
  30:  0xc050ff,  40: 0xff4080,  60: 0xffb020,  100: 0xe850a8,
};
const DIE_CSS = {
  4:   '#e84040',  6:  '#e87820',  8:  '#d4b800',
  10:  '#28c8e8',  12: '#28d890',  20: '#8870f8',
  30:  '#c050ff',  40: '#ff4080',  60: '#ffb020',  100: '#e850a8',
};

const AI_NAMES = ['Grimbald','Thessaly','Corvyn','Morryn','Aldric','Vesper','Idris'];

const DIFF = {
  easy:   { label:'Tavern Brawl',  target: 75 },
  medium: { label:"Outlaw's Game", target: 100 },
  hard:   { label:'The Long Night',target: 125 },
};

// ───────────────────────────────────────────────────────────────
//  MAKE FACE TEXTURE — draws the die number on a canvas → texture
//  This is the key feature: each die shows its own number
// ───────────────────────────────────────────────────────────────
function makeFaceTexture(sides, size = 128) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');

  // Gradient background matching die colour (darkened)
  const base = DIE_CSS[sides];
  const grad = ctx.createRadialGradient(size*.4, size*.35, 0, size*.5, size*.5, size*.7);
  grad.addColorStop(0, lighten(base, 60));
  grad.addColorStop(0.5, base);
  grad.addColorStop(1, darken(base, 50));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Inner bevel highlight
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = size * 0.05;
  ctx.strokeRect(size*.08, size*.08, size*.84, size*.84);

  // Draw the number
  const label = `D${sides}`;
  ctx.fillStyle = 'rgba(0,0,0,0.85)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Big number
  const numSize = sides === 100 ? size * 0.34 : size * 0.42;
  ctx.font = `900 ${numSize}px "Cinzel", Georgia, serif`;
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 4;
  ctx.fillText(String(sides), size / 2, size * 0.52);

  // Small "D" prefix above
  ctx.font = `700 ${size * 0.17}px "Cinzel", Georgia, serif`;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillText('D', size * 0.5, size * 0.25);

  ctx.shadowBlur = 0;
  return new THREE.CanvasTexture(c);
}

function lighten(hex, amt) {
  const n = parseInt(hex.replace('#',''), 16);
  const r = Math.min(255, (n>>16) + amt);
  const g = Math.min(255, ((n>>8)&0xff) + amt);
  const b = Math.min(255, (n&0xff) + amt);
  return `rgb(${r},${g},${b})`;
}
function darken(hex, amt) {
  const n = parseInt(hex.replace('#',''), 16);
  const r = Math.max(0, (n>>16) - amt);
  const g = Math.max(0, ((n>>8)&0xff) - amt);
  const b = Math.max(0, (n&0xff) - amt);
  return `rgb(${r},${g},${b})`;
}

// ───────────────────────────────────────────────────────────────
//  DICE 3D ENGINE
//  Two modes:
//   1. renderStatic(sides, canvas)  — draw a still die on a small canvas (rack)
//   2. rollTray(diceList) → Promise — animate dice rolling in tray canvas
// ───────────────────────────────────────────────────────────────
const DiceEngine = (() => {
  // Cache of {renderer, scene, camera} per canvas element
  const staticCache = new Map();

  // Tray scene
  let trayR, trayScene, trayCamera, trayAnimId;
  let trayMeshes = [];

  // Geometry for each die type
  function makeGeo(sides) {
    switch(sides) {
      case 4:   return new THREE.TetrahedronGeometry(1.1, 0);
      case 6:   return new THREE.BoxGeometry(1.4, 1.4, 1.4);
      case 8:   return new THREE.OctahedronGeometry(1.2, 0);
      case 10:  return new THREE.ConeGeometry(.95, 1.6, 10, 1);
      case 12:  return new THREE.DodecahedronGeometry(1.1, 0);
      case 20:  return new THREE.IcosahedronGeometry(1.15, 0);
      case 30:  return new THREE.DodecahedronGeometry(1.15, 1);
      case 40:  return new THREE.IcosahedronGeometry(1.1, 1);
      case 60:  return new THREE.OctahedronGeometry(1.1, 2);
      case 100: return new THREE.SphereGeometry(1.0, 18, 18);
      default:  return new THREE.BoxGeometry(1.4,1.4,1.4);
    }
  }

  // Create a Three.js material for a die — uses face texture on all faces
  function makeMat(sides, opacity = 1) {
    const tex = makeFaceTexture(sides, 128);
    const mat = new THREE.MeshPhongMaterial({
      map: tex,
      color: 0xffffff,
      shininess: 70,
      specular: 0x333333,
      transparent: opacity < 1,
      opacity,
    });
    return mat;
  }

  // Render a single static die into a small canvas (used for rack)
  function renderStatic(sides, canvas, spinning = false) {
    let entry = staticCache.get(canvas);

    if (!entry) {
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      const w = canvas.clientWidth || 68;
      const h = canvas.clientHeight || 68;
      renderer.setSize(w, h, false);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, w/h, .1, 50);
      camera.position.set(0, 0, 4.5);

      // Lighting — warm candle from upper right
      const amb = new THREE.AmbientLight(0x4a3010, 0.7);
      scene.add(amb);
      const pt = new THREE.PointLight(0xff9a28, 2, 20);
      pt.position.set(3, 4, 4);
      scene.add(pt);
      const rim = new THREE.DirectionalLight(0x2a1a50, 0.4);
      rim.position.set(-3, 1, -2);
      scene.add(rim);

      // Die mesh
      const geo = makeGeo(sides);
      const mat = makeMat(sides);
      const mesh = new THREE.Mesh(geo, mat);
      scene.add(mesh);

      // Rotation state
      const rot = {
        rx: (Math.random() - .5) * Math.PI,
        ry: (Math.random() - .5) * Math.PI,
        spinX: 0,
        spinY: spinning ? .012 : .005,
      };

      entry = { renderer, scene, camera, mesh, rot, animId: null };
      staticCache.set(canvas, entry);

      // Animate
      const tick = () => {
        entry.animId = requestAnimationFrame(tick);
        entry.mesh.rotation.x = entry.rot.rx;
        entry.mesh.rotation.y += entry.rot.spinY;
        entry.rot.ry += entry.rot.spinY;
        entry.renderer.render(entry.scene, entry.camera);
      };
      tick();
    }

    return entry;
  }

  // Stop a static canvas animation
  function stopStatic(canvas) {
    const e = staticCache.get(canvas);
    if (e) cancelAnimationFrame(e.animId);
  }

  function resizeStatic(canvas) {
    const e = staticCache.get(canvas);
    if (!e) return;
    const w = canvas.clientWidth || 68;
    const h = canvas.clientHeight || 68;
    e.renderer.setSize(w, h, false);
    e.camera.aspect = w / h;
    e.camera.updateProjectionMatrix();
  }

  // ── Tray (rolling) ──────────────────────────────────────────
  function initTray() {
    if (trayR) return;
    const canvas = document.getElementById('tray-canvas');
    const w = canvas.clientWidth || canvas.offsetWidth || 300;
    const h = canvas.clientHeight || canvas.offsetHeight || 400;

    trayR = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    trayR.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    trayR.setSize(w, h);
    trayR.shadowMap.enabled = true;

    trayScene = new THREE.Scene();
    trayCamera = new THREE.PerspectiveCamera(50, w/h, .1, 100);
    trayCamera.position.set(0, 6, 8);
    trayCamera.lookAt(0, 0, 0);

    // Ambient
    trayScene.add(new THREE.AmbientLight(0x3a2808, 0.5));
    // Candle point
    const c = new THREE.PointLight(0xff9a28, 2, 25);
    c.position.set(3, 6, 4); c.castShadow = true;
    trayScene.add(c);
    // Rim
    const r = new THREE.DirectionalLight(0x201040, 0.5);
    r.position.set(-4, 3, -2);
    trayScene.add(r);

    // Table
    const table = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 30),
      new THREE.MeshLambertMaterial({ color: 0x100800 })
    );
    table.rotation.x = -Math.PI/2;
    table.position.y = -1.4;
    table.receiveShadow = true;
    trayScene.add(table);

    trayAnimate();
  }

  function trayResize() {
    if (!trayR) return;
    const canvas = document.getElementById('tray-canvas');
    const w = canvas.clientWidth || 300;
    const h = canvas.clientHeight || 400;
    trayR.setSize(w, h);
    trayCamera.aspect = w/h;
    trayCamera.updateProjectionMatrix();
  }

  function clearTray() {
    trayMeshes.forEach(o => trayScene.remove(o.mesh));
    trayMeshes = [];
  }

  // Roll dice in tray. Returns Promise that resolves when settled.
  function rollTray(diceList) {
    if (!trayR) initTray();
    clearTray();

    return new Promise(resolve => {
      const n = diceList.length;

      diceList.forEach((sides, i) => {
        const geo = makeGeo(sides);
        const mat = makeMat(sides);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;

        // Spread positions across tray
        const spread = Math.min(n * 1.5, 5);
        const xBase = n === 1 ? 0 : -spread/2 + (i/(n-1||1))*spread;
        mesh.position.set(xBase + (Math.random()-.5)*.5, 5 + Math.random()*2, (Math.random()-.5)*.5);
        mesh.rotation.set(
          Math.random()*Math.PI*2,
          Math.random()*Math.PI*2,
          Math.random()*Math.PI*2
        );

        const vel = { x: (Math.random()-.5)*.08, y: -0.2-Math.random()*.1, z: 0 };
        const spin = {
          x: (Math.random()-.5)*.35,
          y: (Math.random()-.5)*.35,
          z: (Math.random()-.5)*.25,
        };

        trayScene.add(mesh);
        trayMeshes.push({ mesh, vel, spin, settled: false });
      });

      // Poll for settlement
      const poll = setInterval(() => {
        if (trayMeshes.length && trayMeshes.every(o => o.settled)) {
          clearInterval(poll);
          setTimeout(resolve, 250);
        }
      }, 80);
      setTimeout(() => { clearInterval(poll); resolve(); }, 4000);
    });
  }

  function trayAnimate() {
    trayAnimId = requestAnimationFrame(trayAnimate);
    const GRAVITY = -0.014;
    const DAMPEN  = 0.52;
    const FRICTION= 0.90;
    const FLOOR   = -0.2;

    trayMeshes.forEach(o => {
      if (o.settled) return;
      o.vel.y += GRAVITY;
      o.mesh.position.x += o.vel.x;
      o.mesh.position.y += o.vel.y;
      o.mesh.position.z += o.vel.z;
      o.mesh.rotation.x += o.spin.x;
      o.mesh.rotation.y += o.spin.y;
      o.mesh.rotation.z += o.spin.z;

      if (o.mesh.position.y <= FLOOR) {
        o.mesh.position.y = FLOOR;
        o.vel.y = Math.abs(o.vel.y) * DAMPEN;
        o.vel.x *= FRICTION;
        o.spin.x *= DAMPEN; o.spin.y *= DAMPEN; o.spin.z *= DAMPEN;

        if (Math.abs(o.vel.y) < 0.005 && Math.abs(o.vel.x) < 0.003) {
          o.settled = true;
          o.vel.x=o.vel.y=o.vel.z=0;
          o.spin.x=o.spin.y=o.spin.z=0;
        }
      }
    });

    if (trayR) trayR.render(trayScene, trayCamera);
  }

  return { renderStatic, stopStatic, resizeStatic, initTray, rollTray, trayResize, clearTray };
})();

// ───────────────────────────────────────────────────────────────
//  PLAYER
// ───────────────────────────────────────────────────────────────
class Player {
  constructor(name, isHuman) {
    this.name = name;
    this.isHuman = isHuman;
    this.dice = [4];
    this.madeFirstChoice = false;
    this.eliminated = false;
    this.selectedDice = [4];
    this.roundScore = 0;
    this.roundRolls = [];
  }
  get isProtected() { return !this.madeFirstChoice; }
  get bestDie()     { return this.dice.length ? Math.max(...this.dice) : 0; }

  rollSelectedDice() {
    this.roundRolls = []; this.roundScore = 0;
    for (const s of this.selectedDice) {
      const roll = Math.ceil(Math.random() * s);
      this.roundRolls.push({ sides: s, roll });
      this.roundScore += roll;
    }
  }

  aiSelectDice() { this.selectedDice = [...this.dice]; }

  applyChoice(choice, die) {
    this.madeFirstChoice = true;
    if (choice === 'duplicate') {
      this.dice.push(die);
    } else {
      const idx = DICE_SIDES.indexOf(die);
      const next = Math.min(idx+1, DICE_SIDES.length-1);
      const pos = this.dice.indexOf(die);
      if (pos !== -1) this.dice[pos] = DICE_SIDES[next];
    }
    this.dice.sort((a,b)=>b-a);
  }

  _loseSingleDie() {
    if (!this.dice.length) return null;
    let eligible = this.dice.map((_,i)=>i);
    if (this.isProtected) {
      const d4i = this.dice.indexOf(4);
      if (d4i !== -1) {
        if (this.dice.length === 1) return null;
        eligible = eligible.filter(i=>i!==d4i);
      }
      if (!eligible.length) return null;
    }
    const pick = eligible[Math.floor(Math.random()*eligible.length)];
    const lost = this.dice[pick];
    this.dice.splice(pick, 1);
    return lost;
  }

  loseDice(count) {
    const lost = [];
    for (let i = 0; i < count; i++) {
      const die = this._loseSingleDie();
      if (die === null) break;
      lost.push(die);
    }
    return lost;
  }

  getAIChoice() {
    const b = this.bestDie;
    const idx = DICE_SIDES.indexOf(b);
    return { choice: idx < DICE_SIDES.length-1 ? 'upgrade' : 'duplicate', die: b };
  }
}

// ───────────────────────────────────────────────────────────────
//  GAME STATE
// ───────────────────────────────────────────────────────────────
const G = {
  players: [], pool: [],
  round: 0, difficulty: 'easy', numOpponents: 2,
  phase: 'setup', brokersDeal: false,
  escapeOffered: false, walkedAway: false,
};

// ───────────────────────────────────────────────────────────────
//  EMBER PARTICLES
// ───────────────────────────────────────────────────────────────
(function spawnEmbers() {
  const layer = document.getElementById('ember-layer');
  setInterval(()=>{
    const e = document.createElement('div');
    e.className = 'ember';
    const sz = 2 + Math.random()*3;
    e.style.cssText = `width:${sz}px;height:${sz}px;left:${10+Math.random()*80}%;animation-duration:${5+Math.random()*6}s;`;
    layer.appendChild(e);
    setTimeout(()=>e.remove(), 12000);
  }, 700);
})();

// ───────────────────────────────────────────────────────────────
//  LOGGING
// ───────────────────────────────────────────────────────────────
function log(msg, type='') {
  const el = document.createElement('div');
  el.className = `log-e ${type ? 'log-'+type : ''}`;
  el.textContent = msg;
  const body = document.getElementById('log-body');
  body.appendChild(el);
  body.scrollTop = body.scrollHeight;
}

// ───────────────────────────────────────────────────────────────
//  SCREENS
// ───────────────────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if (id === 'game-screen') {
    setTimeout(()=>{ DiceEngine.initTray(); DiceEngine.trayResize(); }, 120);
  }
}
const show = id => document.getElementById(id).classList.remove('hidden');
const hide = id => document.getElementById(id).classList.add('hidden');
function hideAllPhases() {
  ['phase-roll','phase-choice','phase-continue','phase-escape'].forEach(hide);
}

// ───────────────────────────────────────────────────────────────
//  SETUP INTERACTIONS
// ───────────────────────────────────────────────────────────────
document.querySelectorAll('#diff-group .s-btn').forEach(b=>
  b.addEventListener('click',()=>{
    document.querySelectorAll('#diff-group .s-btn').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
  })
);
document.querySelectorAll('#opp-group .s-btn').forEach(b=>
  b.addEventListener('click',()=>{
    document.querySelectorAll('#opp-group .s-btn').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
  })
);

document.getElementById('start-btn').addEventListener('click', initGame);
document.getElementById('play-again').addEventListener('click', ()=>showScreen('setup-screen'));

// Log toggle
document.getElementById('log-toggle').addEventListener('click', ()=>{
  const panel = document.getElementById('log-panel');
  const btn = document.getElementById('log-toggle');
  panel.classList.toggle('expanded');
  btn.textContent = panel.classList.contains('expanded') ? '▼' : '▲';
});

// ───────────────────────────────────────────────────────────────
//  GAME INIT
// ───────────────────────────────────────────────────────────────
function initGame() {
  G.difficulty   = document.querySelector('#diff-group .s-btn.active').dataset.v;
  G.numOpponents = parseInt(document.querySelector('#opp-group .s-btn.active').dataset.v, 10);
  G.pool = []; G.round = 0; G.phase = 'select';
  G.escapeOffered = false; G.walkedAway = false;

  G.players = [new Player('You', true)];
  const names = [...AI_NAMES].sort(()=>Math.random()-.5);
  for (let i=0; i<G.numOpponents; i++) G.players.push(new Player(names[i], false));

  document.getElementById('log-body').innerHTML = '';
  document.getElementById('diff-pill').textContent = DIFF[G.difficulty].label;
  document.getElementById('target-pill').textContent = `Goal: ${DIFF[G.difficulty].target}+ score`;

  showScreen('game-screen');
  startRound();
}

// ───────────────────────────────────────────────────────────────
//  ROUND LIFECYCLE
// ───────────────────────────────────────────────────────────────
function startRound() {
  G.round++; G.phase = 'select'; G.brokersDeal = false;
  document.getElementById('round-label').textContent = `Round ${G.round}`;
  hideAllPhases();
  hide('tray-result');
  show('tray-hint');

  G.players.forEach(p=>{ if (!p.isHuman && !p.eliminated) p.aiSelectDice(); });

  log(`── Round ${G.round} ──`, 'round');
  renderLeaderboard();
  buildRack();
  updateSelectedSummary();

  // Start with nothing selected; show roll button when at least one die selected
  const human = G.players[0];
  if (!human.eliminated) {
    show('phase-roll');
    G.phase = 'select';
  } else {
    // Human eliminated, run AI round automatically
    G.players.filter(p=>!p.eliminated).forEach(p=>p.aiSelectDice());
    executeRound();
  }
}

// ───────────────────────────────────────────────────────────────
//  RACK — build 3D die canvases for each die the human owns
// ───────────────────────────────────────────────────────────────
function buildRack() {
  const human = G.players[0];
  const container = document.getElementById('rack-slots');
  container.innerHTML = '';

  // Default: all selected
  human.selectedDice = [...human.dice];

  human.dice.forEach((sides, idx) => {
    const wrap = document.createElement('div');
    wrap.className = 'rack-die-wrap selected';
    wrap.dataset.idx = idx;
    wrap.dataset.sides = sides;

    // Selection ring overlay
    const ring = document.createElement('div');
    ring.className = 'rack-sel-ring';
    wrap.appendChild(ring);

    // Three.js canvas
    const canvas = document.createElement('canvas');
    canvas.className = 'rack-die-canvas';
    canvas.width = 80; canvas.height = 80;
    canvas.style.width = '68px'; canvas.style.height = '68px';
    wrap.appendChild(canvas);

    // Small label below
    const lbl = document.createElement('div');
    lbl.style.cssText = `font-family:'Cinzel',serif;font-size:.55rem;color:${DIE_CSS[sides]};text-align:center;margin-top:1px;`;
    lbl.textContent = `D${sides}`;
    wrap.appendChild(lbl);

    container.appendChild(wrap);

    // Render 3D die (spinning slowly)
    setTimeout(()=> DiceEngine.renderStatic(sides, canvas, true), 50);

    // Toggle selection on tap/click
    wrap.addEventListener('click', ()=>{
      if (G.phase !== 'select') return;
      wrap.classList.toggle('selected');
      rebuildSelectedDice();
      updateSelectedSummary();
    });
  });
}

function rebuildSelectedDice() {
  const human = G.players[0];
  const selected = [];
  document.querySelectorAll('.rack-die-wrap.selected').forEach(w=>{
    selected.push(parseInt(w.dataset.sides));
  });
  human.selectedDice = selected;
}

function updateSelectedSummary() {
  const human = G.players[0];
  const chips = document.getElementById('sel-chips');
  const none  = document.getElementById('sel-none');
  chips.innerHTML = '';

  if (!human.selectedDice || !human.selectedDice.length) {
    none.style.display = '';
  } else {
    none.style.display = 'none';
    human.selectedDice.forEach(s=>{
      const c = document.createElement('span');
      c.className = 'sel-chip';
      c.style.background = DIE_CSS[s];
      c.textContent = `D${s}`;
      chips.appendChild(c);
    });
  }
}

// ───────────────────────────────────────────────────────────────
//  ROLL BUTTON
// ───────────────────────────────────────────────────────────────
document.getElementById('roll-btn').addEventListener('click', ()=>{
  const human = G.players[0];
  rebuildSelectedDice();
  if (!human.selectedDice.length) {
    log('Select at least one die!', 'loss');
    return;
  }
  G.brokersDeal = false;
  hide('tray-hint');
  hideAllPhases();
  executeRound();
});

document.getElementById('deal-btn').addEventListener('click', ()=>{
  const human = G.players[0];
  // Broker's Deal forces all dice
  human.selectedDice = [...human.dice];
  document.querySelectorAll('.rack-die-wrap').forEach(w=>w.classList.add('selected'));
  updateSelectedSummary();
  G.brokersDeal = true;
  hide('tray-hint');
  hideAllPhases();
  const target = DIFF[G.difficulty].target;
  log(`☠ You call the Broker's Deal — going for ${target}+!`, 'win');
  executeRound();
});

// ───────────────────────────────────────────────────────────────
//  EXECUTE ROUND
// ───────────────────────────────────────────────────────────────
function executeRound() {
  G.phase = 'rolling';
  const active = G.players.filter(p=>!p.eliminated);

  // Everyone rolls
  active.forEach(p=>p.rollSelectedDice());

  // 3D animate human's dice in tray
  const human = G.players[0];
  const trayDice = human.eliminated ? [6] : human.selectedDice;

  DiceEngine.rollTray(trayDice).then(()=> resolveRound(active));
}

function resolveRound(active) {
  // Find winner
  let maxScore = -Infinity;
  active.forEach(p=>{ if (p.roundScore > maxScore) maxScore = p.roundScore; });
  const tied = active.filter(p=>p.roundScore===maxScore);
  const winner = tied[Math.floor(Math.random()*tied.length)];

  G.phase = 'resolving';

  // Show result overlay
  hide('tray-hint');
  const resultEl = document.getElementById('tray-result');
  resultEl.textContent = `${winner.name}: ${maxScore.toLocaleString()}`;
  resultEl.classList.remove('hidden');

  log(`${winner.name} wins with ${maxScore.toLocaleString()}!`, 'win');

  // Show results in leaderboard with scores
  renderLeaderboard(winner, active);
  flashLeaderboard(winner, active.filter(p=>p!==winner));

  // Losers lose half the dice they bet (min 1)
  active.filter(p=>p!==winner).forEach(p=>{
    const numToLose = Math.max(1, Math.floor(p.selectedDice.length / 2));
    const lost = p.loseDice(numToLose);
    lost.forEach(d=>{
      G.pool.push(d);
      log(`${p.name} lost a D${d} to the pool.`, 'loss');
    });
    if (p.dice.length === 0) {
      p.eliminated = true;
      log(`${p.name} has been eliminated!`, 'loss');
    }
  });

  renderLeaderboard(winner, active);

  // Handle winner
  const winTarget = DIFF[G.difficulty].target;
  setTimeout(()=>{
    // Score-based win: auto-win on lucky roll, or declared Broker's Deal
    if (winner.roundScore >= winTarget) {
      if (G.brokersDeal && winner.isHuman) {
        log(`☠ BROKER'S DEAL! You scored ${winner.roundScore} — the house falls!`, 'win');
      } else {
        log(`🎲 ${winner.name} scored ${winner.roundScore} — hits the mark!`, 'win');
      }
      endGame(winner);
      return;
    }

    if (winner.isHuman) {
      showHumanChoice(winner);
    } else {
      const {choice, die} = winner.getAIChoice();
      winner.applyChoice(choice, die);
      const verb = choice==='duplicate' ? `duplicated their D${die}` : `upgraded to D${winner.bestDie}`;
      log(`${winner.name} ${verb}.`, 'info');
      renderLeaderboard();
      checkWin(winner);
    }
  }, 1400);
}

// ───────────────────────────────────────────────────────────────
//  HUMAN CHOICE
// ───────────────────────────────────────────────────────────────
function showHumanChoice(winner) {
  const container = document.getElementById('choice-btns');
  container.innerHTML = '';

  const distinct = [...new Set(winner.selectedDice)];
  distinct.forEach(sides=>{
    const idx = DICE_SIDES.indexOf(sides);
    const canUp = idx < DICE_SIDES.length-1;
    const nextDie = canUp ? DICE_SIDES[idx+1] : null;

    // Duplicate
    const dup = document.createElement('button');
    dup.className = 'c-btn';
    dup.innerHTML = `
      <span class="c-btn-title">✦ Duplicate D${sides}</span>
      <span class="c-btn-sub">Add another D${sides} to your rack</span>`;
    dup.addEventListener('click', ()=> applyHumanChoice('duplicate', sides));
    container.appendChild(dup);

    // Upgrade
    if (canUp) {
      const up = document.createElement('button');
      up.className = 'c-btn';
      up.innerHTML = `
        <span class="c-btn-title">↑ D${sides} → D${nextDie}</span>
        <span class="c-btn-sub">Replace with more powerful die</span>`;
      up.addEventListener('click', ()=> applyHumanChoice('upgrade', sides));
      container.appendChild(up);
    }
  });

  hideAllPhases();
  show('phase-choice');
  G.phase = 'choice';
}

function applyHumanChoice(choice, die) {
  const winner = G.players[0];
  winner.applyChoice(choice, die);
  const verb = choice==='duplicate' ? `You duplicated your D${die}.` : `You upgraded to D${winner.bestDie}.`;
  log(verb, 'info');
  hideAllPhases();
  renderLeaderboard();
  checkWin(winner);
}

// ───────────────────────────────────────────────────────────────
//  ESCAPE OFFER — Broker whispers when player is outgunned
// ───────────────────────────────────────────────────────────────
function shouldOfferEscape() {
  if (G.round < 2) return false;
  if (G.escapeOffered) return false;
  const human = G.players[0];
  if (human.eliminated) return false;
  const rivals = G.players.filter(p => !p.isHuman && !p.eliminated);
  if (!rivals.length) return false;

  const humanPotential  = human.dice.reduce((s, d) => s + d, 0);
  const bestRivalPotential = Math.max(...rivals.map(p => p.dice.reduce((s, d) => s + d, 0)));
  // Offer if player can score at most 25% of what the best rival can
  return humanPotential > 0 && humanPotential < bestRivalPotential * 0.25;
}

function checkEscapeOffer() {
  if (!shouldOfferEscape()) return false;
  G.escapeOffered = true;
  hideAllPhases();
  show('phase-escape');
  G.phase = 'escape';
  log('☠ The Broker leans in and whispers an offer…', 'info');
  return true;
}

// ───────────────────────────────────────────────────────────────
//  WIN CHECK
// ───────────────────────────────────────────────────────────────
function checkWin(roundWinner) {
  const alive = G.players.filter(p=>!p.eliminated);
  if (alive.length === 1) { endGame(alive[0]); return; }
  if (G.players[0].eliminated) { endGame(null); return; }

  // AI won — auto-advance after a pause (unless escape offer fires)
  if (roundWinner && !roundWinner.isHuman) {
    G.phase = 'continue';
    setTimeout(()=>{
      hide('tray-result');
      show('tray-hint');
      hideAllPhases();
      if (checkEscapeOffer()) return;
      startRound();
    }, 2000);
  } else {
    if (checkEscapeOffer()) return;
    show('phase-continue');
    G.phase = 'continue';
  }
}

document.getElementById('continue-btn').addEventListener('click', ()=>{
  hide('tray-result');
  show('tray-hint');
  hideAllPhases();
  startRound();
});

document.getElementById('escape-walk').addEventListener('click', ()=>{
  const human = G.players[0];
  human.dice.forEach(d => G.pool.push(d));
  human.dice = [];
  human.eliminated = true;
  G.walkedAway = true;
  log('You push back from the table. Your dice remain as tribute to the Broker.', 'loss');
  endGame(null);
});

document.getElementById('escape-stay').addEventListener('click', ()=>{
  hideAllPhases();
  log('You stare down the Broker and spit. The bones are cast!', 'info');
  hide('tray-result');
  show('tray-hint');
  startRound();
});

// ───────────────────────────────────────────────────────────────
//  RENDER LEADERBOARD STRIP
// ───────────────────────────────────────────────────────────────
function renderLeaderboard(winner=null, active=null) {
  const strip = document.getElementById('leader-strip');
  strip.innerHTML = '';

  G.players.forEach(p=>{
    const card = document.createElement('div');
    card.className = `leader-card ${p.isHuman?'you-card':''} ${p.eliminated?'elim-card':''}`;

    const nameEl = document.createElement('div');
    nameEl.className = 'lc-name';
    nameEl.textContent = p.name + (p.isHuman ? ' (You)' : '');
    card.appendChild(nameEl);

    // Dice mini-chips
    const diceRow = document.createElement('div');
    diceRow.className = 'lc-dice';
    p.dice.slice(0,6).forEach(s=>{
      const chip = document.createElement('div');
      chip.className = 'lc-chip';
      chip.style.background = DIE_CSS[s];
      chip.textContent = `D${s}`;
      diceRow.appendChild(chip);
    });
    if (p.dice.length > 6) {
      const more = document.createElement('div');
      more.className = 'lc-chip';
      more.style.background = '#444';
      more.style.color = '#ccc';
      more.textContent = `+${p.dice.length-6}`;
      diceRow.appendChild(more);
    }
    card.appendChild(diceRow);

    // Score (if round just played)
    if (p.roundScore > 0 && G.phase !== 'select') {
      const sc = document.createElement('div');
      sc.className = 'lc-score';
      sc.textContent = p.roundScore.toLocaleString();
      card.appendChild(sc);
    }

    strip.appendChild(card);
  });
}

function flashLeaderboard(winner, losers) {
  const cards = document.querySelectorAll('.leader-card');
  cards.forEach((card, i) => {
    const p = G.players[i];
    if (!p) return;
    if (p === winner) card.classList.add('winner-card');
    else if (losers.includes(p)) card.classList.add('loser-card');
    setTimeout(()=> card.classList.remove('winner-card','loser-card'), 1800);
  });
}

// ───────────────────────────────────────────────────────────────
//  END GAME
// ───────────────────────────────────────────────────────────────
function endGame(winner) {
  G.phase = 'over';
  const winTarget = DIFF[G.difficulty].target;

  if (winner) {
    const hitScore = winner.roundScore >= winTarget;
    document.getElementById('win-icon').textContent = winner.isHuman ? '🏆' : '💀';
    document.getElementById('win-headline').textContent = winner.isHuman ? 'Victory!' : `${winner.name} Wins`;
    document.getElementById('win-headline').className = winner.isHuman ? 'win' : 'lose';
    document.getElementById('win-sub').textContent = winner.isHuman
      ? (hitScore
          ? (G.brokersDeal
              ? `Broker's Deal sealed — ${winner.roundScore} scored. The house is yours.`
              : `Lucky roll of ${winner.roundScore} — the bones favoured you.`)
          : 'Last one standing. The tavern is yours.')
      : (hitScore
          ? `${winner.name} rolled ${winner.roundScore} — hit the mark.`
          : `${winner.name} was the last rival standing.`);
  } else {
    document.getElementById('win-icon').textContent = '☠️';
    document.getElementById('win-headline').className = 'lose';
    if (G.walkedAway) {
      document.getElementById('win-headline').textContent = 'You Walked Away';
      document.getElementById('win-sub').textContent = 'A wise retreat. The Broker tips his hat and collects your bones.';
    } else {
      document.getElementById('win-headline').textContent = 'Eliminated';
      document.getElementById('win-sub').textContent = 'Your dice ran dry. The bones do not lie.';
    }
  }

  document.getElementById('win-stats').innerHTML =
    `<span>Round ${G.round}</span><span>·</span><span>${G.pool.length} dice in pool</span>`;

  if (winner?.isHuman && G.pool.length > 0) {
    const d = document.getElementById('pc-dice');
    d.innerHTML = G.pool.map(s=>`<div class="lc-chip" style="width:24px;height:24px;font-size:.55rem;border-radius:3px;background:${DIE_CSS[s]};color:#000;display:inline-flex;align-items:center;justify-content:center;font-family:'Cinzel',serif;font-weight:900;">D${s}</div>`).join('');
    show('pool-claim');
  } else {
    hide('pool-claim');
  }

  showScreen('win-screen');
  if (winner?.isHuman) diceShower();
}

function diceShower() {
  const shower = document.getElementById('win-shower');
  shower.innerHTML = '';
  let n = 0;
  const iv = setInterval(()=>{
    if (n++ >= 70) { clearInterval(iv); return; }
    const s = DICE_SIDES[Math.floor(Math.random()*DICE_SIDES.length)];
    const sz = 26+Math.random()*28;
    const dur = 2.5+Math.random()*3;
    const d = document.createElement('div');
    d.className = 'shower-die';
    d.style.cssText = `width:${sz}px;height:${sz}px;font-size:${sz*.25}px;background:${DIE_CSS[s]};left:${Math.random()*100}%;animation-duration:${dur}s;animation-delay:${Math.random()*.4}s;`;
    d.textContent = `D${s}`;
    shower.appendChild(d);
    setTimeout(()=>d.remove(), (dur+1)*1000);
  }, 90);
}

// ───────────────────────────────────────────────────────────────
//  WINDOW RESIZE
// ───────────────────────────────────────────────────────────────
window.addEventListener('resize', ()=>{
  DiceEngine.trayResize();
  document.querySelectorAll('.rack-die-canvas').forEach(c=> DiceEngine.resizeStatic(c));
});
