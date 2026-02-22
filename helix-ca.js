/**
 * helix-ca.js
 * CA-based Double Helix traversal zone.
 *
 * Generates an organic island at HELIX_WORLD_POS (4000, 4000, 4000) where the
 * terrain rises in a 1.5-turn spiral from a start point at Y=0 to an apex
 * platform at Y=HELIX_HEIGHT.  Player spawns at the bottom, fights their way
 * up, and triggers the next-floor descent from the apex door.
 *
 * Positioned at (4000,4000,4000) — clear of the dungeon (origin) and the
 * Battle Island (2000,2000,2000).
 */

import * as THREE from 'three';
import { getThemeForFloor } from './dungeon-generator.js';

// ── Constants ────────────────────────────────────────────────────────────────

const HELIX_WORLD_POS = new THREE.Vector3(4000, 4000, 4000);

const ISLAND_BOUNDS   = 40;    // CA grid size in cells (= local world units)
const HELIX_HEIGHT    = 14;    // total Y rise from bot to apex
const HELIX_TURNS     = 2.5;   // rotations — 2½ full turns around the corkscrew
const SPIRAL_R_FRAC   = 0.52;  // centerline at 52% of island half-width (~10.4 units)
const PATH_FLATTEN    = 2.5;   // cells within this dist of path get exact spiral height
const CA_INIT_ALIVE   = 0.45;
const PRISM_BASE      = -1.5;  // bottom of side skirts (below Y=0)

// ── Spiral waypoints ─────────────────────────────────────────────────────────

/**
 * Builds 81 waypoints {x, z, y, t} in local (centre = 0,0) space.
 * t ∈ [0, 1]:  t=0 is the start at Y=0, t=1 is the apex at Y=HELIX_HEIGHT.
 */
function buildSpiralWaypoints() {
    const R_max = (ISLAND_BOUNDS * 0.5) * SPIRAL_R_FRAC; // ~10.4 units at base
    const N = 120; // more points for the denser 2.5-turn path
    const pts = [];
    for (let i = 0; i <= N; i++) {
        const t     = i / N;
        const R     = R_max * (1 - t * 0.75); // corkscrew: full width at base → 25% at apex
        const angle = t * Math.PI * 2 * HELIX_TURNS;
        pts.push({ x: Math.cos(angle) * R, z: Math.sin(angle) * R, y: t * HELIX_HEIGHT, t });
    }
    return pts;
}

// ── Height function ───────────────────────────────────────────────────────────

/**
 * Returns the Y height for a vertex at local (vx, vz).
 * Cells on or near the spiral path get the exact spiral height.
 * Edge cells get the nearest waypoint height ± small organic noise.
 */
function getHelixVertexHeight(vx, vz, waypoints) {
    let minDist = Infinity;
    let nearestY = 0;
    for (const wp of waypoints) {
        const d = Math.hypot(vx - wp.x, vz - wp.z);
        if (d < minDist) { minDist = d; nearestY = wp.y; }
    }
    // Dungeon-style blocky noise (matches dungeon-generator.js height thresholds)
    const noiseVal = Math.sin(vx * 0.1) * Math.cos(vz * 0.1)
                   + Math.sin(vx * 0.3 + 1.2) * Math.cos(vz * 0.2 + 0.8);
    const baseH = noiseVal > 1.5 ? 2.5 : noiseVal > 0.8 ? 1.0
                : noiseVal < -1.2 ? -1.0 : 0;
    // Path cells: exact spiral height + tiny dungeon variation
    if (minDist <= PATH_FLATTEN) return nearestY + baseH * 0.2;
    // Off-path cells: flat dungeon terrain — no spiral height bleed
    return baseH;
}

// ── CA grid ───────────────────────────────────────────────────────────────────

