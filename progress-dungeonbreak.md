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
- Enemies spawn on the map (`skeleton-web.glb`, `male_evil-web.glb`, `female_evil-web.glb`).
- **Patrol AI:** Pick random point on `globalFloorMesh`, walk to it, repeat.
- **Cone of Vision:** 120° FOV, 4.0 unit range. Enemies chase player on sight, resume patrol on losing LOS.
- **Combat Trigger:** Distance < 1.2 units fires `startCombat()`.

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
| Attack | ✅ | `resolveClash()` with 3D dice animations. Range check — throws rock if out of melee range. Flanking bonus (1.5×). |
| Skill | ✅ | Class-specific: Power Strike (Knight), Cheap Shot (Rogue), Eldritch Blast (Occultist), Smite (Priest), Holy Bash (Paladin). |
| Item | ⬜ | Stubbed (`console.log`). Needs wiring to hotbar. |
| Defend | ✅ | +4 AC stance for the enemy's turn. |
| Equip | ⬜ | Stubbed. |
| Analyze | ⬜ | Stubbed. |
| Wait | ✅ | Passes turn to enemy. |
| Flee | ✅ | Calls `exitBattleIsland()`. |
| Tactics | ✅ | Sub-menu: Dash, Shove, Guts, (Feint in code). |

#### Tactics Sub-Menu
| Action | Status | Notes |
|---|---|---|
| Dash | ✅ | Doubles movement, disables attack for the turn. |
| Shove | ✅ | STR clash — pushes enemy 1.5m on success. |
| Guts | ✅ | Charge up a burst strike. Stacks up to ×2. Always causes bleed. |
| Feint | ✅ | DEX vs WIS clash — next attack gains flank bonus on success. |

#### Bleed Mechanics ✅ (most recent feature)
- Edged weapons: crits always inflict bleed (2 dmg × 3 turns), regular hits have 15% chance (1 dmg × 2 turns).
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

## 🎯 Phase 3: Depth & Polish (Current Focus)

### High Priority
- [ ] **Item use in combat** — Wire the Item button to hotbar potions/consumables.
- [ ] **Skill selection UI** — Currently auto-selects first skill. Need a sub-menu to pick from multiple.
- [ ] **Loot drops** — Enemies should drop items/coins on death, not just add to trophy stack.
- [ ] **Initiative roll** — Roll d20 on combat start to determine who goes first (player or enemy).

### Medium Priority
- [ ] **Analyze command** — Show enemy stats (HP, AC, STR) in the combat tracker.
- [ ] **Equip command** — Allow quick-swapping gear during combat (limited to 1/battle?).
- [ ] **More enemy variety** — Different stat blocks per enemy type (skeleton = brittle/low HP, evil knight = high armor, etc.).
- [ ] **Enemy-specific skills** — Some enemies could have their own special moves.

### Polish / Future
- [ ] **3D dice roll visuals** — Spawn `d20.glb`, animate roll, swap texture to show result.
- [ ] **Sound effects** — Attack, hit, bleed, victory stings.
- [ ] **XP / Leveling** — Gain stat points on level-up.
- [ ] **Floor progression** — Boss encounter at end of each floor, staircase to next floor.
