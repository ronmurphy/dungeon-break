/**
 * minigames.js
 * Logic for Lockpicking and Potion Brewing minigames.
 */

import { game } from './game-state.js';
import { updateUI, logMsg, spawnFloatingText, addToBackpack } from './ui-manager.js';

// Dependencies injected from scoundrel-3d.js
let callbacks = {
    loadTexture: null,
    loadFXImage: null,
    enterRoom: null,
    closeCombat: null,
    takeDamage: null,
    gameOver: null,
    sinkAlchemy: null,
    saveGame: null,
    audio: null
};

export function initMinigames(cbs) {
    callbacks = { ...callbacks, ...cbs };
}

// --- LOCKPICK MINIGAME ---
let lockpickState = null;

export function startLockpickGame(room) {
    let modal = document.getElementById('lockpickUI');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'lockpickUI';
        modal.innerHTML = `
            <h2 style="font-family:'Cinzel'; color:var(--gold); margin-bottom:10px;">Mechanism Locked</h2>
            <div style="margin-bottom:10px; color:#aaa; font-size:0.9rem;">Guide the light to the receiver. Click to place mirrors.</div>
            <canvas id="lockpickCanvas" width="480" height="480"></canvas>
            <div class="btn-group" style="margin-top:20px;">
                <button class="v2-btn" onclick="window.blastLock()">Blast Lock (-5 HP)</button>
                <button class="v2-btn" onclick="window.cancelLockpick()">Leave</button>
            </div>
        `;
        document.body.appendChild(modal);
    }
    modal.style.display = 'flex';

    // Initialize Puzzle
    const size = 6;
    const grid = [];
    for (let y = 0; y < size; y++) {
        const row = [];
        for (let x = 0; x < size; x++) row.push(0);
        grid.push(row);
    }

    // --- LOGIC PUZZLE GENERATOR (Guaranteed Solvable) ---
    const edges = [];
    for (let i = 0; i < size; i++) {
        edges.push({ x: i, y: -1, dir: { x: 0, y: 1 } }); // Top
        edges.push({ x: i, y: size, dir: { x: 0, y: -1 } }); // Bottom
        edges.push({ x: -1, y: i, dir: { x: 1, y: 0 } }); // Left
        edges.push({ x: size, y: i, dir: { x: -1, y: 0 } }); // Right
    }

    const start = edges[Math.floor(Math.random() * edges.length)];
    let curr = { x: start.x + start.dir.x, y: start.y + start.dir.y };
    let dir = { ...start.dir };

    const pathCells = new Set();
    let end = null;
    let steps = 0;

    // Walk a path
    while (steps < 30) {
        if (curr.x < 0 || curr.x >= size || curr.y < 0 || curr.y >= size) {
            if (steps > 2) {
                // Found an exit. Calculate direction pointing back to grid for the receiver.
                end = { x: curr.x, y: curr.y, dir: { x: -dir.x, y: -dir.y } };
                break;
            } else {
                // Retry
                curr = { x: start.x + start.dir.x, y: start.y + start.dir.y };
                dir = { ...start.dir };
                pathCells.clear();
                steps = 0;
                continue;
            }
        }
        pathCells.add(`${curr.x},${curr.y}`);
        if (Math.random() < 0.3) {
            const turn = Math.random() < 0.5 ? 1 : -1;
            if (turn === 1) dir = { x: -dir.y, y: dir.x };
            else dir = { x: dir.y, y: -dir.x };
        }
        curr.x += dir.x;
        curr.y += dir.y;
        steps++;
    }

    if (!end) {
        end = {
            x: start.x + start.dir.x * (size + 1),
            y: start.y + start.dir.y * (size + 1),
            dir: { x: -start.dir.x, y: -start.dir.y }
        };
    }

    // Place Walls
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            // Only place walls if NOT on the guaranteed path
            if (!pathCells.has(`${x},${y}`) && Math.random() < 0.20) grid[y][x] = 1;
        }
    }

    lockpickState = {
        room: room,
        grid: grid,
        size: size,
        start: start,
        end: end,
        active: true
    };

    const canvas = document.getElementById('lockpickCanvas');
    canvas.onclick = (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / (canvas.width / size));
        const y = Math.floor((e.clientY - rect.top) / (canvas.height / size));
        handleLockpickClick(x, y);
    };

    renderLockpickGame();
}
window.startLockpickGame = startLockpickGame;

