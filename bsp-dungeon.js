/**
 * bsp-dungeon.js
 * BSP dungeon generator — produces Three.js geometry + a game-compatible
 * room graph for Dungeon Break.
 *
 * Exported:
 *   generateBSPFloor(scene, floor, rng, loadTexture, getClonedTexture)
 *     → { rooms, mesh }
 *       rooms — array compatible with game.rooms[]
 *       mesh  — merged floor THREE.Mesh for raycasting (click-to-move + Y snap)
 *
 * Tile legend:  0=empty  1=room  2=corridor  3=wall
 *
 * World coords: BSP grid is centered on world origin.
 *   world_x = col - COLS/2,  world_z = row - ROWS/2
 */

import * as THREE from 'three';
import { getThemeForFloor, shuffle } from './dungeon-generator.js';

// ─── Constants ───────────────────────────────────────────────────────────────

const TILE_EMPTY    = 0;
const TILE_ROOM     = 1;
const TILE_CORRIDOR = 2;
const TILE_WALL     = 3;

const VERT  = 0;
const HORIZ = 1;

const CORRIDOR_W  = 2;   // corridor width in tiles — matches 2-unit door model width
const WALL_HEIGHT = 2.5; // world units
const FLOOR_BASE  = -3;  // skirt depth below y=0

// ─── Grid parameters by floor ────────────────────────────────────────────────

function gridParams(floor) {
    if (floor <= 3) return { cols: 64, rows: 64, iterations: 6, minChunk: 10 };
    if (floor <= 6) return { cols: 80, rows: 80, iterations: 7, minChunk: 10 };
    return              { cols: 96, rows: 96, iterations: 8, minChunk: 10 };
}

// ─── BSP Node ────────────────────────────────────────────────────────────────

class BSPNode {
    constructor(chunk, rng) {
        // chunk: { x, y, w, h, minRatio, maxRatio, minChunk }
        this.chunk    = chunk;
        this.left     = null;
        this.right    = null;
        this.room     = null;  // { x, y, w, h } grid coords of leaf room
        this.paths    = [];    // [{ x, y, w, h }] corridor rects
        this.isSplit  = false;
        this.splitDir = VERT;
        this.conn     = null;  // { a: room, b: room } — direct connection made here
        this.rng      = rng;
    }

    rand(min, max) {
        return Math.floor(this.rng() * (max - min + 1)) + min;
    }

    split(depth) {
        this.isSplit = true;
        const { x, y, w, h, minRatio, maxRatio, minChunk } = this.chunk;

        // Pick split direction — force based on aspect ratio
        let dir = this.rng() > 0.5 ? VERT : HORIZ;
        const ratio = w / h;
        if (ratio <= minRatio) dir = HORIZ;
        else if (ratio >= maxRatio) dir = VERT;
        this.splitDir = dir;

        // Offset within ±25% of centre
        const off = dir === VERT
            ? this.rand(-Math.floor(w / 4), Math.floor(w / 4))
            : this.rand(-Math.floor(h / 4), Math.floor(h / 4));

        const base = { minRatio, maxRatio, minChunk };

        const lc = dir === VERT
            ? { x, y, w: Math.floor(w / 2) + off, h,                         ...base }
            : { x, y, w,                           h: Math.floor(h / 2) + off, ...base };

        const rc = dir === VERT
            ? { x: x + Math.floor(w / 2) + off, y, w: Math.ceil(w / 2) - off, h,                          ...base }
            : { x, y: y + Math.floor(h / 2) + off, w,                           h: Math.ceil(h / 2) - off, ...base };

        this.left  = new BSPNode(lc, this.rng);
        this.right = new BSPNode(rc, this.rng);

        if (depth > 0) {
            if (lc.w >= minChunk && lc.h >= minChunk) this.left.split(depth - 1);
            if (rc.w >= minChunk && rc.h >= minChunk) this.right.split(depth - 1);
        }
    }

