# Dungeon Break - Progress & Roadmap

*Last updated: 2026-02-21*

---

## ✅ Phase 1: The Great Pivot (Complete)

- **Click-to-Move Engine:** Raycasting against floor mesh, Walk (LMB) and Run (RMB) speeds, slope-aware, cliff/void prevention.
- **Atmospheric Polish:** Player floating diamond marker with pulsing SpotLight.
- **Code Cleanup:** All legacy Scoundrel card logic removed from `scoundrel-3d.js`.
- **D&D Foundation:** `dnd-mechanics.js` created with `DiceRoller`, `CombatResolver.resolveClash()`, and the Dulling Blade durability mechanic.

---

## ✅ Phase 2: First Contact (Complete)

### Wandering Enemies
Current roster (spawned randomly from `WANDERER_MODELS`):
- `skeleton-web.glb`
- `female_evil-web.glb`, `female_evil-true-web.glb`
- `male_evil-web.glb`, `male_evil-true-web.glb`
- `male-web.glb`, `female-web.glb`
- `ironjaw-web.glb`
- `Gwark-web.glb`, `SkeletalViking-web.glb`
- `a-sand-assassin-web.glb`, `a-sorcoress-web.glb`, `a-skeleton-king-web.glb`
- `gremlinn-web.glb` (compressed; was uncompressed, now in pool)
- `MagmaDog-web.glb` (new model)
- `Stolem-web.glb` (Stone Golem — compressed; old uncompressed `Stolem.glb` removed from pool)

**Boss-only (not in random pool):** `a-female_twin-web.glb`, `a_male_twin-web.glb` — reserved for final encounter.

- **Patrol AI:** Pick random point on `globalFloorMesh`, walk to it, repeat.
- **Cone of Vision:** 120° FOV, 4.0 unit range. Enemies chase player on sight, resume patrol on losing LOS.
- **Combat Trigger:** Distance < 1.2 units fires `startCombat()`.
- **Enemy Database:** `enemy-database.js` — named stat blocks per model type. `enemyDisplayName()` helper ensures proper names everywhere. Full roster: Skeleton, Skeletal Viking, Ironjaw, Bandit, Cultist, King, Queen, Sorceress, Assassin, F.Twin, M.Twin, Gwark, Gremlin, Stone Golem.
- **AI Throttle:** Patrol AI runs every 3rd frame; chase AI every frame for smooth movement. Dead wanderer mixers skipped entirely. Distant mixers (>20 units) tick every other frame.
- **Wanderer Y Lift:** `WANDERER_Y_LIFT = 0.08` — prevents feet clipping through floor mesh.
- **Void Safety:** Wanderers that fall below y < -3 are automatically removed from the scene.

### On-Map Turn-Based Combat
Combat happens in place on the main 3D map — no teleport, no Battle Island.

- Player and enemies stay in their world positions.
- `isCombatView = true` during combat; `inBattleIsland` is never set.
- Any wanderer within range can join an active fight (`startCombat` during `isCombatView` pushes to roster).
- **Combat Tracker UI:** Fixed panel (bottom-right) with per-enemy HP bars, color-coded glow, bleed indicators, and last 3 log messages at the bottom. Tracker rows are clickable for targeting (3rd fallback after raycaster + ray proximity).
- **Initiative Strip:** Shows turn order pills across the top of the tracker. Active actor pill is highlighted. Updated on every turn transition via `updateInitStrip(currentActor)`.
- **Multi-enemy combat:** `combatState.enemies[]` roster; each enemy takes a turn in sequence.
- **Targeting:** (1) Raycaster hit on mesh, (2) ray-to-point distance < 1.5 units, (3) click tracker row.

#### Player Actions (Combat Menu — 3×3 grid)
| Action | Status | Notes |
|---|---|---|
| Attack | ✅ | `resolveClash()` with 3D dice animations. Range check — throws rock if out of melee range. Flanking bonus (1.5×). |
| Skill | ✅ | Shows actual skill name. All 9 classes have unique combat skills. |
| Item | ✅ | Sub-menu shows hotbar as sprites. `commandUseItem` wires potions/consumables to mid-combat use. |
| Defend | ✅ | +4 AC stance for the enemy's turn. |
| Equip | ⬜ | Stubbed. |
| Analyze | ⬜ | Stubbed — planned to expand tracker row with enemy stats on click. |
| Wait | ✅ | Passes turn to enemy. |
| Flee | ✅ | Calls `exitBattleIsland()` (exits combat view, no teleport). |
| Tactics | ✅ | Sub-menu: Dash, Shove, Guts, Feint. |

