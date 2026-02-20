# Dungeon Break - Progress & Roadmap

*Last updated: 2026-02-20*

---

## ✅ Phase 1: The Great Pivot (Complete)

- **Click-to-Move Engine:** Raycasting against floor mesh, Walk (LMB) and Run (RMB) speeds, slope-aware, cliff/void prevention.
- **Atmospheric Polish:** Player floating diamond marker with pulsing SpotLight.
- **Code Cleanup:** All legacy Scoundrel card logic removed from `scoundrel-3d.js`.
- **D&D Foundation:** `dnd-mechanics.js` created with `DiceRoller`, `CombatResolver.resolveClash()`, and the Dulling Blade durability mechanic.

---

## ✅ Phase 2: First Contact (Complete)

### Wandering Enemies
- Enemies spawn on the map (`skeleton-web.glb`, `male_evil-web.glb`, `female_evil-web.glb`, `ironjaw-web.glb`, `Gwark-web.glb`, `gremlinn.glb`*, `Stolem.glb`*, `SkeletalViking-web.glb`).
- *Note: `gremlinn.glb` and `Stolem.glb` still need web compression (`-web` suffix pipeline).*
- **Patrol AI:** Pick random point on `globalFloorMesh`, walk to it, repeat.
- **Cone of Vision:** 120° FOV, 4.0 unit range. Enemies chase player on sight, resume patrol on losing LOS.
- **Combat Trigger:** Distance < 1.2 units fires `startCombat()`.
- **Enemy Database:** `enemy-database.js` — named stat blocks per model type. `enemyDisplayName()` helper ensures proper names everywhere (no filename leaking into UI).

### Battle Island & Camera
- `CombatManager` teleports player + enemy to a separate `BattleIsland` at (2000, 2000, 2000).
- Camera tweens to FFT-style fixed isometric view. Restores on combat end.
- `createBattleIsland()` generates a themed arena floor based on current dungeon floor level.

### Turn-Based Combat System
- **Turn order:** Player goes first (initiative system can be added later).
- **Combat Tracker UI:** Per-enemy HP bars with color-coded indicators, combat log (last 3 messages), bleed status display.
- **Multi-enemy combat:** `combatState.enemies[]` roster; each enemy takes a turn in sequence.

#### Player Actions (Combat Menu — 3×3 grid)
| Action | Status | Notes |
|---|---|---|
| Attack | ✅ | `resolveClash()` with 3D dice animations. Range check — throws rock if out of melee range. Flanking bonus (1.5×). Ranger uses crossbow at range (DEX-based, 6.0 unit max). |
| Skill | ✅ | Shows actual skill name. All 9 classes have unique combat skills (see below). |
| Item | ⬜ | Stubbed. Needs wiring to hotbar. |
| Defend | ✅ | +4 AC stance for the enemy's turn. |
| Equip | ⬜ | Stubbed. |
| Analyze | ⬜ | Stubbed. |
| Wait | ✅ | Passes turn to enemy. |
| Flee | ✅ | Calls `exitBattleIsland()`. |
| Tactics | ✅ | Sub-menu: Dash, Shove, Guts, Feint. |

#### Tactics Sub-Menu
| Action | Status | Notes |
|---|---|---|
| Dash | ✅ | Doubles movement, disables attack for the turn. |
| Shove | ✅ | STR clash — pushes enemy 1.5m on success. |
| Guts | ✅ | Charge up a burst strike. Stacks up to ×2. Always causes bleed. |
| Feint | ✅ | DEX vs WIS clash — next attack gains flank bonus on success. |

#### Class Skills ✅ (all 9 classes implemented)
| Class | Skill | Notes |
|---|---|---|
| Knight | Power Strike | +3 power, STR-based clash. |
| Rogue | Cheap Shot | Doubled damage when target < 50% HP, DEX-based. |
| Occultist | Eldritch Blast | 1d8 magic damage, ignores armor. |
| Priest | Smite | 2 damage + 2 HP heal. |
| Paladin | Holy Bash | Weapon damage + 2 AP restore. |
| Bard | Distract | Throws rock in random direction; enemies investigate for 1 round, then realise the trick. No targeting needed. |
| Ranger | Snipe | Precision crossbow shot, 1.5× damage, crits on top 30% of die range. Must be at range (> 1.5 units). |
| Artificer | Flashbang | Blinds enemies within 5 units for 1 round. Must be in close range (≤ 3 units). No targeting needed. |
| Necromancer | Siphon Life | 3-attack drain buff. Melee/Guts: heal 35% of damage dealt. Rock: cap 1 HP. Purple `✦ SIPHON LIFE ×N` badge shows remaining charges. |

#### Bleed Mechanics ✅
- Edged weapons: crits always inflict bleed (2 dmg × 3 turns), regular hits 15% chance (1 dmg × 2 turns).
- Blunt weapons (hammer, mace): cannot cause bleed.
- Guts strike always inflicts bleed (3 dmg × 3 turns) regardless of weapon type.
- Bleed ticks at the start of the enemy's turn. Enemy can bleed out before acting.
- Combat tracker shows 🩸 icon with turns remaining.

