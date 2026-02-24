/**
 * minimap.js
 * Auto-mapping HUD for Dungeon Break.
 * Features: Fog of War, Room Icons, Circular Mask.
 */

export const Minimap = {
    canvas: null,
    ctx: null,
    size: 180, // Size in pixels
    scale: 5,  // Pixels per tile
    grid: null,
    cols: 0,
    rows: 0,
    rooms: [],
    visited: new Set(), // Tracks explored tiles "x,y"

    init() {
        if (this.canvas) return;
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'minimap';
        this.canvas.width = this.size;
        this.canvas.height = this.size;
        this.canvas.style.cssText = `
            position: fixed; top: 20px; right: 20px;
            width: ${this.size}px; height: ${this.size}px;
            background: rgba(10, 10, 15, 0.85);
            border: 2px solid #d4af37;
            border-radius: 50%;
            z-index: 9000;
            pointer-events: none;
            display: none;
            box-shadow: 0 0 15px #000;
        `;
        document.body.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');
    },

    setLevel(grid, cols, rows, rooms) {
        if (!this.canvas) this.init(); // Ensure canvas exists
        
        this.grid = grid;
        this.cols = cols;
        this.rows = rows;
        this.rooms = rooms;
        this.visited.clear();

        // Pre-reveal the start room (usually ID 0)
        if (rooms && rooms.length > 0) {
            const start = rooms.find(r => r.id === 0);
            if (start) {
                this.revealArea(start.gx, start.gy, 8);
            }
        }

        this.canvas.style.display = 'block';
    },

    clear() {
        this.grid = null;
        this.visited.clear();
        if (this.canvas) this.canvas.style.display = 'none';
    },

    // Helper to mark tiles as visited around a world position
    revealArea(worldX, worldZ, radius) {
        if (!this.grid) return;
        
        // Convert world pos to grid pos
        const cx = Math.round(worldX + this.cols / 2);
        const cz = Math.round(worldZ + this.rows / 2);
        const r = Math.ceil(radius);

        for (let y = cz - r; y <= cz + r; y++) {
            for (let x = cx - r; x <= cx + r; x++) {
                // Check bounds
                if (x >= 0 && x < this.cols && y >= 0 && y < this.rows) {
                    // Circular reveal
                    if (Math.hypot(x - cx, y - cz) <= radius) {
                        this.visited.add(`,`);
                    }
                }
            }
        }
    },

    update(playerPos) {
        if (!this.canvas || !this.grid || !this.ctx) return;

        // 1. Reveal area around player
        this.revealArea(playerPos.x, playerPos.z, 6); // 6 unit radius

        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const halfW = w / 2;
        const halfH = h / 2;

        // 2. Clear & Mask
        ctx.clearRect(0, 0, w, h);
        ctx.save();
        ctx.beginPath();
        ctx.arc(halfW, halfH, halfW - 2, 0, Math.PI * 2);
        ctx.clip();

        // 3. Calculate Viewport
        // Player Grid Coords (World 0,0 is at Grid Center)
        const px = Math.round(playerPos.x + this.cols / 2);
        const pz = Math.round(playerPos.z + this.rows / 2);

        const viewRadius = Math.ceil((w / 2) / this.scale);
        const startCol = Math.max(0, px - viewRadius);
        const endCol   = Math.min(this.cols - 1, px + viewRadius);
        const startRow = Math.max(0, pz - viewRadius);
        const endRow   = Math.min(this.rows - 1, pz + viewRadius);

        // 4. Draw Tiles
        for (let r = startRow; r <= endRow; r++) {
            for (let c = startCol; c <= endCol; c++) {
                // Fog of War check
                if (!this.visited.has(`,`)) continue;

                const tile = this.grid[r][c];
                if (tile === 0) continue; // Empty

                // Draw tile relative to center
                const screenX = halfW + (c - px) * this.scale;
                const screenY = halfH + (r - pz) * this.scale;

                if (tile === 3) ctx.fillStyle = '#555'; // Wall
                else if (tile === 1) ctx.fillStyle = '#888'; // Room
                else ctx.fillStyle = '#666'; // Corridor

                ctx.fillRect(screenX - this.scale/2, screenY - this.scale/2, this.scale, this.scale);
            }
        }

        // 5. Draw Room Icons (if revealed)
        if (this.rooms) {
            this.rooms.forEach(room => {
                if (!room.isRevealed && !room.isWaypoint) return;

                // Convert room world pos to grid pos
                const rx = Math.round(room.gx + this.cols / 2);
                const rz = Math.round(room.gy + this.rows / 2);
                
                // Convert to screen pos
                const sx = halfW + (rx - px) * this.scale;
                const sy = halfH + (rz - pz) * this.scale;

                // Skip if off-screen
                if (sx < -10 || sx > w + 10 || sy < -10 || sy > h + 10) return;

                let color = null;
                let label = null;

                if (room.id === 0) { color = '#44aaff'; label = '⚡'; } // Start
                else if (room.isFinal) { color = '#ff0000'; label = '☠'; } // Boss
                else if (room.isBonfire) { color = '#ff8800'; label = '🔥'; }
                else if (room.isSpecial) { color = '#ffd700'; label = '💰'; } // Merchant
                else if (room.isAlchemy) { color = '#00ffaa'; label = '⚗'; }
                else if (room.isTrap) { color = '#ff4400'; label = '⚠'; }
                else if (room.isLocked) { color = '#aa00ff'; label = '🔒'; }

                if (color) {
                    ctx.fillStyle = color;
                    ctx.beginPath(); ctx.arc(sx, sy, 4, 0, Math.PI*2); ctx.fill();
                    if (label) {
                        ctx.fillStyle = '#fff';
                        ctx.font = '10px Arial';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(label, sx, sy);
                    }
                }
            });
        }

        // 6. Player Dot
        ctx.fillStyle = '#00ff00';
        ctx.beginPath(); ctx.arc(halfW, halfH, 3, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    }
};