    generateRooms() {
        if (!this.isSplit) {
            const { x, y, w, h } = this.chunk;
            // Room occupies 60–70% of chunk, offset by 20–25% from corner
            const ox = this.rand(Math.floor(w * 0.2), Math.floor(w * 0.25));
            const oy = this.rand(Math.floor(h * 0.2), Math.floor(h * 0.25));
            const rw = this.rand(Math.floor(w * 0.6), Math.floor(w * 0.7));
            const rh = this.rand(Math.floor(h * 0.6), Math.floor(h * 0.7));
            this.room = { x: x + ox, y: y + oy, w: Math.max(4, rw), h: Math.max(4, rh) };
        }
        if (this.left)  this.left.generateRooms();
        if (this.right) this.right.generateRooms();
    }

    // Returns any one leaf room from this subtree (for path connections)
    getLeafRoom() {
        if (this.room) return this.room;
        const l = this.left  ? this.left.getLeafRoom()  : null;
        const r = this.right ? this.right.getLeafRoom() : null;
        return l || r;
    }

    createPaths() {
        if (this.left && this.right) {
            const a = this.left.getLeafRoom();
            const b = this.right.getLeafRoom();
            if (a && b) {
                // L-shaped corridor: horizontal run from a's centre, then vertical to b's centre
                const ax = Math.floor(a.x + a.w / 2);
                const ay = Math.floor(a.y + a.h / 2);
                const bx = Math.floor(b.x + b.w / 2);
                const by = Math.floor(b.y + b.h / 2);
                const hw = Math.abs(bx - ax) + CORRIDOR_W;
                const hx = Math.min(ax, bx);
                const hy = ay - Math.floor(CORRIDOR_W / 2);
                const vh = Math.abs(by - ay) + CORRIDOR_W;
                const vx = bx - Math.floor(CORRIDOR_W / 2);
                const vy = Math.min(ay, by);
                this.paths.push(
                    { x: hx, y: hy, w: hw, h: CORRIDOR_W },   // horizontal arm
                    { x: vx, y: vy, w: CORRIDOR_W, h: vh }    // vertical arm
                );
                this.conn = { a, b };
            }
            this.left.createPaths();
            this.right.createPaths();
        }
    }

    getAllRooms() {
        const arr = this.room ? [this.room] : [];
        if (this.left)  arr.push(...this.left.getAllRooms());
        if (this.right) arr.push(...this.right.getAllRooms());
        return arr;
    }

    getAllPaths() {
        const arr = [...this.paths];
        if (this.left)  arr.push(...this.left.getAllPaths());
        if (this.right) arr.push(...this.right.getAllPaths());
        return arr;
    }

    getAllConnections() {
        const arr = this.conn ? [this.conn] : [];
        if (this.left)  arr.push(...this.left.getAllConnections());
        if (this.right) arr.push(...this.right.getAllConnections());
        return arr;
    }
}

// ─── Tile grid ────────────────────────────────────────────────────────────────

function buildTileGrid(cols, rows, rooms, paths) {
    const grid = Array.from({ length: rows }, () => new Uint8Array(cols).fill(TILE_EMPTY));

    const set = (r, c, val) => {
        if (r >= 0 && r < rows && c >= 0 && c < cols) grid[r][c] = val;
    };

    // 1. Wall border around every room and corridor (prevents open edges)
    rooms.forEach(room => {
        for (let r = room.y - 1; r < room.y + room.h + 1; r++)
            for (let c = room.x - 1; c < room.x + room.w + 1; c++)
                set(r, c, TILE_WALL);
    });
    paths.forEach(p => {
        for (let r = p.y - 1; r < p.y + p.h + 1; r++)
            for (let c = p.x - 1; c < p.x + p.w + 1; c++)
                set(r, c, TILE_WALL);
    });

    // 2. Corridor floor (overrides wall)
    paths.forEach(p => {
        for (let r = p.y; r < p.y + p.h; r++)
            for (let c = p.x; c < p.x + p.w; c++)
                if (r > 0 && r < rows - 1 && c > 0 && c < cols - 1)
                    set(r, c, TILE_CORRIDOR);
    });

    // 3. Room floor (overrides corridor/wall, inset 1 tile from border)
    rooms.forEach(room => {
        const rs = room.h > 3 ? room.y + 1 : room.y;
        const re = room.h > 3 ? room.y + room.h - 1 : room.y + room.h;
        const cs = room.w > 3 ? room.x + 1 : room.x;
        const ce = room.w > 3 ? room.x + room.w - 1 : room.x + room.w;
        for (let r = rs; r < re; r++)
            for (let c = cs; c < ce; c++)
                if (r > 0 && r < rows - 1 && c > 0 && c < cols - 1)
                    set(r, c, TILE_ROOM);
    });

    return grid;
}

