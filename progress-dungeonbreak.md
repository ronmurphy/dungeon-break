# Dungeon Break - Progress & Roadmap

This document tracks the development of "Dungeon Break," a tactical, "coffee-break" RPG. It reflects the project's pivot from its original "Scoundrel" card-based mechanics.

## ✅ Phase 1: The Great Pivot (Complete) - Mostly done (Brad (User))

We have successfully transitioned the core engine from a card-based dungeon crawler to a free-roaming tactical RPG.

-   **New Core Loop:** The game is no longer a room-by-room card puzzle. The player can now freely explore the 3D environment.
-   **"Click-to-Move" Engine:**
    -   Implemented raycasting against the floor mesh for direct point-and-click movement.
    -   Player character now has **Walk** (Left Click) and **Run** (Right Click) speeds.
    -   Movement is slope-aware and features cliff/void prevention to stop the player from walking off edges.
-   **Atmospheric Polish:**
    -   The player's floating diamond marker now has a soft, pulsing `SpotLight` that illuminates the area, enhancing the "outside" exploration feel.
-   **Code Refactoring:**
    -   All legacy "Scoundrel" card game logic (e.g., `pickCard` combat, "pick 3" loop) has been removed from `scoundrel-3d.js`, cleaning up the codebase for the new mechanics.
-   **New Combat Foundation:**
    -   Created `dnd-mechanics.js` to house the new, simplified D&D combat rules ("Stat + Weapon = Die Size" and Armor as Damage Reduction).

## ✅ Phase 2: First Contact (Complete) - (no it's in progress: Brad (user))

We have implemented the transition from free-roaming exploration to turn-based combat.

-   **Wandering Enemies:** Populated the map with patrol AIs using "Cone of Vision" stealth mechanics.
-   **Enemies Encounter:** Stepping into an enemy's range triggers a seamless transition to the combat state.
-   **Command UI:** Implemented the tactical command menu (Attack, Skill, Item, Flee).
-   **3D Combat Mechanics:**
    -   Initiative rolls (d20) decide turn order.
    -   Implemented 3D dice spawning and result textures.
    -   Integrated `dnd-mechanics.js` for "Stat + Weapon" power-level rolls.

## ✅ Phase 3: The Gothic & Stat Overhaul (Complete)- (no it's in progress: Brad (user))

Restored the classic "Dungeon Break" aesthetics and modernized the base stats to a robust DND-inspired system.

-   **Gothic HUD Restoration:**
    -   Re-implemented the custom Gothic fill-bars for HP, AP, and Torch Fuel.
    -   Consolidated UI refresh logic into `window.updateUI()` for global synchronization.
-   **Stat Re-Engineering:**
    -   **HP Power:** Health is now explicitly `20 + Strength`.
    -   **Armor (AP):** Implemented an Armor Pool system where AP sums from all 4 equipped slots.
    -   **Damage Reduction:** Added a "Protection Floor" that blocks 1 damage per equipped armor piece on every hit.
-   **Combat Balance & Clarity:**
    -   **Minimum Damage Rule:** Ensured hits always deal at least 1 damage to solve "immortality" bugs when AC was too high.
    -   **Clarity:** Added "BLOCKED!" indicators and updated combat logs to distinguish between evasion and armor absorption.
-   **Documentation:** Fully updated the "How to Play" guide to explain Clashes, AC, and the new Armor system.

## 🎯 Phase 4: Depths of the Gilded Depths (Current Focus)- (no it's in progress: Brad (user))

Now that the foundation is rock-solid, we focus on depth and progression.

### 1. Advanced AI Tactics
-   Develop unique patterns for different monsters (e.g., Goblins that flee, Skeletons that defend).
-   Implement the "Guts" charging mechanic for elite enemies.

### 2. Level Progression & Loot
-   Implement XP and Level-up system (Stat point allocation).
-   Add randomized loot drops from defeated enemies.

### 3. Procedural Depth
-   Connect the 3D map to the procedural generation of floors and transitions.

---

The system is now stable and the HUD feels premium. Combat is challenging, and the player finally takes damage as they should! Let's descend further.
