# Dungeon Break - Progress & Roadmap

*Last updated: 2026-02-21 (session 3)*

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
- On death, enemy GLB hides and a bobbing `corpse.png` sprite spawns at death position (`Y = deathPos.y + 0.5` — lowered from 1.5 which made pickup nearly impossible).
- Player walks within 1.5 units after combat to auto-loot.
- **Item drops:** `rollEnemyLoot(str)` — 20–75% drop chance (scales with STR + LCK). 45% potion / 35% weapon / 20% item. Item added to backpack; consolation soul coins if full.
- **Soul coins:** `soulcoin.png` (128×128, 25-frame animation) spawns as a separate map sprite near the corpse. Must be walked over to collect. Cycles at 80ms/frame.
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

#### Luck Stat Integration ✅
- `floor(LCK/2)` added as a flat bonus to: player initiative rolls, all player-side `resolveClash()` to-hit totals (not damage), and enemy loot drop chance (`LCK × 0.025` per point).
- Enemy attacks do NOT receive a luck bonus.

### Initiative System ✅
- `rollInitiative()` called at combat start — player rolls d20+DEX, each enemy rolls d20+floor(STR/2).
- Result determines turn order. Both rolls shown as 3D dice animations simultaneously.
- `showCombatTracker(enemies, initOrder)` accepts optional initiative order for the strip.
- `updateInitStrip(currentActor)` exported from `ui-manager.js` — highlights the active actor's pill each turn.

### Themed Tile Sheets ✅
- Each dungeon theme now has a dedicated sprite sheet (`grass.png` for Dirt/Moss, `mountains.png` for Stone/Ancient/Magma/Ice). Themes without a sheet fall back to `block.png`.
- All 9 cells in a themed sheet are freely randomised (all tiles are in-theme, no column-bleeding).
- `dungeon-generator.js`: `sheet` property added to THEMES array; `hasThemedSheet` flag controls tile index logic.

### Interactive Marker Rooms ✅
- **Potion Altar (isAlchemy):** 2-use system. `potionUsesLeft: 2` set at dungeon gen. Each successful brew decrements the counter. On second brew: `sinkAlchemy()` fires (purple dirt particles, 3s TWEEN sink, `isVanished = true`, `saveGame()`). After first brew: logs "altar still shimmers… (1 brew remaining)" and saves without clearing state so player can return.
- **Manor (isSpecial):** Already sinks immediately on any transaction (gift/buy). `sinkManor()` sets `isVanished = true` + saves. Leaving without interacting pushes player out, no sink.
- **Sink animations:** Both use `dirt_01.png` particles (`0x7a5230` earth brown, `AdditiveBlending`), spread low to ground (y 0–0.4), continuous kick-up over full 3-second sink.
- **`isVanished` guard:** Room mesh generation skips vanished rooms on reload — they never re-spawn.
- **Ground activation rings:** `circle_04.png` flat decal (`PlaneGeometry`, `y = 0.12`, `AdditiveBlending`, `opacity 0.7`) placed under all interactive markers: Alchemy, Manor, Trap, Locked, Bonfire, Shrine, Azure Flame. Rings tracked in `markerRings` Map; cleared on floor transition and removed when a room sinks.

### Bug Fixes (Session 2) ✅
- **Potion overlay persisting:** `closePotionGame()` now calls `closeCombat()` to clear the `combatModal` backdrop.
- **TypeError in checkPotion success:** `brewedName` and `brewedRoom` saved before `closePotionGame()` nulls `potionState`.
- **Azure Flame clicks passing through:** `on3DClick` guard extended to `|| event.target.closest('#trapUI')`.
- **Wanderer freezes mid-marker-prompt:** Marker proximity trigger now checks `beingChased = wanderers.some(w => w.state === 'chase')` — all marker room triggers are suppressed while any wanderer is actively chasing the player.

### DiceBroker Mini-Game ✅ (`assets/DiceBroker/`)
- Standalone mini-game: `index.html`, `game.js` (~1000 lines), `style.css`.
- Separate from the main game; lives in `assets/DiceBroker/`.

---

## 🎯 Phase 4: Content & Progression (Next Focus)