// ─── Three.js geometry ───────────────────────────────────────────────────────

/**
 * Build one merged floor mesh (ROOM + CORRIDOR tiles) and one merged wall mesh
 * (WALL tiles), add both to scene.  Returns the floor mesh for raycasting.
 */
function buildSceneGeometry(scene, floor, tileGrid, cols, rows, getClonedTexture, rng, outDecorations) {
    const theme = getThemeForFloor(floor);
    const ox = cols / 2;  // world offset — centres grid on origin
    const oz = rows / 2;

    // ── Shared helpers ────────────────────────────────────────────────────────

    const floorPos = [], floorUVs = [], floorIdx = [];
    const wallPos  = [], wallUVs  = [], wallIdx  = [];
    const voidPos  = [], voidUVs  = [], voidIdx  = [];
    let fv = 0, wv = 0, vv = 0; // vertex counters

    function pushQuad(parr, uvArr, idxArr, vc, v0, v1, v2, v3, u, tw) {
        parr.push(...v0, ...v1, ...v2, ...v3);
        uvArr.push(u, 1,  u + tw, 1,  u + tw, 0,  u, 0);
        idxArr.push(vc, vc+1, vc+2,  vc, vc+2, vc+3);
        return vc + 4;
    }

    // ── Floor tiles ───────────────────────────────────────────────────────────

    const tw = 1 / 9;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const t = tileGrid[r][c];
            if (t !== TILE_ROOM && t !== TILE_CORRIDOR) continue;

            const wx = c - ox;      // world X
            const wz = r - oz;      // world Z
            const u  = Math.floor(Math.random() * 9) * tw;

            // Top face
            fv = pushQuad(floorPos, floorUVs, floorIdx, fv,
                [wx - 0.5, 0, wz + 0.5], [wx + 0.5, 0, wz + 0.5],
                [wx + 0.5, 0, wz - 0.5], [wx - 0.5, 0, wz - 0.5],
                u, tw);

            // Side skirts (keep floor watertight against the wall bases)
            // Front (-Z)
            fv = pushQuad(floorPos, floorUVs, floorIdx, fv,
                [wx - 0.5, 0, wz - 0.5], [wx + 0.5, 0, wz - 0.5],
                [wx + 0.5, FLOOR_BASE, wz - 0.5], [wx - 0.5, FLOOR_BASE, wz - 0.5],
                u, tw);
            // Back (+Z)
            fv = pushQuad(floorPos, floorUVs, floorIdx, fv,
                [wx + 0.5, 0, wz + 0.5], [wx - 0.5, 0, wz + 0.5],
                [wx - 0.5, FLOOR_BASE, wz + 0.5], [wx + 0.5, FLOOR_BASE, wz + 0.5],
                u, tw);
            // Left (-X)
            fv = pushQuad(floorPos, floorUVs, floorIdx, fv,
                [wx - 0.5, 0, wz + 0.5], [wx - 0.5, 0, wz - 0.5],
                [wx - 0.5, FLOOR_BASE, wz - 0.5], [wx - 0.5, FLOOR_BASE, wz + 0.5],
                u, tw);
            // Right (+X)
            fv = pushQuad(floorPos, floorUVs, floorIdx, fv,
                [wx + 0.5, 0, wz - 0.5], [wx + 0.5, 0, wz + 0.5],
                [wx + 0.5, FLOOR_BASE, wz + 0.5], [wx + 0.5, FLOOR_BASE, wz - 0.5],
                u, tw);
        }
    }

    // ── Wall tiles ────────────────────────────────────────────────────────────
    // Only draw wall faces that are visible (adjacent to a floor tile)

    const H = WALL_HEIGHT;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (tileGrid[r][c] !== TILE_WALL) continue;

            const wx = c - ox;
            const wz = r - oz;
            const u  = Math.floor(Math.random() * 9) * tw;

            // Top cap
            wv = pushQuad(wallPos, wallUVs, wallIdx, wv,
                [wx - 0.5, H, wz + 0.5], [wx + 0.5, H, wz + 0.5],
                [wx + 0.5, H, wz - 0.5], [wx - 0.5, H, wz - 0.5],
                u, tw);

            // Emit a side face for every neighbour that is NOT another wall tile
            // (covers both inward faces toward floor/corridor and outward faces toward void)
            const neighbours = [
                { dr: 0, dc: -1, ax: wx - 0.5, az1: wz - 0.5, az2: wz + 0.5, dir: '-X' },
                { dr: 0, dc:  1, ax: wx + 0.5, az1: wz + 0.5, az2: wz - 0.5, dir: '+X' },
                { dr: -1, dc: 0, az: wz - 0.5, ax1: wx + 0.5, ax2: wx - 0.5, dir: '-Z' },
                { dr:  1, dc: 0, az: wz + 0.5, ax1: wx - 0.5, ax2: wx + 0.5, dir: '+Z' },
            ];

            for (const n of neighbours) {
                const nr = r + n.dr, nc = c + n.dc;
                const nt = (nr >= 0 && nr < rows && nc >= 0 && nc < cols)
                    ? tileGrid[nr][nc] : TILE_EMPTY;
                if (nt === TILE_WALL) continue; // wall-to-wall edge: interior, never visible

                // Emit inward-facing side face
                if (n.dir === '-X') {
                    wv = pushQuad(wallPos, wallUVs, wallIdx, wv,
                        [n.ax, H, n.az2], [n.ax, H, n.az1],
                        [n.ax, 0, n.az1], [n.ax, 0, n.az2],
                        u, tw);
                } else if (n.dir === '+X') {
                    wv = pushQuad(wallPos, wallUVs, wallIdx, wv,
                        [n.ax, H, n.az2], [n.ax, H, n.az1],
                        [n.ax, 0, n.az1], [n.ax, 0, n.az2],
                        u, tw);
                } else if (n.dir === '-Z') {
                    wv = pushQuad(wallPos, wallUVs, wallIdx, wv,
                        [n.ax2, H, n.az], [n.ax1, H, n.az],
                        [n.ax1, 0, n.az], [n.ax2, 0, n.az],
                        u, tw);
                } else { // +Z — reversed winding so normal points +Z toward floor
                    wv = pushQuad(wallPos, wallUVs, wallIdx, wv,
                        [n.ax2, H, n.az], [n.ax1, H, n.az],
                        [n.ax1, 0, n.az], [n.ax2, 0, n.az],
                        u, tw);
                }
            }
        }
    }

    // ── Void caps ─────────────────────────────────────────────────────────────
    // Cap EMPTY tiles that border the dungeon so gaps between passages look solid
    // from above (top surface at wall height, same stone texture but darker tint)

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (tileGrid[r][c] !== TILE_EMPTY) continue;

            // Only cap empty tiles that touch at least one non-empty tile
            const borders =
                (r > 0      && tileGrid[r - 1][c] !== TILE_EMPTY) ||
                (r < rows-1 && tileGrid[r + 1][c] !== TILE_EMPTY) ||
                (c > 0      && tileGrid[r][c - 1] !== TILE_EMPTY) ||
                (c < cols-1 && tileGrid[r][c + 1] !== TILE_EMPTY);
            if (!borders) continue;

            const wx = c - ox;
            const wz = r - oz;
            const u  = Math.floor(Math.random() * 9) * tw;

            vv = pushQuad(voidPos, voidUVs, voidIdx, vv,
                [wx - 0.5, H, wz + 0.5], [wx + 0.5, H, wz + 0.5],
                [wx + 0.5, H, wz - 0.5], [wx - 0.5, H, wz - 0.5],
                u, tw);
        }
    }

    // ── Decorations ───────────────────────────────────────────────────────────
    // Door frames at corridor-room boundaries + scattered rubble (visual only)

    function addBox(cx, cy, cz, sx, sy, sz, u) {
        // Top
        wv = pushQuad(wallPos, wallUVs, wallIdx, wv,
            [cx-sx, cy+sy, cz+sz], [cx+sx, cy+sy, cz+sz],
            [cx+sx, cy+sy, cz-sz], [cx-sx, cy+sy, cz-sz], u, tw);
        // Front (-Z)
        wv = pushQuad(wallPos, wallUVs, wallIdx, wv,
            [cx-sx, cy+sy, cz-sz], [cx+sx, cy+sy, cz-sz],
            [cx+sx, cy-sy, cz-sz], [cx-sx, cy-sy, cz-sz], u, tw);
        // Back (+Z)
        wv = pushQuad(wallPos, wallUVs, wallIdx, wv,
            [cx+sx, cy+sy, cz+sz], [cx-sx, cy+sy, cz+sz],
            [cx-sx, cy-sy, cz+sz], [cx+sx, cy-sy, cz+sz], u, tw);
        // Left (-X)
        wv = pushQuad(wallPos, wallUVs, wallIdx, wv,
            [cx-sx, cy+sy, cz+sz], [cx-sx, cy+sy, cz-sz],
            [cx-sx, cy-sy, cz-sz], [cx-sx, cy-sy, cz+sz], u, tw);
        // Right (+X)
        wv = pushQuad(wallPos, wallUVs, wallIdx, wv,
            [cx+sx, cy+sy, cz-sz], [cx+sx, cy+sy, cz+sz],
            [cx+sx, cy-sy, cz+sz], [cx+sx, cy-sy, cz-sz], u, tw);
    }

    // Helper to check if a neighbor corridor tile borders the same room in direction (dr,dc)
    const isRun = (tr, tc, dr, dc) => {
        if (tr < 0 || tr >= rows || tc < 0 || tc >= cols) return false;
        if (tileGrid[tr][tc] !== TILE_CORRIDOR) return false;
        const rr = tr + dr, rc = tc + dc;
        if (rr < 0 || rr >= rows || rc < 0 || rc >= cols) return false;
        return tileGrid[rr][rc] === TILE_ROOM;
    };

    for (let r = 1; r < rows - 1; r++) {
        for (let c = 1; c < cols - 1; c++) {
            if (tileGrid[r][c] !== TILE_CORRIDOR) continue;

            const wx = c - ox;
            const wz = r - oz;
            const u  = Math.floor(rng() * 9) * tw;  // seeded UV
            let placedDoor = false;

            // Check 4 directions for room adjacency (corridor entrance = door frame)
            const checkDirs = [
                { dr: -1, dc: 0, axis: 'x' }, // North
                { dr:  1, dc: 0, axis: 'x' }, // South
                { dr:  0, dc: -1, axis: 'z' }, // West
                { dr:  0, dc:  1, axis: 'z' }  // East
            ];

            for (const d of checkDirs) {
                const rr = r + d.dr, rc = c + d.dc;
                if (rr < 0 || rr >= rows || rc < 0 || rc >= cols) continue;
                if (tileGrid[rr][rc] !== TILE_ROOM) continue;

                // Scan perpendicular to find how many corridor tiles share this doorway
                let runLen = 1;
                let hasPrev = false;
                let hasNext = false;

                if (d.axis === 'x') {
                    let i = 1; while (isRun(r, c - i, d.dr, d.dc)) { runLen++; i++; }
                    if (i > 1) hasPrev = true;
                    i = 1; while (isRun(r, c + i, d.dr, d.dc)) { runLen++; i++; }
                    if (i > 1) hasNext = true;
                } else {
                    let i = 1; while (isRun(r - i, c, d.dr, d.dc)) { runLen++; i++; }
                    if (i > 1) hasPrev = true;
                    i = 1; while (isRun(r + i, c, d.dr, d.dc)) { runLen++; i++; }
                    if (i > 1) hasNext = true;
                }

                if (runLen > 2) continue; // skip unusually wide openings

                placedDoor = true;
                const ph = 2.2, pw = 0.15, pd = 0.15;

                if (d.axis === 'x') {
                    if (!hasPrev) addBox(wx - 0.4, ph/2, wz, pw/2, ph/2, pd/2, u);
                    if (!hasNext) addBox(wx + 0.4, ph/2, wz, pw/2, ph/2, pd/2, u);
                    // Lintel only on the first (leftmost) tile of the run — prevents doubling
                    if (!hasPrev) addBox(wx + (hasNext ? 0.5 : 0), ph, wz, (runLen === 2 ? 1.0 : 0.5), 0.1, pd/2, u);
                } else {
                    if (!hasPrev) addBox(wx, ph/2, wz - 0.4, pd/2, ph/2, pw/2, u);
                    if (!hasNext) addBox(wx, ph/2, wz + 0.4, pd/2, ph/2, pw/2, u);
                    // Lintel only on the first (topmost) tile of the run
                    if (!hasPrev) addBox(wx, ph, wz + (hasNext ? 0.5 : 0), pd/2, 0.1, (runLen === 2 ? 1.0 : 0.5), u);
                }
            }

            // Corridor pillar — position tracked; InstancedMesh built by spawnBSPDecorations()
            if (!placedDoor && rng() < 0.10) {
                outDecorations.push({ x: wx, z: wz, type: 'pillar' });
            }
        }
    }

    // ── Room rubble ───────────────────────────────────────────────────────────
    // Positions tracked; InstancedMesh rubble built by spawnBSPDecorations()

    for (let r = 1; r < rows - 1; r++) {
        for (let c = 1; c < cols - 1; c++) {
            if (tileGrid[r][c] !== TILE_ROOM) continue;
            if (rng() > 0.025) continue; // ~2.5% of room tiles
            outDecorations.push({ x: c - ox, z: r - oz, type: 'rubble' });
        }
    }

    // ── Textures & materials ──────────────────────────────────────────────────

    const floorTex = getClonedTexture(theme.sheet || 'assets/images/block.png');
    floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;

    const wallTex  = getClonedTexture(theme.sheet || 'assets/images/block.png');
    wallTex.wrapS  = wallTex.wrapT  = THREE.RepeatWrapping;

    const voidTex  = getClonedTexture(theme.sheet || 'assets/images/block.png');
    voidTex.wrapS  = voidTex.wrapT  = THREE.RepeatWrapping;

    const floorMat = new THREE.MeshStandardMaterial({
        map: floorTex, roughness: 0.85, metalness: 0.05, side: THREE.FrontSide,
    });
    const wallMat = new THREE.MeshStandardMaterial({
        map: wallTex, color: 0x72728c, roughness: 1.0, metalness: 0.0, side: THREE.DoubleSide,
    });
    // Void cap: deep cool indigo so gaps read as solid ancient rock
    const voidMat = new THREE.MeshStandardMaterial({
        map: voidTex, color: 0x181828, roughness: 1.0, metalness: 0.0, side: THREE.FrontSide,
    });

    // ── Build meshes ──────────────────────────────────────────────────────────

    function makeMesh(posArr, uvArr, idxArr, mat) {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(posArr, 3));
        geo.setAttribute('uv',       new THREE.Float32BufferAttribute(uvArr,  2));
        geo.setIndex(idxArr);
        geo.computeVertexNormals();
        const mesh = new THREE.Mesh(geo, mat);
        mesh.receiveShadow = true;
        mesh.matrixAutoUpdate = false;
        mesh.updateMatrix();
        return mesh;
    }

    const floorMesh = makeMesh(floorPos, floorUVs, floorIdx, floorMat);
    const wallMesh  = makeMesh(wallPos,  wallUVs,  wallIdx,  wallMat);

    scene.add(floorMesh);
    scene.add(wallMesh);

    if (voidPos.length > 0) {
        scene.add(makeMesh(voidPos, voidUVs, voidIdx, voidMat));
    }

    return floorMesh; // returned for raycasting
}

