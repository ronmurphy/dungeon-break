import * as THREE from 'three';

export function generateHouse(scene, anchor) {
    const houseGroup = new THREE.Group();
    houseGroup.position.copy(anchor);

    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x887766, roughness: 0.9 });
    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x665544, roughness: 0.8 });

    const roomWidth = 10;
    const roomDepth = 12;
    const wallHeight = 3;

    // Floor
    const floorGeo = new THREE.PlaneGeometry(roomWidth, roomDepth);
    const floor = new THREE.Mesh(floorGeo, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    houseGroup.add(floor);

    // Walls
    const wallGeo1 = new THREE.BoxGeometry(roomWidth, wallHeight, 0.2);
    const wall1 = new THREE.Mesh(wallGeo1, wallMaterial);
    wall1.position.set(0, wallHeight / 2, -roomDepth / 2);
    wall1.castShadow = true;
    houseGroup.add(wall1);

    // Front Wall (Split for Door)
    const doorWidth = 3;
    const sideW = (roomWidth - doorWidth) / 2;
    const wallFrontL = new THREE.Mesh(new THREE.BoxGeometry(sideW, wallHeight, 0.2), wallMaterial);
    wallFrontL.position.set(-roomWidth / 2 + sideW / 2, wallHeight / 2, roomDepth / 2);
    houseGroup.add(wallFrontL);
    const wallFrontR = new THREE.Mesh(new THREE.BoxGeometry(sideW, wallHeight, 0.2), wallMaterial);
    wallFrontR.position.set(roomWidth / 2 - sideW / 2, wallHeight / 2, roomDepth / 2);
    houseGroup.add(wallFrontR);

    const wallGeo2 = new THREE.BoxGeometry(0.2, wallHeight, roomDepth);
    const wall3 = new THREE.Mesh(wallGeo2, wallMaterial);
    wall3.position.set(-roomWidth / 2, wallHeight / 2, 0);
    wall3.castShadow = true;
    houseGroup.add(wall3);

    const wall4 = new THREE.Mesh(wallGeo2, wallMaterial);
    wall4.position.set(roomWidth / 2, wallHeight / 2, 0);
    wall4.castShadow = true;
    houseGroup.add(wall4);

    // Internal Light
    const houseLight = new THREE.PointLight(0xffaa55, 300, 15);
    houseLight.position.set(0, wallHeight - 0.5, 0);
    houseLight.castShadow = true;
    houseGroup.add(houseLight);
    houseGroup.userData.light = houseLight; // Reference for toggling

    // Local Ambient Light (So it's not pitch black if main lights are off)
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    houseGroup.add(ambient);

    // Exit Zone Marker (Green Glow on Floor)
    const exitGeo = new THREE.PlaneGeometry(doorWidth, 1);
    const exitMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.3, side: THREE.DoubleSide });
    const exitMesh = new THREE.Mesh(exitGeo, exitMat);
    exitMesh.rotation.x = -Math.PI / 2;
    exitMesh.position.set(0, 0.02, roomDepth / 2);
    houseGroup.add(exitMesh);

    scene.add(houseGroup);
    return houseGroup;
}