#### Tactics Sub-Menu
| Action | Status | Notes |
|---|---|---|
| Dash | ✅ | Doubles movement, disables attack for the turn. |
| Shove | ✅ | STR clash — pushes enemy 1.5m on success. |
| Guts | ✅ | Charge up a burst strike. Stacks up to ×2. Always causes bleed + screen shake. |
| Feint | ✅ | DEX vs WIS clash — next attack gains flank bonus on success. |

#### Class Skills ✅ (all 9 classes implemented)
| Class | Skill | Notes |
|---|---|---|
| Knight | Power Strike | +3 power, STR-based clash. |
| Rogue | Cheap Shot | Doubled damage when target < 50% HP, DEX-based. |
| Occultist | Eldritch Blast | 1d8 magic damage, ignores armor. |
| Priest | Smite | 2 damage + 2 HP heal. |
| Paladin | Holy Bash | Weapon damage + 2 AP restore. |
| Bard | Distract | Throws rock in random direction; enemies investigate, then realise the trick. |
| Ranger | Snipe | Precision shot, 1.5× damage, crits on top 30% of die range. Must be at range (> 1.5 units). |
| Artificer | Flashbang | Blinds enemies within 5 units for 1 round. No targeting needed. |
| Necromancer | Siphon Life | 3-attack drain buff. Melee/Guts: heal 35% of damage dealt. Purple `✦ SIPHON LIFE ×N` badge. |

#### Bleed Mechanics ✅
- Edged weapons: crits always inflict bleed (2 dmg × 3 turns), regular hits 15% chance (1 dmg × 2 turns).
- Blunt weapons (hammer, mace): cannot cause bleed.
- Guts strike always inflicts bleed (3 dmg × 3 turns) regardless of weapon type.
- Bleed ticks at the start of the enemy's turn. Enemy can bleed out before acting.
- Combat tracker shows 🩸×N icon with turns remaining.

#### Screen Shake ✅
- Crits: `triggerShake(20, 30)`
- Guts strikes: `triggerShake(18, 25)`
- Boss hits, bonfire rumble, trap impacts: various intensities.

#### Corpse Loot ✅
- On death, enemy GLB hides and a bobbing `corpse.png` sprite spawns at death position (Y = deathPos.y + 1.5, fixed from floor-clipping bug).
- Player walks within 1.5 units after combat to auto-loot.
- Torch not full → adds fuel (scales with enemy STR). Torch full → converts to soul coins (1.5× rate).

#### Enemy AI
- Moves toward player if out of attack range (2.0 units).
- Attacks with `resolveClash()` — player takes damage on enemy win.
- **Guts AI:** 30% chance to charge Guts if far + healthy.
- **Flee AI:** Flees at <15% HP (disabled in True Dungeon). Removed from fight if >15 units away.

#### Combat End
- **Victory:** Enemy added to `slainStack` as trophy. Multi-enemy: continues until all dead or fled.
- **Death:** `gameOver()`.
- **Flee/End:** `exitBattleIsland()` — restores fog, clears tracker, strips emissive from survivors.

---

## ✅ Phase 3: Polish & Visual Systems (Complete)

### Skill Visual FX ✅
- `spawnGroundFlash(color, opts)` — DOM radial-gradient bloom at floor level.
- `spawnSkillFX(skillId)` — per-class texture particle combos.
- Each class has a distinct visual signature (knight = orange slash, priest = holy white bloom, necromancer = slow purple fade, flashbang = full-screen white, etc.)

### Ground Torch Glow ✅
- Two flat `PlaneGeometry` decals, `AdditiveBlending` — no dynamic lights.
- Colour shifts warm amber → red-orange as fuel depletes. Dual-frequency sine flicker.

### Torch Fuel System ✅
- Graduated bar colour: amber → orange → dark orange → red.
- No fuel burn during combat (turns are ~6 seconds).