function handleLockpickClick(x, y) {
    if (!lockpickState || !lockpickState.active) return;
    const { grid, size, start, end } = lockpickState;
    if (x < 0 || x >= size || y < 0 || y >= size) return;

    // Prevent clicking on Start/End tiles (Emitter/Receiver)
    const sx = start.x + start.dir.x;
    const sy = start.y + start.dir.y;
    const ex = end.x + end.dir.x;
    const ey = end.y + end.dir.y;

    if ((x === sx && y === sy) || (x === ex && y === ey)) return;

    const cell = grid[y][x];
    if (cell === 1) return; // Wall

    // Cycle: Empty -> / -> \ -> Empty
    if (cell === 0) grid[y][x] = 2;
    else if (cell === 2) grid[y][x] = 3;
    else grid[y][x] = 0;

    renderLockpickGame();
}

function renderLockpickGame() {
    if (!lockpickState) return;
    const canvas = document.getElementById('lockpickCanvas');
    const ctx = canvas.getContext('2d');
    const { grid, size, start, end } = lockpickState;
    const cellSize = canvas.width / size;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Grid
    const blockTex = callbacks.loadTexture('assets/images/block.png').image; // Use raw image
    const itemsTex = callbacks.loadTexture('assets/images/items.png').image;
    const bgTileX = 6 * 128; // Sprite #6
    const wallTileX = 3 * 128; // Sprite #3

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            // Draw Background
            if (blockTex && blockTex.complete) {
                ctx.drawImage(blockTex, bgTileX, 0, 128, 128, x * cellSize, y * cellSize, cellSize, cellSize);
            } else {
                ctx.fillStyle = '#222';
                ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
                ctx.strokeStyle = '#444';
                ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
            }

            const cell = grid[y][x];
            const cx = x * cellSize + cellSize / 2;
            const cy = y * cellSize + cellSize / 2;

            if (cell === 1) { // Wall
                if (blockTex && blockTex.complete) ctx.drawImage(blockTex, wallTileX, 0, 128, 128, x * cellSize, y * cellSize, cellSize, cellSize);
                else { ctx.fillStyle = '#555'; ctx.fillRect(x * cellSize + 4, y * cellSize + 4, cellSize - 8, cellSize - 8); }
            } else if (cell === 2) { // Mirror /
                ctx.strokeStyle = '#00ffff';
                ctx.lineWidth = 4;
                ctx.beginPath(); ctx.moveTo(x * cellSize + 10, y * cellSize + cellSize - 10); ctx.lineTo(x * cellSize + cellSize - 10, y * cellSize + 10); ctx.stroke();
            } else if (cell === 3) { // Mirror \
                ctx.strokeStyle = '#00ffff';
                ctx.lineWidth = 4;
                ctx.beginPath(); ctx.moveTo(x * cellSize + 10, y * cellSize + 10); ctx.lineTo(x * cellSize + cellSize - 10, y * cellSize + cellSize - 10); ctx.stroke();
            }
        }
    }

    // Draw Emitter/Receiver (On top of beam)
    const drawPort = (pt, spriteIdx, color) => {
        const gx = pt.x + pt.dir.x; const gy = pt.y + pt.dir.y; // Draw in adjacent valid cell
        const px = gx * cellSize; const py = gy * cellSize;
        if (itemsTex && itemsTex.complete) ctx.drawImage(itemsTex, spriteIdx * 128, 0, 128, 128, px, py, cellSize, cellSize);
        else { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(px + cellSize / 2, py + cellSize / 2, cellSize / 3, 0, Math.PI * 2); ctx.fill(); }
    };

    drawPort(start, 2, '#00ff00'); // Lantern
    drawPort(end, 6, '#ff0000');   // Mirror

    // Raycast Beam
    ctx.strokeStyle = '#ccffcc';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00ff00';

    let curr = { x: start.x + start.dir.x, y: start.y + start.dir.y };
    let dir = { ...start.dir };
    let path = [{ x: (start.x + 0.5) * cellSize, y: (start.y + 0.5) * cellSize }];

    // Calculate Receiver Tile (Inside Grid)
    const rx = end.x + end.dir.x;
    const ry = end.y + end.dir.y;

    let steps = 0;
    let won = false;

    while (steps < 100) {
        // Check Win (Hit Receiver Tile)
        if (curr.x === rx && curr.y === ry) {
            won = true;
            path.push({ x: (curr.x + 0.5) * cellSize, y: (curr.y + 0.5) * cellSize });
            break;
        }
        if (curr.x < 0 || curr.x >= size || curr.y < 0 || curr.y >= size) {
            path.push({ x: (curr.x + 0.5) * cellSize, y: (curr.y + 0.5) * cellSize }); // Off screen
            break;
        }

        path.push({ x: (curr.x + 0.5) * cellSize, y: (curr.y + 0.5) * cellSize });

        const cell = grid[curr.y][curr.x];
        if (cell === 1) break; // Hit wall
        if (cell === 2) { // / Mirror
            // (1,0) -> (0,-1) | (-1,0) -> (0,1) | (0,1) -> (-1,0) | (0,-1) -> (1,0)
            const oldDir = { ...dir };
            dir.x = -oldDir.y;
            dir.y = -oldDir.x;
        } else if (cell === 3) { // \ Mirror
            const oldDir = { ...dir };
            dir.x = oldDir.y;
            dir.y = oldDir.x;
        }

        curr.x += dir.x;
        curr.y += dir.y;
        steps++;
    }

    // Draw Beam
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
    ctx.stroke();
    ctx.shadowBlur = 0;

    if (won) {
        lockpickState.active = false;
        setTimeout(() => {
            document.getElementById('lockpickUI').style.display = 'none';
            logMsg("Mechanism unlocked!");
            lockpickState.room.isLocked = false;
            callbacks.enterRoom(lockpickState.room.id);
        }, 500);
    }
}

