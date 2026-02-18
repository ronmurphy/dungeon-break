import * as THREE from 'three';
// TWEEN is loaded globally via script tag in index.html
import { createBattleIsland } from './battle-island.js'; // Named export
import { game } from './game-state.js';

// Define helper texture functions directly in this module scope if they don't exist
const textureLoader = new THREE.TextureLoader();
const textureCache = new Map();

function loadTexture(path) {
    if (textureCache.has(path)) return textureCache.get(path);
    const tex = textureLoader.load(path);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    textureCache.set(path, tex);
    return tex;
}

function getClonedTexture(path) {
   const tex = loadTexture(path);
   return tex.clone();
}


/*
 * CombatManager
 * Handles the transition to/from combat, camera positioning (FFT Style),
 * and managing the combat scene state.
 */
export const CombatManager = {
    scene: null,
    camera: null,
    controls: null,
    player: null,
    battleGroup: null,
    isActive: false,

    // Camera Settings for Combat (Fixed Isometric View for FFT Style)
    // Target is center of the battle island (2000, 2000, 2000)
    // Isometric angle: Look from equal distance on X and Z, and high Y.
    // e.g., Offset (100, 100, 100) -> 45 deg angle
    combatCamOffset: new THREE.Vector3(40, 40, 40), 
    combatTarget: new THREE.Vector3(2000, 2000, 2000), // Must match BattleIsland position
    combatZoom: 1.0, // Standard zoom

    savedState: {
        pos: new THREE.Vector3(),
        target: new THREE.Vector3(),
        zoom: 1
    },
    
    _originalMapBtnHandler: null,

    init(scene, camera, controls, playerMesh) {
        this.scene = scene;
        this.camera = camera;
        this.controls = controls;
        this.player = playerMesh;
    },

    startCombat(enemy, theme) {
        if (this.isActive) {
            console.warn("⚠️ [combat-manager.js] Combat already active, ignoring request.");
            return;
        }
        this.isActive = true;
        console.log("⚔️ [combat-manager.js] Starting Combat...");
        console.log("   -> Current Camera Pos:", this.camera.position);

        // 1. Save Camera State
        this.savedState.pos.copy(this.camera.position);
        this.savedState.target.copy(this.controls.target);
        this.savedState.zoom = this.camera.zoom;
        console.log("   -> Saved Camera State (pos):", this.savedState.pos);

        // 2. Create/Show Battle Arena
        if (this.battleGroup) {
            this.scene.remove(this.battleGroup);
            this.battleGroup = null; 
        }

        const floorLevel = (theme && theme.id) ? theme.id : 1;
        console.log(`   -> Generating Battle Island for Floor ${floorLevel}...`);
        
        // The createBattleIsland function now places the group at (2000, 2000, 2000)
        // so we don't need to manually set position here, but we reference it for cam target
        this.battleGroup = createBattleIsland(this.scene, floorLevel, loadTexture, getClonedTexture);
        console.log("   -> Battle Island created at:", this.battleGroup.position);

        // 3. Move Camera to Arena
        // Calculate camera position relative to the target
        const targetPos = new THREE.Vector3()
            .copy(this.combatTarget)
            .add(this.combatCamOffset);
            
        console.log("   -> Moving Camera to:", targetPos);
        console.log("   -> Setting Target to:", this.combatTarget);

        // Tween Camera Position
        // Using TWEEN (global)
        new TWEEN.Tween(this.camera.position)
            .to({ x: targetPos.x, y: targetPos.y, z: targetPos.z }, 1000)
            .easing(TWEEN.Easing.Cubic.Out)
            .onComplete(() => console.log("   -> Camera movement complete."))
            .start();

        // Tween Camera Target (Look at center of arena)
        new TWEEN.Tween(this.controls.target)
            .to({ x: this.combatTarget.x, y: this.combatTarget.y, z: this.combatTarget.z }, 1000)
            .easing(TWEEN.Easing.Cubic.Out)
            .start();

        // Reset Zoom (Standardize View)
        new TWEEN.Tween(this.camera)
            .to({ zoom: this.combatZoom }, 1000)
            .onUpdate(() => this.camera.updateProjectionMatrix())
            .start();

        // 4. Move Player & Enemy to Arena
        // Player Start: (-3, relative Y, 3) facing Center
        // Note: The floor is at y=0 relative to group, so group.y is the base
        if (this.player) {
            const pStart = new THREE.Vector3(
                -3 + this.combatTarget.x, 
                0.5 + this.combatTarget.y, 
                3 + this.combatTarget.z
            );
            console.log("   -> Teleporting Player to:", pStart);
            this.player.position.copy(pStart);
            this.player.lookAt(this.combatTarget);
            this.player.visible = true;
        }

        // Enemy Start: (3, relative Y, -3) facing Center
        if (enemy && enemy.mesh) {
            const eStart = new THREE.Vector3(
                3.5 + this.combatTarget.x, 
                0.5 + this.combatTarget.y, 
                -3.5 + this.combatTarget.z
            );
            console.log("   -> Teleporting Wanderer to:", eStart);
            enemy.mesh.position.copy(eStart);
            enemy.mesh.lookAt(this.combatTarget);
            enemy.mesh.visible = true;
        }

        // 5. Setup Exit Button (Temporary Debug Feature)
        const mapBtn = document.getElementById('mapWeaponBtn');
        if (mapBtn) {
            this._originalMapBtnHandler = mapBtn.onclick;
            mapBtn.onclick = (e) => {
                e.stopPropagation();
                console.log("🛑 [combat-manager.js] User requested exit via button.");
                this.endCombat(enemy); 
            };
            mapBtn.style.filter = "hue-rotate(90deg)"; // Visual cue
        }
    },

    endCombat(enemy) {
        if (!this.isActive) return;
        this.isActive = false;
        console.log("🏳️ [combat-manager.js] Ending Combat...");

        // 1. Restore Camera
        console.log("   -> Restoring Camera to:", this.savedState.pos);
        new TWEEN.Tween(this.camera.position)
            .to({ 
                x: this.savedState.pos.x, 
                y: this.savedState.pos.y, 
                z: this.savedState.pos.z 
            }, 800)
            .easing(TWEEN.Easing.Cubic.Out)
            .start();

        new TWEEN.Tween(this.controls.target)
            .to({ 
                x: this.savedState.target.x, 
                y: this.savedState.target.y, 
                z: this.savedState.target.z 
            }, 800)
            .easing(TWEEN.Easing.Cubic.Out)
            .start();

        new TWEEN.Tween(this.camera)
            .to({ zoom: this.savedState.zoom }, 800)
            .onUpdate(() => this.camera.updateProjectionMatrix())
            .start();

        // 2. Cleanup
        if (enemy && enemy.mesh) {
            enemy.mesh.visible = false; 
            // In a real battle, we'd delete the enemy or reset them if fled
        }

        // 3. Restore Button
        const mapBtn = document.getElementById('mapWeaponBtn');
        if (mapBtn) {
            mapBtn.onclick = this._originalMapBtnHandler;
            mapBtn.style.filter = ""; 
            this._originalMapBtnHandler = null;
        }

        // 4. Remove Arena
        if (this.battleGroup) {
            setTimeout(() => {
                console.log("   -> Removing Battle Island from scene.");
                this.scene.remove(this.battleGroup);
                this.battleGroup = null;
            }, 1000);
        }
    }
};