/** Boolean grid marking cells that lie within PATH_FLATTEN of the spiral. */
function buildPathGrid(waypoints) {
    const cx = ISLAND_BOUNDS * 0.5;
    const cz = ISLAND_BOUNDS * 0.5;
    const pg = Array.from({ length: ISLAND_BOUNDS }, () => new Uint8Array(ISLAND_BOUNDS));
    for (let gz = 0; gz < ISLAND_BOUNDS; gz++) {
        for (let gx = 0; gx < ISLAND_BOUNDS; gx++) {
            const lx = gx - cx, lz = gz - cz;
            for (const wp of waypoints) {
                if (Math.hypot(lx - wp.x, lz - wp.z) < PATH_FLATTEN) { pg[gz][gx] = 1; break; }
            }
        }
    }
    return pg;
}

/**
 * Runs 3 CA iterations.
 * Path cells are never killed — guarantees a walkable lane along the spiral.
 */
function buildCAGrid(waypoints) {
    const cx       = ISLAND_BOUNDS * 0.5;
    const cz       = ISLAND_BOUNDS * 0.5;
    const islandR  = (ISLAND_BOUNDS * 0.5) * 0.85;
    const pathGrid = buildPathGrid(waypoints);

    // Initialise
    const alive = Array.from({ length: ISLAND_BOUNDS }, (_, gz) =>
        Array.from({ length: ISLAND_BOUNDS }, (_, gx) => {
            if (pathGrid[gz][gx]) return true;
            const d = Math.hypot(gx - cx, gz - cz);
            const p = d < islandR * 0.5 ? 0.75 : d < islandR ? CA_INIT_ALIVE : 0;
            return Math.random() < p;
        })
    );

    // 3 iterations
    for (let iter = 0; iter < 3; iter++) {
        const next = alive.map(row => [...row]);
        for (let gz = 1; gz < ISLAND_BOUNDS - 1; gz++) {
            for (let gx = 1; gx < ISLAND_BOUNDS - 1; gx++) {
                if (pathGrid[gz][gx]) { next[gz][gx] = true; continue; }
                let n = 0;
                for (let dz = -1; dz <= 1; dz++)
                    for (let dx = -1; dx <= 1; dx++)
                        if ((dx || dz) && alive[gz + dz]?.[gx + dx]) n++;
                next[gz][gx] = alive[gz][gx] ? n >= 3 : n > 4;
            }
        }
        for (let gz = 0; gz < ISLAND_BOUNDS; gz++)
            for (let gx = 0; gx < ISLAND_BOUNDS; gx++)
                alive[gz][gx] = next[gz][gx];
    }
    return alive;
}

// ── Geometry builder ──────────────────────────────────────────────────────────

/**
 * Pushes one solid prism (top quad + 4 side skirts) into the mutable
 * positions / indices arrays.  All faces use outward-pointing normals.
 *
 * Vertex layout — looking from above (+Y):
 *   A = back-left  (lx-0.5, hbl, lz+0.5)
 *   B = back-right (lx+0.5, hbr, lz+0.5)
 *   C = front-right(lx+0.5, hfr, lz-0.5)
 *   D = front-left (lx-0.5, hfl, lz-0.5)
 */
