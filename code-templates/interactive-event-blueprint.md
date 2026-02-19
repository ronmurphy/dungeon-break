# Interactive Event Blueprint: The "Manor" Pattern

This document outlines the standard architecture for creating interactive 3D events in *Dungeon Break*. It follows the **Trigger > Event > Effect > Resolution** lifecycle used for the Whispering Manor.

---

## 1. Data Structure (The Object)

Ensure your object (Room or Entity) has the necessary flags in `game-state.js` or `dungeon-generator.js`.

```javascript
// Example Room Object
{
    id: 10,
    gx: 5, gy: 10,          // Grid Coordinates
    w: 2, h: 2,             // Dimensions (Used for Trigger Calculation)
    isSpecial: true,        // The Flag identifying this event type
    state: 'uncleared',     // Current state
    isVanished: false       // Persistence flag (if object disappears after use)
}
```

---

## 2. The Trigger (Proximity Detection)

Located in `scoundrel-3d.js` inside the `animate3D()` loop.

### The Golden Formula
To ensure the player can trigger the event without clipping inside the model, calculate the threshold dynamically based on the object's size.

```javascript
// Standard Marker (Chest, Waypoint)
let threshold = 0.6; 

// Large Structure (Manor, Tower)
if (r.isSpecial) {
    // Formula: ((MaxDimension / 2) + BaseBuffer) * ScaleFactor
    // r.w/r.h: The grid size of the room
    // 1.5: Base buffer to reach the edge
    // 1.5: Scale factor for comfortable interaction range
    threshold = ((Math.max(r.w, r.h) / 2) + 1.5) * 1.5;
}
```

### Implementation
```javascript
// Inside animate3D()
if (!isCombatView && !isAttractMode) {
    for (const r of game.rooms) {
        if (r.isSpecial && r.id !== game.currentRoomIdx) {
            const dist = Math.hypot(r.gx - playerObj.position.x, r.gy - playerObj.position.z);
            
            if (dist < threshold) {
                enterRoom(r.id); // Triggers the Event Phase
                break;
            }
        }
    }
}
```

---

## 3. The Event (UI Modal)

Located in `ui-manager.js`. This pauses the game and presents choices.

```javascript
export function showMyEventPrompt() {
    // 1. Setup Overlay
    const overlay = document.getElementById('combatModal');
    overlay.style.display = 'flex';
    
    // 2. Create/Get UI Container
    let ui = document.getElementById('trapUI');
    if (!ui) { /* create div */ }
    
    // 3. Inject Content
    ui.innerHTML = `
        <h2>EVENT TITLE</h2>
        <div class="flavor-text">Flavor text goes here...</div>
        <div class="button-group">
            <button onclick="window.handleEventChoice('option_a')">Option A</button>
            <button onclick="window.handleEventChoice('leave')">Leave</button>
        </div>
    `;
}
```

---

## 4. The Effect (Logic Handler)

Located in `scoundrel-3d.js`. Handles the player's selection.

```javascript
window.handleEventChoice = function(choice) {
    if (choice === 'leave') {
        closeCombat(); // Close UI
        // Optional: Push player back so they don't re-trigger immediately
        pushPlayerBack(game.activeRoom); 
        return;
    }
    
    if (choice === 'option_a') {
        // 1. Execute Logic (Give Item, Heal, etc.)
        addToBackpack(someItem);
        
        // 2. Update State
        game.activeRoom.state = 'cleared';
        
        // 3. Trigger Resolution
        resolveEventAnimation(game.activeRoom);
        
        // 4. Close UI
        closeCombat();
    }
};
```

---

## 5. The Resolution (Animation & Persistence)

If the object changes or disappears (like the Sinking Manor), handle it here.

```javascript
function resolveEventAnimation(room) {
    const mesh = roomMeshes.get(room.id);
    if (!mesh) return;

    // 1. Visual FX (Particles, Shake)
    spawn3DImpact(mesh.position, 0x887766, 'smoke_05.png');
    
    // 2. Animation (Tween)
    new TWEEN.Tween(mesh.position)
        .to({ y: -15 }, 3000) // Sink into ground
        .easing(TWEEN.Easing.Cubic.In)
        .onComplete(() => {
            // 3. Cleanup & Persistence
            room.isVanished = true; // Flag to prevent respawn on load
            scene.remove(mesh);
            roomMeshes.delete(room.id);
            saveGame(); // Save state immediately
        })
        .start();
}
```

---

## 6. Debugging

Use `window.debugTriggerZones()` in the console to visualize:
*   **Yellow Ring:** The calculated Logic Threshold.
*   **Red Box:** The actual GLB Model Bounding Box.
*   **Cyan Box:** The Bounding Box + 0.4 padding.

*If the Yellow Ring is smaller than the Red Box, the player cannot trigger the event! Increase the threshold calculation.*