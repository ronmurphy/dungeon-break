/**
 * helix-generator.js
 * Builds the Double Helix traversal zone — a spiral ramp the player runs up
 * between floors after defeating the Guardian.
 *
 * Positioned at world (4000, 4000, 4000) so it never clips with the dungeon
 * (which lives near origin) or the Battle Island (2000, 2000, 2000).
 */
import * as THREE from 'three';

const HELIX_WORLD_POS = new THREE.Vector3(4000, 4000, 4000);

/** Returns the world-space anchor of the helix (for camera targeting). */
export function getHelixAnchor() {
    return HELIX_WORLD_POS.clone();
}

/**
 * Creates the helix zone in the scene.
 * Returns { group, exitPos, botPos }
 *   group:   THREE.Group — all helix geometry (add to scene)
 *   exitPos: world-space Vector3 of the exit trigger (top platform centre)
 *   botPos:  world-space Vector3 of the player start (bottom centre)
 */
export function createHelixZone(scene, floor) {
    const group = new THREE.Group();
    group.position.copy(HELIX_WORLD_POS);
    scene.add(group);

    // Separate group for WALKABLE surfaces only — used for click-to-move raycasting.
    // The main group contains everything (visual + walkable).
    // floorGroup is a lightweight sibling used exclusively for movement raycasts.
    const floorGroup = new THREE.Group();
    floorGroup.position.copy(HELIX_WORLD_POS);
    scene.add(floorGroup);

    const RADIUS = 7;     // spiral centre-line radius
    const WIDTH  = 3.5;   // walkway width
    const HEIGHT = 18;    // total rise of the ramp
    const TURNS  = 2;     // full rotations (2 = double helix)

    // Materials — get darker on deeper floors
    const stoneColor = new THREE.Color(0x4a3728).lerp(new THREE.Color(0x1a0808), Math.min(floor / 8, 1));
    const stoneMat = new THREE.MeshStandardMaterial({ color: stoneColor, roughness: 0.9 });
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x1e1008, roughness: 1.0 });
    const topMat = new THREE.MeshStandardMaterial({
        color: 0x2a0e4a, roughness: 0.8,
        emissive: new THREE.Color(0x6600cc), emissiveIntensity: 0.5,
    });
    const beamMat = new THREE.MeshBasicMaterial({
        color: 0xaa44ff, transparent: true, opacity: 0.55, side: THREE.BackSide,
    });
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x0d0808, roughness: 1.0, side: THREE.BackSide });

    // Central pillar (visual only — not walkable)
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.2, HEIGHT + 3, 10), pillarMat);
    pillar.position.set(0, HEIGHT / 2 - 0.5, 0);
    group.add(pillar);

    // Spiral ramp — add to BOTH groups (visual + walkable)
    const rampMesh = _buildSpiralRamp(group, RADIUS, HEIGHT, TURNS, WIDTH, stoneMat);
    if (rampMesh) {
        const rampClone = rampMesh.clone();
        rampClone.position.copy(rampMesh.position);
        rampClone.visible = false; // invisible duplicate — raycasts only
        floorGroup.add(rampClone);
    }

    // Bottom platform — walkable
    const bot = new THREE.Mesh(new THREE.CylinderGeometry(10, 10, 0.5, 20), stoneMat);
    bot.position.set(0, -0.25, 0);
    group.add(bot);
    const botFloor = bot.clone(); botFloor.visible = false;
    floorGroup.add(botFloor);

    // Top platform (glowing — exit zone) — walkable
    const top = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 0.5, 16), topMat);
    top.position.set(0, HEIGHT + 0.25, 0);
    group.add(top);
    const topFloor = top.clone(); topFloor.visible = false;
    floorGroup.add(topFloor);

    // Exit beam (visual only)
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.6, 8, 8, 1, true), beamMat);
    beam.position.set(0, HEIGHT + 4, 0);
    group.add(beam);

    // Containment wall (visual only — never walkable, never raycasted for movement)
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(12, 12, HEIGHT + 4, 40, 1, true), wallMat);
    wall.position.set(0, HEIGHT / 2, 0);
    group.add(wall);

    // Lighting
    const dir = new THREE.DirectionalLight(0xffffff, 2.5);
    dir.position.set(8, 25, 8);
    group.add(dir);
    group.add(dir.target);
    group.add(new THREE.AmbientLight(0xffffff, 0.5));
    group.add(new THREE.HemisphereLight(0xbbaaff, 0x221111, 0.7));

    // Purple point light at the exit for dramatic effect
    const exitLight = new THREE.PointLight(0x6600cc, 4.0, 22);
    exitLight.position.set(0, HEIGHT + 2, 0);
    group.add(exitLight);

    return {
        group,
        floorGroup,   // <- use this for movement raycasting only
        exitPos: new THREE.Vector3(0, HEIGHT, 0).add(group.position),
        botPos:  new THREE.Vector3(RADIUS, 0, 0).add(group.position),
    };
}

/**
 * Returns evenly spaced world-position waypoints along the spiral
 * at the given fraction list (0..1). Used to place helix enemies.
 */
export function getHelixWaypoints(fractions = [0.25, 0.5, 0.75]) {
    const RADIUS = 7;
    const HEIGHT = 18;
    const TURNS  = 2;
    return fractions.map(t => {
        const angle = t * Math.PI * 2 * TURNS;
        return new THREE.Vector3(
            HELIX_WORLD_POS.x + Math.cos(angle) * RADIUS,
            HELIX_WORLD_POS.y + t * HEIGHT,
            HELIX_WORLD_POS.z + Math.sin(angle) * RADIUS,
        );
    });
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function _buildSpiralRamp(group, radius, height, turns, width, mat) {
    const segments = 120; // more segments = smoother curve
    const innerR = radius - width / 2;
    const outerR = radius + width / 2;

    const positions = [];
    const indices   = [];

    for (let i = 0; i <= segments; i++) {
        const t     = i / segments;
        const angle = t * Math.PI * 2 * turns;
        const y     = t * height;

        // Inner vertex
        positions.push(Math.cos(angle) * innerR, y, Math.sin(angle) * innerR);
        // Outer vertex
        positions.push(Math.cos(angle) * outerR, y, Math.sin(angle) * outerR);
    }

    for (let i = 0; i < segments; i++) {
        const a = i * 2,       b = i * 2 + 1;
        const c = (i + 1) * 2, d = (i + 1) * 2 + 1;
        // Two triangles, wound counter-clockwise from above (normals face up)
        indices.push(a, c, b);
        indices.push(b, c, d);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const mesh = new THREE.Mesh(geo, mat);
    group.add(mesh);
    return mesh;
}