window.cancelLockpick = function () {
    document.getElementById('lockpickUI').style.display = 'none';
    callbacks.closeCombat(); // Reset state
};

window.blastLock = function () {
    // Check for Bomb Item
    const bombIdx = game.hotbar.findIndex(i => i && i.type === 'item' && i.id === 0);
    if (bombIdx !== -1) {
        game.hotbar[bombIdx] = null;
        logMsg("Used Bomb to blast the lock! (5 Damage taken)");
    } else {
        logMsg("Smashed the lock mechanism! (5 Damage taken)");
    }
    callbacks.takeDamage(5);
    updateUI();

    if (game.hp > 0) {
        document.getElementById('lockpickUI').style.display = 'none';
        lockpickState.room.isLocked = false;
        callbacks.enterRoom(lockpickState.room.id);
    } else {
        callbacks.gameOver();
    }
};

// --- POTION MINIGAME ---
let potionState = null;
const potionImages = { bottle: new Image(), mask: new Image(), buffer: document.createElement('canvas') };
potionImages.bottle.src = 'assets/images/minigames/potion_bottle_base.png';
potionImages.mask.src = 'assets/images/minigames/potion_bottle_mask.png';

export function startPotionGame(room) {
    let modal = document.getElementById('potionUI');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'potionUI';
        modal.className = 'modal-overlay';
        modal.style.display = 'none';
        modal.style.flexDirection = 'column';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.zIndex = '7000';
        document.body.appendChild(modal);
    }

    // Generate Target Color
    const targets = [
        { name: "Crimson Vitality", r: 200, g: 20, b: 20 },
        { name: "Azure Intellect", r: 20, g: 50, b: 220 },
        { name: "Golden Greed", r: 220, g: 200, b: 20 },
        { name: "Void Essence", r: 80, g: 0, b: 120 },
        { name: "Emerald Toxin", r: 40, g: 180, b: 40 },
        { name: "Liquid Starlight", r: 200, g: 255, b: 255 },
        { name: "Obsidian Oil", r: 40, g: 40, b: 45 },
        { name: "Amber Sap", r: 255, g: 140, b: 0 },
        { name: "Royal Blood", r: 120, g: 0, b: 60 },
        { name: "Ghost Mist", r: 180, g: 220, b: 230 }
    ];
    const target = targets[Math.floor(Math.random() * targets.length)];

    potionState = {
        room: room,
        target: target,
        current: { r: 150, g: 150, b: 180, vol: 15 }, // Start with water base (Lower volume = easier)
        active: true
    };

    // Vial Buttons Data
    const vials = [
        { color: 'Red', r: 255, g: 0, b: 0, hex: '#ff0000', img: 'vial_red.png' },
        { color: 'Green', r: 0, g: 255, b: 0, hex: '#00ff00', img: 'vial_green.png' },
        { color: 'Blue', r: 0, g: 0, b: 255, hex: '#0000ff', img: 'vial_blue.png' },
        { color: 'White', r: 255, g: 255, b: 255, hex: '#ffffff', img: 'vial_white.png' },
        { color: 'Black', r: 0, g: 0, b: 0, hex: '#111111', img: 'vial_black.png' }
    ];

    const vialHtml = vials.map(v => `
        <div onclick="window.mixPotion(${v.r}, ${v.g}, ${v.b})" style="cursor:pointer; transition: transform 0.1s; display:flex; flex-direction:column; align-items:center;" onmousedown="this.style.transform='scale(0.9)'" onmouseup="this.style.transform='scale(1)'">
            <div style="width:40px; height:60px; background:${v.hex}; border:2px solid #aaa; border-radius:0 0 15px 15px; position:relative; box-shadow:inset 0 0 10px rgba(0,0,0,0.5);">
                <div style="position:absolute; top:-5px; left:10px; width:16px; height:10px; background:#888; border:1px solid #fff;"></div>
                <!-- Fallback to CSS shape, but use img if available -->
                <img src="assets/images/minigames/${v.img}" style="position:absolute; top:-5px; left:-2px; width:40px; height:65px; display:none;" onload="this.style.display='block'; this.parentElement.style.background='transparent'; this.parentElement.style.border='none'; this.parentElement.style.boxShadow='none';">
            </div>
            <div style="font-size:10px; color:#aaa; margin-top:4px;">${v.color}</div>
        </div>
    `).join('');

    modal.innerHTML = `
        <div style="background:rgba(10,10,10,0.95); border:2px solid var(--gold); padding:20px; width:500px; max-width:90%; text-align:center; color:#fff; font-family:'Cinzel'; position:relative; display:flex; flex-direction:column; gap:15px; box-shadow: 0 0 50px rgba(0,0,0,0.8);">
            <h2 style="color:var(--gold); margin:0;">ALCHEMY STATION</h2>
            <div style="font-size:1.0rem; color:#aaa;">Brew: <span style="color:#fff; font-weight:bold;">${target.name}</span></div>
            
            <div style="display:flex; justify-content:center; gap:30px; align-items:flex-start;">
                <!-- Bottle Canvas -->
                <div style="display:flex; flex-direction:column; align-items:center; gap:5px;">
                    <div style="position:relative; width:154px; height:269px;">
                        <canvas id="potionCanvas" width="154" height="269"></canvas>
                    </div>
                </div>
                
                <!-- Resonance Meter (Closeness) -->
                <div style="display:flex; flex-direction:column; align-items:center; gap:5px; height:269px; justify-content:center;">
                    <div style="font-size:0.8rem; color:#d4af37; writing-mode: vertical-rl; text-orientation: mixed;">RESONANCE</div>
                    <div style="width:20px; height:200px; border:2px solid #444; background:#111; position:relative; border-radius:4px; overflow:hidden;">
                        <div id="potionMeterFill" style="position:absolute; bottom:0; left:0; width:100%; height:0%; background:linear-gradient(to top, #550000, #ffaa00, #00ff00); transition:height 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);"></div>
                        <div style="position:absolute; top:15%; left:0; width:100%; height:2px; background:rgba(255,255,255,0.3);"></div> <!-- Target Line -->
                    </div>
                </div>
            </div>

            <!-- Controls -->
            <div style="display:flex; justify-content:center; gap:15px; margin-top:10px; align-items:flex-end;">
                ${vialHtml}
                <button class="v2-btn" onclick="window.resetPotion()" style="background:#444; color:#fff; padding:10px; width:60px; height:40px; font-size:0.8rem; border:1px solid #666;">Dump</button>
            </div>
            
            <div style="display:flex; gap:10px; margin-top:10px;">
                <button class="v2-btn" onclick="window.checkPotion()" style="flex:1; background:var(--gold); color:#000;">BREW</button>
                <button class="v2-btn" onclick="window.closePotionGame()" style="flex:1; background:#444;">Leave</button>
            </div>
            
            <div id="potionFeedback" style="height:20px; font-size:0.9rem; color:#ffaa00;"></div>
        </div>
    `;

    modal.style.display = 'flex';
    renderPotionCanvas();
    updatePotionUI();
}
window.startPotionGame = startPotionGame;

