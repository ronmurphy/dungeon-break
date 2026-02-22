import * as THREE from 'three';
import { generateBattleArena } from './dungeon-generator.js';

export function createBattleIsland(scene, floor, loadTexture, getClonedTexture) {
    console.log('⚔️ [battle-island.js] Creating CA Battle Island (v3)...');
    
    // Create a container group for the battle island
    const group = new THREE.Group();
    // Position it high up to avoid clipping with dungeon
    // Using Y=2000 to be extremely safe
    group.position.set(2000, 2000, 2000); 
    scene.add(group);

    // Call the generator, passing the group as the "scene" to attach mesh to
    // The generator creates a mesh at (0,0,0) relative to parent
    const floorMesh = generateBattleArena(group, floor, loadTexture, getClonedTexture);
    
    // Grid removed for immersion
    // const grid = new THREE.GridHelper(20, 20, 0xff0000, 0x444444);
    // group.add(grid);

    // Add a local light to ensure the island is lit regardless of global scene
    const light = new THREE.DirectionalLight(0xffffff, 3.0);
    light.position.set(10, 20, 10);
    light.target.position.set(0, 0, 0);
    group.add(light);
    group.add(light.target);

    // Add Ambient for shadows
    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    group.add(ambient);

    // Add Hemisphere for better 3D definition
    const hemi = new THREE.HemisphereLight(0xffffff, 0x222222, 1.0);
    group.add(hemi);

    console.log('   -> Battle Island Group created at World Pos:', group.position);

    return group;
}

/**
 * Adds a cylindrical containment wall around the arena so enemies can't escape.
 * Uses BackSide rendering so the interior face is visible when standing inside.
 * A cylinder naturally follows the island's organic shape better than 4 boxes.
 *
 * radius:     outer radius of the cylinder (should exceed island halfSize)
 * wallHeight: total height of the wall (must exceed JUMP_ARC_WINGED = 2.2)
 */
export function addArenaWalls(group, halfSize = 20, wallHeight = 6) {
    const radius = halfSize + 2; // A little outside the island edge

    // Open-ended cylinder — inside face rendered via BackSide
    const geo = new THREE.CylinderGeometry(radius, radius, wallHeight, 48, 1, true);
    const mat = new THREE.MeshStandardMaterial({
        color: 0x1a1008,
        roughness: 1.0,
        side: THREE.BackSide,   // Render the inner face (visible from inside the cylinder)
    });
    const wall = new THREE.Mesh(geo, mat);
    // Start the wall slightly below ground so there are no floor gaps
    wall.position.set(0, wallHeight / 2 - 1.5, 0);
    group.add(wall);
}

// Backward Compatibility for existing code to prevent crashes
const BattleIsland = {
    // Return the new safe location so old code using getAnchor() doesn't break
    anchor: new THREE.Vector3(2000, 2000, 2000), 
    init: () => { /* Stub */ },
    generate: () => { /* Stub */ },
    getAnchor: () => new THREE.Vector3(2000, 2000, 2000),
    scene: null 
};

export default BattleIsland;