function addSolidPrism(positions, uvs, indices, lx, lz, hbl, hbr, hfr, hfl, tileIdx) {
    const b  = PRISM_BASE;
    const tw = 1.0 / 9;           // one cell = 1/9th of the sprite sheet width
    const u  = tileIdx * tw;      // u_min for this tile
    let vi;

    // Top face — normal +Y: A,B,C and A,C,D
    vi = positions.length / 3;
    positions.push(
        lx - 0.5, hbl, lz + 0.5,   // A
        lx + 0.5, hbr, lz + 0.5,   // B
        lx + 0.5, hfr, lz - 0.5,   // C
        lx - 0.5, hfl, lz - 0.5,   // D
    );
    uvs.push(u, 1,  u + tw, 1,  u + tw, 0,  u, 0);
    indices.push(vi, vi + 1, vi + 2,  vi, vi + 2, vi + 3);

    // Back skirt (+Z): Top-L(A), Bot-L, Bot-R, Top-R(B) → normal +Z
    vi = positions.length / 3;
    positions.push(
        lx - 0.5, hbl, lz + 0.5,
        lx - 0.5, b,   lz + 0.5,
        lx + 0.5, b,   lz + 0.5,
        lx + 0.5, hbr, lz + 0.5,
    );
    uvs.push(u, 1,  u, 0,  u + tw, 0,  u + tw, 1);
    indices.push(vi, vi + 1, vi + 2,  vi, vi + 2, vi + 3);

    // Right skirt (+X): Top-back(B), Bot-back, Bot-front, Top-front(C) → normal +X
    vi = positions.length / 3;
    positions.push(
        lx + 0.5, hbr, lz + 0.5,
        lx + 0.5, b,   lz + 0.5,
        lx + 0.5, b,   lz - 0.5,
        lx + 0.5, hfr, lz - 0.5,
    );
    uvs.push(u, 1,  u, 0,  u + tw, 0,  u + tw, 1);
    indices.push(vi, vi + 1, vi + 2,  vi, vi + 2, vi + 3);

    // Front skirt (-Z): Top-R(C), Bot-R, Bot-L, Top-L(D) → normal -Z
    vi = positions.length / 3;
    positions.push(
        lx + 0.5, hfr, lz - 0.5,
        lx + 0.5, b,   lz - 0.5,
        lx - 0.5, b,   lz - 0.5,
        lx - 0.5, hfl, lz - 0.5,
    );
    uvs.push(u, 1,  u, 0,  u + tw, 0,  u + tw, 1);
    indices.push(vi, vi + 1, vi + 2,  vi, vi + 2, vi + 3);

    // Left skirt (-X): Top-front(D), Bot-front, Bot-back, Top-back(A) → normal -X
    vi = positions.length / 3;
    positions.push(
        lx - 0.5, hfl, lz - 0.5,
        lx - 0.5, b,   lz - 0.5,
        lx - 0.5, b,   lz + 0.5,
        lx - 0.5, hbl, lz + 0.5,
    );
    uvs.push(u, 1,  u, 0,  u + tw, 0,  u + tw, 1);
    indices.push(vi, vi + 1, vi + 2,  vi, vi + 2, vi + 3);
}

// ── Exports ───────────────────────────────────────────────────────────────────

/** Cylindrical containment wall (mirrors addArenaWalls in battle-island.js). */
export function addHelixWalls(group, radius = 38) {
    const H   = HELIX_HEIGHT + 4;
    const mat = new THREE.MeshStandardMaterial({ color: 0x0d0808, roughness: 1.0, side: THREE.BackSide });
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, H, 40, 1, true), mat);
    wall.position.set(0, H * 0.5 - 2, 0);
    group.add(wall);
}

/**
 * Returns world-space Vector3 waypoints at given fractions along the spiral.
 * Useful for placing enemies at 25 / 50 / 75 % of the climb.
 */
export function getHelixCAWaypoints(fractions = [0.25, 0.5, 0.75]) {
    const wps = buildSpiralWaypoints();
    return fractions.map(t => {
        const idx = Math.min(Math.floor(t * wps.length), wps.length - 1);
        return new THREE.Vector3(
            HELIX_WORLD_POS.x + wps[idx].x,
            HELIX_WORLD_POS.y + wps[idx].y,
            HELIX_WORLD_POS.z + wps[idx].z,
        );
    });
}

/** Returns the world anchor used for camera tweens. */
export function getHelixCAanchor() {
    return HELIX_WORLD_POS.clone();
}