window.mixPotion = function (r, g, b) {
    if (!potionState || !potionState.active) return;
    const cur = potionState.current;
    const addVol = 20;
    // Weighted Average Mixing
    cur.r = (cur.r * cur.vol + r * addVol) / (cur.vol + addVol);
    cur.g = (cur.g * cur.vol + g * addVol) / (cur.vol + addVol);
    cur.b = (cur.b * cur.vol + b * addVol) / (cur.vol + addVol);
    cur.vol += addVol;
    renderPotionCanvas();
    updatePotionUI();

    // Play Sound
    if (callbacks.audio && callbacks.audio.initialized) callbacks.audio.play('potion_pour', { volume: 0.5, rate: 0.9 + Math.random() * 0.2 });
};

window.resetPotion = function () {
    if (!potionState) return;
    potionState.current = { r: 150, g: 150, b: 180, vol: 15 }; // Reset to base
    renderPotionCanvas();
    updatePotionUI();
    document.getElementById('potionFeedback').innerText = "Mixture reset.";
    document.getElementById('potionFeedback').style.color = "#aaa";
};

window.updatePotionUI = function () {
    const meter = document.getElementById('potionMeterFill');
    if (!meter || !potionState) return;
    const c = potionState.current;
    const t = potionState.target;

    // Calculate Euclidean distance in RGB space
    const dist = Math.sqrt(Math.pow(c.r - t.r, 2) + Math.pow(c.g - t.g, 2) + Math.pow(c.b - t.b, 2));

    // Max possible distance is ~442 (distance between black and white)
    // We want the meter to be full (100%) when dist is 0, and empty (0%) when dist > 200
    // This makes the meter sensitive only when you are getting somewhat close
    const maxRange = 200;
    const pct = Math.max(0, Math.min(100, 100 * (1 - (dist / maxRange))));

    meter.style.height = `${pct}%`;

    // Color shift based on closeness
    if (pct > 85) meter.style.background = '#00ff00'; // Green (Good)
    else if (pct > 50) meter.style.background = '#ffaa00'; // Orange (Okay)
    else meter.style.background = '#550000'; // Red (Bad)
};