// ─── Game room graph ─────────────────────────────────────────────────────────

/**
 * Converts raw BSP rooms + connections into game.rooms[] compatible objects.
 * Assigns specials: isFinal (boss), isBonfire, isSpecial (merchant), isTrap, etc.
 */
function buildRoomGraph(bspRooms, connections, cols, rows) {
    const ox = cols / 2, oz = rows / 2;

    // Give each BSP room a stable gx/gy world centre
    bspRooms.forEach((r, i) => {
        r._id = i;
        r._gx = (r.x + r.w / 2) - ox;
        r._gz = (r.y + r.h / 2) - oz;
    });

    // Build game room objects
    const gameRooms = bspRooms.map((r, i) => ({
        id: i,
        gx: r._gx, gy: r._gz,
        w: 1, h: 1,
        state: i === 0 ? 'cleared' : 'uncleared',
        cards: [], connections: [],
        isWaypoint: false, isRevealed: i === 0,
        isSpecial: false, isBonfire: false, isFinal: false,
        isTrap: false, isLocked: false, isAlchemy: false,
        shape: ['rect', 'rect', 'round', 'dome'][Math.floor(Math.random() * 4)],
        depth: 1.5 + Math.random() * 2,
        restRemaining: 3,
    }));

    let idCounter = gameRooms.length;

    // Add waypoints between every connected pair
    connections.forEach(({ a, b }) => {
        const ga = gameRooms[a._id];
        const gb = gameRooms[b._id];
        if (!ga || !gb) return;

        // Single midpoint waypoint
        const wp = {
            id: `wp_${ga.id}_${gb.id}`,
            gx: (ga.gx + gb.gx) / 2,
            gy: (ga.gy + gb.gy) / 2,
            state: 'cleared', cards: [], connections: [ga.id, gb.id],
            isWaypoint: true, isRevealed: false,
        };
        ga.connections.push(wp.id);
        gb.connections.push(wp.id);
        gameRooms.push(wp);
        idCounter++;
    });

    // ── Assign specials ───────────────────────────────────────────────────────

    const real = gameRooms.filter(r => !r.isWaypoint);

    // Boss room: furthest from start (id 0)
    const dists = real.map(r => Math.hypot(r.gx, r.gy));
    const bossIdx = dists.indexOf(Math.max(...dists));
    if (bossIdx !== -1) real[bossIdx].isFinal = true;

    const pool = shuffle(real.filter(r => r.id !== 0 && !r.isFinal));

    // Bonfire — uses dungeon-obelisk GLB in BSP mode (not the large campfire tower)
    if (pool.length > 0) pool.pop().isBonfire = true;

    // Merchants (scale with floor count)
    const merchantCount = gameRooms.length <= 14 ? 2 : gameRooms.length <= 22 ? 1 : 0;
    for (let i = 0; i < merchantCount && pool.length > 0; i++) {
        const m = pool.pop(); m.isSpecial = true; m.generatedContent = null;
    }

    // Traps
    const trapPool = pool.filter(r => !r.isSpecial && !r.isBonfire);
    shuffle(trapPool);
    const trapCount = 1 + (Math.random() > 0.5 ? 1 : 0);
    for (let i = 0; i < trapCount && trapPool.length > 0; i++) trapPool.pop().isTrap = true;

    // Alchemy room
    const alchPool = pool.filter(r => !r.isSpecial && !r.isBonfire && !r.isTrap);
    shuffle(alchPool);
    if (alchPool.length > 0) { alchPool[0].isAlchemy = true; alchPool[0].potionUsesLeft = 2; }

    // Fountains (1-2 per floor) — one-time HP restore
    const fontPool = real.filter(r => r.id !== 0 && !r.isFinal && !r.isSpecial && !r.isBonfire && !r.isTrap && !r.isAlchemy);
    shuffle(fontPool);
    const fountainCount = 1 + (Math.random() > 0.6 ? 1 : 0);
    for (let i = 0; i < fountainCount && fontPool.length > 0; i++) {
        fontPool[i].isFountain = true;
        fontPool[i].fountainUsed = false;
    }

    // Locked rooms (1-2)
    const lockPool = real.filter(r => r.id !== 0 && !r.isFinal && !r.isSpecial && !r.isBonfire && !r.isTrap);
    shuffle(lockPool);
    const lockCount = 1 + (Math.random() > 0.5 ? 1 : 0);
    for (let i = 0; i < lockCount && lockPool.length > 0; i++) lockPool[i].isLocked = true;

    // Start room
    gameRooms[0].isShrine = true;
    gameRooms[0].isRevealed = true;

    return gameRooms;
}

