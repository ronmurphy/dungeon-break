# 🗺️ Dungeon Break: Development Planner

**Current Status:** Migrating from "Scoundrel" (Card Crawler) to "Dungeon Break" (Tactical RPG).

## 🎯 The Vision
**"Coffee Break D&D"**
A 15-minute tactical RPG where players explore abyssal islands, fight monsters using d20 mechanics, and loot procedural dungeons.

## 🛠️ Technical Pivot Strategy

### 1. Core Loop Refactor
- **Old:** Pick 3 Cards -> Compare Values -> Resolve.
- **New:** Explore Map (Real-time) -> Proximity Trigger -> Turn-Based Combat (Initiative -> Actions).

### 2. Movement System
- **Goal:** Replace "Teleport to Room" with "Click-to-Move".
- **Implementation:**
  - Update `on3DClick` to raycast against `globalFloorMesh`.
  - Use `Three.js` pathfinding or simple vector movement (`player.position.add(dir * speed)`).
  - Camera follows player (`controls.target.copy(player.position)`).

### 3. Combat System (The "Twist")
- **Logic:** Simplified D&D 5e.
  - `Attack Roll = d20 + STR/DEX/INT` vs `Enemy AC`.
  - `Damage = Weapon Base + Variance`.
- **Visuals:**
  - Spawn 3D Dice for rolls (Texture swapping for results).
  - Camera swoops to "Combat Angle" (Side view).
  - Initiative order displayed in UI.

### 4. Asset Pipeline
- **Models:** Use name-matching for animations (e.g., find clip containing "Walk") instead of fixed indices.
- **Polycount:** Target 3k-5k tris per character for web performance.

## 📋 Immediate To-Do List

1.  [x] **Repo Setup**: Clone to `dungeon-break`, exclude `.git`.
2.  [x] **Data Prep**: Update `CLASS_DATA` in `game-state.js` with STR/DEX/INT/AC stats.
3.  [x] **Logic Module**: Create `dnd-mechanics.js` to handle dice rolls.
4.  [ ] **Movement**: Implement Raycast movement in `scoundrel-3d.js`.
5.  [ ] **Combat UI**: Build the "Command Menu" (Attack, Skill, Item).

---

## 📝 Note from Previous Session
*To the next Assistant:*
We have already laid the groundwork. The `game-state.js` file has the new stats. The user wants to focus on the "Click-to-Move" feel first—getting off the rails of the corridor system. The atmosphere and lighting are perfect; don't break them! Good luck with the dice physics!