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