/**
 * Builds and adds the CA helix zone to the scene.
 *
 * @param {THREE.Scene} scene
 * @param {number}   floor       — current dungeon floor (material tint)
 * @param {Function} loadGLBFn   — loadGLB(path, cb, scale) from scoundrel-3d.js
 * @returns {{ group, floorGroup, exitPos, botPos, waypoints, getIslandY }}
 *
 *   group      — THREE.Group with all visuals; added to scene
 *   floorGroup — invisible clone for click-to-move / Y-snap raycasting
 *   exitPos    — world Vector3 of apex platform (door proximity trigger)
 *   botPos     — world Vector3 of player spawn (bottom of spiral)
 *   waypoints  — [3] world Vector3s at 25 / 50 / 75 % for enemy placement
 *   getIslandY — fn(wx, wz) → world Y on terrain surface (for enemy Y-placement)
 */
export function createHelixCA(scene, floor, loadGLBFn, loadTexture, getClonedTexture) {
    const group      = new THREE.Group();
    const floorGroup = new THREE.Group();   // raycasting only — invisible
    group.position.copy(HELIX_WORLD_POS);
    floorGroup.position.copy(HELIX_WORLD_POS);
    scene.add(group);
    scene.add(floorGroup);

    const waypoints = buildSpiralWaypoints();
    const aliveGrid = buildCAGrid(waypoints);
    const cx = ISLAND_BOUNDS * 0.5;
    const cz = ISLAND_BOUNDS * 0.5;

    // ── Themed tile texture (same sheet as dungeon floor for this floor) ──────
    const theme   = getThemeForFloor(floor);
    const tileTex = (typeof getClonedTexture === 'function')
        ? getClonedTexture(theme.sheet || 'assets/images/block.png')
        : null;

    // ── Merged floor mesh ─────────────────────────────────────────────────────
    const stoneMat = new THREE.MeshStandardMaterial({ map: tileTex, roughness: 0.9 });

    const positions = [];
    const uvs       = [];
    const indices   = [];

    for (let gz = 1; gz < ISLAND_BOUNDS - 1; gz++) {
        for (let gx = 1; gx < ISLAND_BOUNDS - 1; gx++) {
            if (!aliveGrid[gz][gx]) continue;
            const lx      = gx - cx;
            const lz      = gz - cz;
            const hbl     = getHelixVertexHeight(lx - 0.5, lz + 0.5, waypoints);
            const hbr     = getHelixVertexHeight(lx + 0.5, lz + 0.5, waypoints);
            const hfr     = getHelixVertexHeight(lx + 0.5, lz - 0.5, waypoints);
            const hfl     = getHelixVertexHeight(lx - 0.5, lz - 0.5, waypoints);
            const tileIdx = Math.floor(Math.random() * 9);
            addSolidPrism(positions, uvs, indices, lx, lz, hbl, hbr, hfr, hfl, tileIdx);
        }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv',       new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const floorMesh = new THREE.Mesh(geo, stoneMat);
    group.add(floorMesh);

    // Invisible raycast clone
    const floorMeshRay = floorMesh.clone();
    floorMeshRay.visible = false;
    floorGroup.add(floorMeshRay);

    // ── Apex platform ─────────────────────────────────────────────────────────
    const apexWp  = waypoints[waypoints.length - 1];
    const apexLoc = new THREE.Vector3(apexWp.x, apexWp.y, apexWp.z);

    const topMat = new THREE.MeshStandardMaterial({
        color: 0x2a0e4a, roughness: 0.8,
        emissive: new THREE.Color(0x6600cc), emissiveIntensity: 0.6,
    });
    const topPlat = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 0.4, 16), topMat);
    topPlat.position.set(apexLoc.x, apexLoc.y + 0.2, apexLoc.z);
    group.add(topPlat);
    const topPlatRay = topPlat.clone(); topPlatRay.visible = false;
    floorGroup.add(topPlatRay);

    // Purple beam
    const beamMat = new THREE.MeshBasicMaterial({
        color: 0xaa44ff, transparent: true, opacity: 0.55, side: THREE.BackSide,
    });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.7, 8, 8, 1, true), beamMat);
    beam.position.set(apexLoc.x, apexLoc.y + 5, apexLoc.z);
    group.add(beam);

    // Purple point light at apex
    const exitLight = new THREE.PointLight(0x6600cc, 4.0, 22);
    exitLight.position.set(apexLoc.x, apexLoc.y + 4, apexLoc.z);
    group.add(exitLight);

    // Door GLB at apex (async load — trigger fires on proximity regardless)
    if (typeof loadGLBFn === 'function') {
        loadGLBFn('assets/images/glb/door-web.glb', (model) => {
            model.position.set(apexLoc.x, apexLoc.y + 0.4, apexLoc.z);
            model.scale.setScalar(0.8);
            group.add(model);
        }, 0.8);
    }

    // ── Bottom spawn platform ─────────────────────────────────────────────────
    const botWp  = waypoints[0];
    const botLoc = new THREE.Vector3(botWp.x, botWp.y, botWp.z);

    const botPlat = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 0.4, 16), stoneMat);
    botPlat.position.set(botLoc.x, botLoc.y + 0.2, botLoc.z);
    group.add(botPlat);
    const botPlatRay = botPlat.clone(); botPlatRay.visible = false;
    floorGroup.add(botPlatRay);

    // ── Lighting ──────────────────────────────────────────────────────────────
    const dir = new THREE.DirectionalLight(0xffffff, 2.5);
    dir.position.set(8, 25, 8);
    group.add(dir);
    group.add(dir.target);
    group.add(new THREE.AmbientLight(0xffffff, 0.5));
    group.add(new THREE.HemisphereLight(0xbbaaff, 0x221111, 0.7));

    // ── getIslandY helper ─────────────────────────────────────────────────────
    const _helixRaycaster = new THREE.Raycaster();
    const _downVec        = new THREE.Vector3(0, -1, 0);

    /**
     * Given world-space (wx, wz), returns the world Y of the helix terrain.
     * Used for placing wanderers at the correct height.
     */
    function getIslandY(wx, wz) {
        _helixRaycaster.set(
            new THREE.Vector3(wx, HELIX_WORLD_POS.y + HELIX_HEIGHT + 5, wz),
            _downVec
        );
        const hits = _helixRaycaster.intersectObject(floorGroup, true);
        return hits.length > 0 ? hits[0].point.y : HELIX_WORLD_POS.y;
    }

    // ── Return values ─────────────────────────────────────────────────────────
    const exitPos = new THREE.Vector3(
        HELIX_WORLD_POS.x + apexLoc.x,
        HELIX_WORLD_POS.y + apexLoc.y,
        HELIX_WORLD_POS.z + apexLoc.z,
    );
    const botPos = new THREE.Vector3(
        HELIX_WORLD_POS.x + botLoc.x,
        HELIX_WORLD_POS.y + botLoc.y + 0.5,
        HELIX_WORLD_POS.z + botLoc.z,
    );

    // Enemy spawn positions at 25 / 50 / 75 % of the climb
    const enemyWaypoints = [0.25, 0.5, 0.75].map(t => {
        const idx = Math.floor(t * waypoints.length);
        const wp  = waypoints[idx];
        return new THREE.Vector3(
            HELIX_WORLD_POS.x + wp.x,
            HELIX_WORLD_POS.y + wp.y,
            HELIX_WORLD_POS.z + wp.z,
        );
    });

    // Full path in world space — used by scoundrel-3d.js to snap movement to the spiral
    const allWaypoints = waypoints.map(wp => new THREE.Vector3(
        HELIX_WORLD_POS.x + wp.x,
        HELIX_WORLD_POS.y + wp.y,
        HELIX_WORLD_POS.z + wp.z,
    ));

    return { group, floorGroup, exitPos, botPos, waypoints: enemyWaypoints, allWaypoints, getIslandY };
}
