# Dungeon Break - Progress & Roadmap

This document tracks the development of "Dungeon Break," a tactical, "coffee-break" RPG. It reflects the project's pivot from its original "Scoundrel" card-based mechanics.

## ✅ Phase 1: The Great Pivot (Complete)

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

## 🎯 Phase 2: First Contact (Current Focus)

The next step is to make the world feel alive and dangerous. We need to implement the first real gameplay loop: **Exploration -> Encounter**.

### 1. Wandering Enemies
-   **Goal:** Populate the world with visible threats.
-   **Implementation:**
    -   Create a `Wanderer` class/system in `scoundrel-3d.js`.
    -   Spawn `skeleton-web.glb` and the "evil" player models (`male_evil-web.glb`, `female_evil-web.glb`) as wandering enemies on the map.
    -   Give them a simple "patrol" AI: pick a random nearby point on the `globalFloorMesh` and walk to it.

### 2. Proximity Trigger
    -   Implemented "Cone of Vision" for wandering enemies, enabling stealth gameplay. Enemies now have a 120-degree view angle and can "see" the player up to 4.0 units away.
    -   Enemies will now chase the player when seen, they will stop moving and roam to a new spot on the map to walk when they lose line of sight.




### 2. Teleporting to New "Battle House" when touching the enemy.
-   **Goal:** Initiate combat when the player gets close to an enemy.
-   **Implementation:**
    -   In the `animate3D` loop, check the distance between the player and all active `Wanderer` instances.
    -   If `distance < 3.0` (or a similar threshold), stop player movement and trigger the combat sequence.

### 3. Combat UI: The Command Menu
-   **Goal:** Create the basic UI for making decisions in a fight.
-   **Implementation:**
    -   When combat is triggered, display a simple HTML overlay with buttons: `[ATTACK]`, `[SKILL]`, `[ITEM]`, `[FLEE]`.
    -   This menu will be the foundation for all turn-based actions.

### 4. Initiative & Turn Order
-   **Goal:** Decide who goes first in combat.
-   **Implementation:**
    -   On combat start, roll a virtual d20 for the Player and the Enemy.
    -   Display the results (e.g., "Player rolled 15, Skeleton rolled 8").
    -   The higher roll gets the first turn. This will control when the Command Menu is active.

### 5. The First Attack
-   **Goal:** Wire up the `ATTACK` command to the new D&D mechanics.
-   **Implementation:**
    -   Clicking the `ATTACK` button will enter a "Targeting Mode."
    -   Clicking an enemy will call `CombatResolver.resolveAttack()` from `dnd-mechanics.js`.
    -   **Visuals:** This is where we'll implement the 3D dice roll. When an attack is made, we'll spawn your blank `d20.glb`, have it roll, and then swap its texture to show the result.

---

This is a fantastic list. Getting the wandering enemies and proximity trigger working will be the "Aha!" moment where this truly starts to feel like a new game. Let's get to it!
-.-
<div class="vitality-row">
                        <div style="text-align:right;">
                            <div class="hp-big" id="hpValueModal">20</div>
                            <div class="hp-label-small">Vitality</div>
                        </div>
                        <div style="flex-grow:1;">
                            <div class="hp-bar-compact">
                                <div class="hp-fill-compact" id="hpBarModal" style="width: 100%;"></div>
                            <div id="apBarModal" style="position: absolute; top: 0px; left: 0px; height: 100%; background: rgb(136, 170, 255); opacity: 0.6; transition: width 0.3s; width: 100%;"></div></div>
                            <div style="display:flex; justify-content:space-between; margin-top:2px;">
                                <div class="hp-label-small"><span id="combatMessage" style="text-transform:none; color:#ddd; font-style:italic;">Make your move...</span></div>
                            </div>
                        </div>
                    </div>