### High Priority — Boss Arena System ✅ (largely complete, bugs below)
- [x] **Boss arena:** Azure-Flame-style proximity trigger on `isFinal` room (not room-entry — boss room is a 3D GLB model). Confirmation modal "ENTER THE LAIR / Not Yet". 8-second dismiss cooldown. `enterBossArena()` teleports to Battle Island.
- [x] **Boss enemy:** `spawnBossWanderer(floor, cb)` — 35% chance demoness-web.glb, else random from pool. Scaled stats: `hp=30+floor×8, ac=2+floor, str=3+floor`. Random name from `BOSS_PREFIXES × BOSS_TYPES` (e.g. "Ironborn Sovereign", "Rotbound Keeper"). Boss appears larger + tinted red (existing Three.js instance color system).
- [x] **Demoness boss:** Ranged spellcaster. `isRanged:true` → `attackRange=8.0`. Fires `magic_02.png` projectile via `spawn3DSpell()`. `MODEL_ANIM_OVERRIDES` uses `swim idle` as walk, `mage_soell_cast` as attack.
- [x] **Arena walls:** Replaced 4-box square walls with single `CylinderGeometry` (radius=halfSize+2, 48 segments, `THREE.BackSide`) — no corner gaps on organic CA island. Boss and helpers cannot flee (`!enemy.isBoss && !enemy.isHelper && !inBattleIsland` guard).
- [x] **Boss helper minions — 3 battle plans (The Council, The Phalanx, The Fortress):** `spawnHelperWanderer()` loads helpers async, `finalize()` called when all are ready. Helpers tagged `isHelper/isBulwark/isFanatic/isArchitect`.
  - **Bulwark** (ironjaw / SkeletalViking): high HP/AC. While alive → +2 STR to boss attack (`executeEnemyAttack` check).
  - **Fanatic** (male_evil / male_evil-true): high STR aggressive attacker.
  - **Architect** (a-sorcoress): On its turn, heals boss 2+1d4 instead of attacking.
- [x] **Victory condition:** All enemies (boss + helpers) must die. `bossVictory()` fires only when `aliveEnemies.length === 0`.
- [x] **Cleanup on victory:** `removeCombatTracker()` + `hideCombatMenu()` called. Corpses, soul coins, loot sprites all removed from scene before intermission.
- [x] **Kill count persistence:** `game.floorKills` saved; `initWanderers` subtracts it on reload. Helpers don't increment it (`!target.isHelper` guard).
- [x] **Enemy counter HUD:** `#enemyCounter` div under gear button shows live `wanderers.length`.
- [x] **Intermission shop:** Fixed pointer-events (was `none` from combat passthrough). Card layout changed from `display:contents` on enemyArea to proper 2×2 grid on `itemsContainer`. Shop cards fully clickable.
- [x] **Soul broker cards:** After `showCombat()`, pointer-events explicitly reset to `auto` on modal + enemyArea.
- [ ] **Victory → Double Helix:** Beat boss → unlock Double Helix spiral. Not yet built.
- [ ] **Old card-based boss system removal:** `startBossFight()`, `startSoulBrokerEncounter()`, `pickCard()`, `finishRoom()`, `game.deck/combatCards/carryCard`, `createDeck()` — clean removal once new system confirmed working.

### 🐛 Known Bugs — Boss Arena (fix next session)
- **Helpers never attack (CRITICAL):** The Council / Phalanx / Fortress helpers load and animate in place but never move toward the player or take their turn in combat. They are pushed to `wanderers[]` and `combatState.enemies[]` but their turns in the initiative order appear to be skipped or the AI doesn't move them. Likely cause: `startCombat()` builds `combatState.enemies[]` from only the primary target at call time — helpers pushed after `startCombat()` are in `wanderers` but may not be in `combatState.enemies`. Fix: push helpers into `combatState.enemies` in the `finalize()` callback, or re-run `rollInitiative()` after all helpers are registered. Also check `startEnemyTurn()` picks from `combatState.enemies`, not `wanderers`.

### High Priority — Double Helix Progression
- [ ] **Helix as physical traversal zone:** After beating the floor boss, the Double Helix spiral opens. Player physically runs up it in 3D — not a loading screen.
- [ ] **Enemies on the helix:** Wanderers from the floor below patrol/chase on the spiral path.
- [ ] **Offshoot side-quest rooms:** Optional branches off the main spiral (magic rope, bent metal corridor, etc.) with item/coin rewards.
- [ ] **Top doorway:** Reuse existing doorway GLB. Proximity triggers "Go to next floor? Yes / No." Yes = new floor loads (harder theme, harder enemies). No = player can go back down the helix.
- [ ] **No floor backtracking:** Once a floor is left, it is locked. Save tracks which floors are behind you.
- [ ] **Mandatory boss per floor:** Must beat the floor boss to unlock the helix segment to the next floor.