### Azure Flame ✅
- Always present at room 0 (world origin 0,0). Never cleared.
- 3.0 unit trigger radius. Leave pushback: 3.5 units (prevents immediate re-trigger).
- **Grace timers:** `_azureFlameReadyAt` — 12 seconds after game start, 6 seconds after each floor entry. Prevents auto-trigger on spawn.
- Race condition fixed: if combat starts while modal is open, dismissing the flame no longer tears down combat state.
- Torch full during refuel → leaves prompt open (no double-refuel exploit).

### Player Jump Arc ✅
- `detectJumpGap()` checks movement path for floor gaps within reach.
- If gap ≤ `JUMP_MAX_GAP = 2.2` units and height diff ≤ 2.0, player launches a TWEEN arc instead of walking.
- `JUMP_ARC = 1.3` for normal models; `JUMP_ARC_WINGED = 2.2` for models in `WINGED_MODELS` list.
- `playerJumping` flag suppresses terrain Y-snap during the arc so the player doesn't snap to the ground mid-flight.

### Gallery Room ✅
- `GALLERY_MODELS` guarded: if the array is empty or undefined, falls back to `room_rect-web.glb` to prevent blank rooms.

### Performance ✅
- `torchLight.castShadow = false` — removing moving shadow-casting PointLight recovered ~40 FPS on R9 200.
- Stats.js (mrdoob) toggled via F2.
- Benchmark modal: tests potato/low/medium/high/ultra profiles, applies appropriate settings.
- LOD uses player distance (not camera distance) — fixes isometric camera making distant wanderers show placeholder boxes.
- Patrol AI throttled to every 3rd frame; chase AI every frame.
- Dead wanderer mixers skipped. Distant mixers (>20 units) at half rate.

### 3D Dice Numbers ✅
- `depthTest: false` + `renderOrder: 999` — numbers no longer buried inside dice geometry.
- 128×128 canvas, Arial font for crisp rendering at runtime.

### Bug Fixes ✅
- Enemy names: `enemyDisplayName()` — no filename leaking into UI.
- Options button: top-left.
- Minstrel sell bonus: `sellRate` = 0.65.
- Combat skill button shows actual skill name.
- Weapon button on map is context-sensitive: during combat opens combat menu instead of inventory.
- Hotbar asset value lookup now includes weapon type for correct pricing.
- Corpse sprite Y fixed (was spawning at floor level, now at `deathPos.y + 1.5`).

### Initiative System ✅
- `rollInitiative()` called at combat start — player rolls d20+DEX, each enemy rolls d20+floor(STR/2).
- Result determines turn order. Both rolls shown as 3D dice animations simultaneously.
- `showCombatTracker(enemies, initOrder)` accepts optional initiative order for the strip.
- `updateInitStrip(currentActor)` exported from `ui-manager.js` — highlights the active actor's pill each turn.

### DiceBroker Mini-Game ✅ (`assets/DiceBroker/`)
- Standalone mini-game: `index.html`, `game.js` (~1000 lines), `style.css`.
- Separate from the main game; lives in `assets/DiceBroker/`.

---

## 🎯 Phase 4: Content & Progression (Next Focus)

### High Priority
- [ ] **Analyze command** — Expand tracker row on click to show enemy HP/AC/STR.
- [ ] **Necromancer passive** — "Exact kills heal 1 HP" not yet wired.

### Medium Priority
- [ ] **Equip command** — Quick-swap gear during combat (1/battle).
- [ ] **Other class passives** — Priest waypoint heals, Paladin +AP on kills, Ranger waypoint reveal, Artificer consumable save chance.
- [ ] **Enemy-specific skills** — Boss enemies (twins) have unique movesets.
- [ ] **XP / Leveling** — Gain stat points on level-up.
- [ ] **Floor progression** — Boss encounter at end of each floor, staircase to next.

### Twin Boss Encounter
- Final encounter: both twins spawn simultaneously as a 2-enemy combat.
- Multi-enemy combat system already supports this natively.
- Each twin has independent HP, AI, and turn in the roster.
- Boss-specific skills planned (one tanky, one aggressive).

### Polish / Future
- [ ] **Sound effects** — Attack, hit, bleed, victory stings.
- [ ] **Height map** — Terrain elevation variation, new file, doesn't touch existing systems.
- [ ] **Asset compression** — Any remaining GLBs without `-web` suffix need compression pipeline.

### Distribution (Post-Completion)
- **Tauri** — Lightweight desktop wrapper (~3MB vs Electron's ~150MB). Uses OS native webview. Nearly zero porting effort since the game is already `index.html` + assets.