#### Enemy AI
- Moves toward player if out of attack range (2.0 units).
- Attacks with `resolveClash()` — player takes damage on enemy win, clash on tie.
- **Guts AI:** 30% chance to charge Guts if far + healthy. Unleashes on next attack turn.
- **Flee AI:** Flees at <15% HP (disabled in True Dungeon). Removed from fight if it gets >15 units away.

#### Combat End
- **Victory:** Enemy added to `slainStack` as trophy. Multi-enemy: continues until all dead.
- **Death:** `gameOver()`.
- **Flee/End:** `exitBattleIsland()` — camera tweens back, battle island removed after delay.

---

## ✅ Phase 3: Polish & Visual Systems (In Progress — substantial work done)

### Skill Visual FX ✅
- `spawnGroundFlash(color, opts)` — DOM radial-gradient bloom at floor level. Zero GPU cost, fully potato-friendly.
- `spawnSkillFX(skillId)` — per-class texture particle combos using existing `/assets/images/textures/` sprites.
- Single call site at top of skill `setTimeout` block — all 9 classes covered automatically.
- Each class has a distinct visual signature (knight = orange slash, priest = holy white bloom, necromancer = slow purple fade, flashbang = full-screen white, etc.)

### Ground Torch Glow ✅
- Two flat `PlaneGeometry` decals, `AdditiveBlending`, `depthWrite: false` — no dynamic lights, runs fine on potato.
- **Outer** (`light_01.png`, 3.5×3.5 units): warm ambient pool, opacity 0.04–0.60 tied to `torchCharge`.
- **Inner** (`light_02.png`, 1.5×1.5 units, white): bright hotspot, fades out below 10% fuel.
- Colour shifts warm amber → red-orange as fuel depletes. Dual-frequency sine flicker for organic feel.
- Hidden in waypoints, attract mode, and battle island.

### Torch Fuel System ✅
- **Fuel meter fixed:** `maxFuel` corrected from 30 → 100 (was clipping the bar at 30% of real scale).
- **Graduated bar colour:** amber → orange → dark orange → red as fuel drains (4 thresholds).
- **No fuel burn in combat:** both movement paths (`moveTo` free movement + tile-step) guarded by `!isCombatView`. D&D turns are ~6 seconds — a torch doesn't deplete mid-fight.

### Azure Flame ✅
- **Trigger radius:** 1.5 → 3.0 units (was too tight to reliably trigger on approach).
- **`currentRoomIdx !== 0` check removed** — this was silently blocking the prompt every time the player returned to the start room after exploring.
- **Leave pushback:** 2.2 → 3.5 units, ensuring the player exits the 3.0 trigger zone cleanly.

### 3D Dice Numbers ✅
- Fixed number visibility: `depthTest: false` + `renderOrder: 999` on the number sprite — was being buried inside the opaque dice geometry.
- Canvas resolution: 64×64 → 128×128 for crisp rendering.
- Font: Cinzel → Arial (Cinzel is a CSS web font; not guaranteed available on canvas at fight start).

### Bug Fixes ✅
- **Enemy names:** `enemyDisplayName()` helper added — all combat messages, dice labels, tracker, bleed/guts/flee log now use `stats.name` first (e.g. "Stone Golem", "Gwark") instead of raw filename munging. `Stolem.glb` was showing as "Stolem.Glb".
- **Options button:** Moved from bottom-right to top-left (`top:20px; left:20px`) in both HTML and `updateMapHUD`.
- **Minstrel sell bonus:** `sellRate` = 0.65 for bard (vs 0.50 default).
- **Combat skill button:** Shows actual skill name instead of generic "Skill".

---

## 🎯 Phase 4: Content & Progression (Next Focus)

### High Priority
- [ ] **Item use in combat** — Wire the Item button to hotbar potions/consumables.
- [ ] **Loot drops** — Enemies should drop items/coins on death, not just add to trophy stack.
- [ ] **Initiative roll** — Roll d20 on combat start to determine who goes first (player or enemy).
- [ ] **Skill selection UI** — Auto-selects first skill. Need a sub-menu when a class has multiple skills.

### Medium Priority
- [ ] **Analyze command** — Show enemy stats (HP, AC, STR) in the combat tracker.
- [ ] **Equip command** — Allow quick-swapping gear during combat (limited to 1/battle?).
- [ ] **More enemy variety** — Different stat blocks per enemy type already in DB; need visual variety.
- [ ] **Enemy-specific skills** — Some enemies could have their own special moves.
- [ ] **Necromancer passive** — "Exact kills heal 1 HP" not yet wired.
- [ ] **Other class passives** — Priest waypoint heals, Paladin +AP on kills, Ranger waypoint reveal, Artificer consumable save chance.

### Polish / Future
- [ ] **Sound effects** — Attack, hit, bleed, victory stings.
- [ ] **XP / Leveling** — Gain stat points on level-up.
- [ ] **Floor progression** — Boss encounter at end of each floor, staircase to next floor.
- [ ] **Asset compression** — `gremlinn.glb` and `Stolem.glb` need web compression pipeline (`-web` rename).

### Distribution (Post-Completion)
- **Tauri** — Lightweight desktop wrapper (~3MB vs Electron's ~150MB). Uses OS native webview. Nearly zero porting effort since the game is already `index.html` + assets. Best choice for players who want a downloadable version.