### Medium Priority
- [ ] **Analyze command** — Expand tracker row on click to show enemy HP/AC/STR.
- [ ] **Necromancer passive** — "Exact kills heal 1 HP" not yet wired.
- [ ] **Equip command** — Quick-swap gear during combat (1/battle).
- [ ] **Other class passives** — Priest waypoint heals, Paladin +AP on kills, Ranger waypoint reveal, Artificer consumable save chance.
- [ ] **XP / Leveling** — Gain stat points on level-up.
- [ ] **Three-slot save system** — Save game seed so floor layout is consistent on reload. Three save slots.

### Twin Boss Encounter (Deferred — post-helix)
- Final encounter: both twins spawn simultaneously as a 2-enemy combat.
- Multi-enemy combat system already supports this natively.
- Soul Broker (floor 9) placement TBD within new helix/boss structure.

### Polish / Future
- [ ] **Sound effects** — Attack, hit, bleed, victory stings.
- [ ] **Height map** — Terrain elevation variation, new file, doesn't touch existing systems.
- [ ] **Asset compression** — Any remaining GLBs without `-web` suffix need compression pipeline.
- [ ] **Tauri desktop wrapper** — Post-completion packaging (~3MB vs Electron's ~150MB).

### Weapon Sprite Sheet Reference (`weapons_final.png` — 20 cells, 128×128)
Cell index = `val - 2` for deck weapons (val 2–11 = cells 0–9). Cells 10–19 are the new additions.

| Cell | Val | Name | Type | Notes |
|---|---|---|---|---|
| 0 | 2 | Knife | Edged | |
| 1 | 3 | Club | Blunt | Cannot cause bleed. |
| 2 | 4 | Dagger | Edged | |
| 3 | 5 | Mace | Blunt | Cannot cause bleed. |
| 4 | 6 | Scimitar | Edged | |
| 5 | 7 | Long Sword | Edged | |
| 6 | 8 | War Hammer | Blunt | Cannot cause bleed. |
| 7 | 9 | Battle Axe | Edged | |
| 8 | 10 | Halberd | Edged | |
| 9 | 11 | Great Sword | Edged | |
| 10 | 12 | War Scythe | Edged | Long-handled pitted steel blade, skull & vine engravings. |
| 11 | 13 | Flail | Blunt | Heavy spiked iron ball on rusted chain, hooded-figure pommel. |
| 12 | 14 | Rapier | Edged | Slender needle-blade, blackened silver thorn-and-rose hilt. |
| 13 | 15 | Polearm | Edged | Ornate axe head + rune-etched spear point. |
| 14 | 16 | Morningstar | Blunt | Star-shaped iron head, jagged spikes, gnarled wooden handle. |
| 15 | 17 | Heavy Crossbow | Ranged | Dark wood & steel, skeletal and gargoyle motifs. |
| 16 | 18 | War Pick | Edged | Armor-piercing curved point + heavy hammer face. |
| 17 | 19 | Claymore | Edged | Massive greatsword, bat-wing crossguards, garnet pommel. |
| 18 | 20 | Ritual Sickles | Edged | Paired serrated bone-handled sickles with glowing ancient runes. |
| 19 | 21 | Spear | Edged | Leaf-shaped cold iron head, silver raven emblem. |

> **Note:** `WEAPON_SHEET_COUNT` in `game-state.js` needs updating from `10` → `20` when the new weapons are wired into the loot/deck system. Blunt weapons (Flail, Morningstar) cannot cause bleed — add their IDs to `isBluntWeapon()`.

---

### Distribution (Post-Completion)
- **Tauri** — Lightweight desktop wrapper (~3MB vs Electron's ~150MB). Uses OS native webview. Nearly zero porting effort since the game is already `index.html` + assets.

### Brad Notes:
Some special 'rooms' like the Mansion and the Potion -marker- are limited use events, the Potion -marker- can only be used twice, then it rumbles and falls through the floor, forever gone as how it is marked as do not load on the map load again, The manision, if you buy, sell, or accept a free gift, will also do the sinking floor anim and be marked as do not load also.  chosing the leave button will not activate the floor sink and mark as do  not load... the player didnt take anything, so no need to do so.