window.checkPotion = function () {
    if (!potionState) return;
    const cur = potionState.current;
    const tgt = potionState.target;
    const dist = Math.sqrt(Math.pow(cur.r - tgt.r, 2) + Math.pow(cur.g - tgt.g, 2) + Math.pow(cur.b - tgt.b, 2));
    const feedback = document.getElementById('potionFeedback');

    if (dist < 40) {
        feedback.innerText = "Perfect Match!";
        feedback.style.color = "#00ff00";
        setTimeout(() => {
            // Save refs before closePotionGame nulls potionState
            const brewedName = potionState.target.name;
            const brewedRoom = potionState.room;
            window.closePotionGame();

            // Reward Logic
            const potionItem = { type: 'potion', val: 20, name: brewedName, suit: '♥', desc: "A perfectly brewed masterwork potion." };

            if (addToBackpack(potionItem)) {
                spawnFloatingText("Potion Brewed!", window.innerWidth / 2, window.innerHeight / 2, '#00ff00');
                logMsg(`Brewed ${potionItem.name}. Added to backpack.`);
            } else {
                game.hp = game.maxHp; // Full heal if inventory full
                spawnFloatingText("Fully Healed!", window.innerWidth / 2, window.innerHeight / 2, '#00ff00');
                logMsg(`Brewed ${potionItem.name}. Inventory full, drank immediately.`);
            }

            if (brewedRoom) {
                // Decrement use counter (backwards compat: undefined → treat as 1 remaining)
                if (typeof brewedRoom.potionUsesLeft !== 'number') brewedRoom.potionUsesLeft = 1;
                else brewedRoom.potionUsesLeft--;

                if (brewedRoom.potionUsesLeft <= 0) {
                    brewedRoom.state = 'cleared';
                    if (callbacks.sinkAlchemy) callbacks.sinkAlchemy(brewedRoom);
                } else {
                    logMsg(`The altar still shimmers... (${brewedRoom.potionUsesLeft} brew remaining)`);
                    if (callbacks.saveGame) callbacks.saveGame();
                }
                updateUI();
            }
        }, 1000);
    } else {
        feedback.innerText = "The mixture is unstable... (Too far)";
        feedback.style.color = "#ff0000";
    }
};