// ─── Door positions ───────────────────────────────────────────────────────────

/**
 * Scan the tile grid for corridor-room boundaries and return door spawn data.
 * Returns [{x, z, rotY}] in world coords.  Max ~30 doors per floor.
 */
function findDoorPositions(tileGrid, cols, rows) { // eslint-disable-line no-unused-vars
    return []; // Doors disabled — arch model doesn't work well in corridors
    const ox = cols / 2, oz = rows / 2;
    const placed = [];          // [{r,c}] for spacing checks
    const doors  = [];

    for (let r = 1; r < rows - 1; r++) {
        for (let c = 1; c < cols - 1; c++) {
            if (tileGrid[r][c] !== TILE_CORRIDOR) continue;

            // Must be adjacent to a ROOM tile (corridor entrance)
            const adjRoom =
                tileGrid[r][c - 1] === TILE_ROOM || tileGrid[r][c + 1] === TILE_ROOM ||
                tileGrid[r - 1][c] === TILE_ROOM || tileGrid[r + 1][c] === TILE_ROOM;
            if (!adjRoom) continue;

            // Enforce minimum spacing — keep doors well separated so none cluster
            let tooClose = false;
            for (const p of placed) {
                if (Math.abs(r - p.r) + Math.abs(c - p.c) < 8) { tooClose = true; break; }
            }
            if (tooClose) continue;

            // Skip corners where both axes have corridor neighbours (messy placement)
            const hasH = tileGrid[r][c - 1] === TILE_CORRIDOR || tileGrid[r][c + 1] === TILE_CORRIDOR;
            const hasV = tileGrid[r - 1][c] === TILE_CORRIDOR || tileGrid[r + 1][c] === TILE_CORRIDOR;
            if (hasH && hasV) continue;

            // Rotation: door should face perpendicular to corridor travel direction
            const rotY = hasH ? Math.PI / 2 : 0;

            placed.push({ r, c });
            doors.push({ x: c - ox, z: r - oz, rotY });

            if (doors.length >= 12) return doors; // cap
        }
    }
    return doors;
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * @param {THREE.Scene} scene
 * @param {number}   floor
 * @param {Function} rng               — seeded Math.random-compatible function
 * @param {Function} loadTexture        — from scoundrel-3d.js
 * @param {Function} getClonedTexture   — from scoundrel-3d.js
 * @returns {{ rooms: Array, mesh: THREE.Mesh, tileGrid: Array, cols: number, rows: number }}
 */
export function generateBSPFloor(scene, floor, rng, loadTexture, getClonedTexture) {
    const { cols, rows, iterations, minChunk } = gridParams(floor);

    // ── BSP tree ──────────────────────────────────────────────────────────────
    const root = new BSPNode(
        { x: 1, y: 1, w: cols - 2, h: rows - 2,
          minRatio: 0.5, maxRatio: 2.0, minChunk },
        rng
    );

    root.split(iterations);
    root.generateRooms();
    root.createPaths();

    const bspRooms   = root.getAllRooms();
    const bspPaths   = root.getAllPaths();
    const bspConns   = root.getAllConnections();

    // ── Tile grid ─────────────────────────────────────────────────────────────
    const tileGrid = buildTileGrid(cols, rows, bspRooms, bspPaths);

    // ── Three.js geometry ─────────────────────────────────────────────────────
    const decorations = [];
    const mesh = buildSceneGeometry(scene, floor, tileGrid, cols, rows, getClonedTexture, rng, decorations);

    // ── Game room graph ───────────────────────────────────────────────────────
    const rooms = buildRoomGraph(bspRooms, bspConns, cols, rows);

    // ── Door positions ────────────────────────────────────────────────────────
    const doorPositions = findDoorPositions(tileGrid, cols, rows);

    const wallSheet = getThemeForFloor(floor).sheet || 'assets/images/block.png';
    return { rooms, mesh, tileGrid, cols, rows, doorPositions, decorations, wallSheet };
}