window.closePotionGame = function () {
    const modal = document.getElementById('potionUI');
    if (modal) modal.style.display = 'none';
    potionState = null;
    callbacks.closeCombat(); // Clear combatModal backdrop that was shown by the dungeon prompt
};

function renderPotionCanvas() {
    if (!potionState) return;
    const canvas = document.getElementById('potionCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { r, g, b } = potionState.current;

    // Ensure buffer matches size
    if (potionImages.buffer.width !== canvas.width || potionImages.buffer.height !== canvas.height) {
        potionImages.buffer.width = canvas.width;
        potionImages.buffer.height = canvas.height;
    }
    const bCtx = potionImages.buffer.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    bCtx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw Bottle Base (Background)
    if (potionImages.bottle.complete && potionImages.bottle.naturalWidth > 0) {
        ctx.drawImage(potionImages.bottle, 0, 0, canvas.width, canvas.height);
    }

    // 2. Create Colored Liquid Shape in Buffer
    if (potionImages.mask.complete && potionImages.mask.naturalWidth > 0) {
        bCtx.drawImage(potionImages.mask, 0, 0, canvas.width, canvas.height);
        bCtx.globalCompositeOperation = 'source-in';
        bCtx.fillStyle = `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
        bCtx.fillRect(0, 0, canvas.width, canvas.height);
        bCtx.globalCompositeOperation = 'source-over';
    } else {
        // Fallback
        bCtx.fillStyle = `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
        bCtx.beginPath(); bCtx.arc(canvas.width / 2, canvas.height * 0.6, canvas.width * 0.3, 0, Math.PI * 2); bCtx.fill();
    }

    // 3. Tint Overlay (Draw Color ON TOP of Bottle)
    ctx.globalCompositeOperation = 'hard-light'; // Tints the opaque bottle
    ctx.globalCompositeOperation = 'overlay'; // Tints the opaque bottle while keeping highlights
    ctx.drawImage(potionImages.buffer, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
}