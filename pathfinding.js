/**
 * pathfinding.js
 * Simple A* implementation for grid-based movement.
 */

export class Pathfinder {
    /**
     * Finds a path from start to end on the grid.
     * @param {Object} start - {x, z} integer coordinates
     * @param {Object} end - {x, z} integer coordinates
     * @param {Object} grid - The floor grid { x: { z: bool } }
     * @param {Set} blocked - Set of "x,z" strings representing obstacles
     * @returns {Array} Array of {x, z} points (including start and end), or null if no path.
     */
    static findPath(start, end, grid, blocked) {
        // Helper to check if a tile is valid
        const isValid = (x, z) => {
            if (!grid[x] || !grid[x][z]) return false; // No floor
            if (blocked.has(`${x},`)) return false; // Obstacle
            return true;
        };

        // If target is invalid, find nearest valid neighbor
        if (!isValid(end.x, end.z)) {
            // Simple spiral search for nearest valid tile could go here, 
            // but for now, just abort to prevent walking into void.
            return null; 
        }

        const openSet = [];
        const cameFrom = new Map(); // key: "x,z", val: {x, z}
        const gScore = new Map(); // Cost from start
        const fScore = new Map(); // Estimated total cost

        const startKey = `${start.x},${start.z}`;
        const endKey = `${end.x},${end.z}`;

        openSet.push(start);
        gScore.set(startKey, 0);
        fScore.set(startKey, this.heuristic(start, end));

        const openSetHas = (node) => openSet.some(n => n.x === node.x && n.z === node.z);

        while (openSet.length > 0) {
            // Get node with lowest fScore
            let current = openSet.reduce((prev, curr) => {
                const prevScore = fScore.get(`${prev.x},${prev.z}`) || Infinity;
                const currScore = fScore.get(`${curr.x},${curr.z}`) || Infinity;
                return prevScore < currScore ? prev : curr;
            });

            const currentKey = `${current.x},${current.z}`;
            if (current.x === end.x && current.z === end.z) {
                return this.reconstructPath(cameFrom, current);
            }

            // Remove current from openSet
            const idx = openSet.indexOf(current);
            openSet.splice(idx, 1);

            // Neighbors (8-way)
            const neighbors = [
                { x: 0, z: -1 }, { x: 0, z: 1 }, { x: -1, z: 0 }, { x: 1, z: 0 }, // Cardinals
                { x: -1, z: -1 }, { x: 1, z: -1 }, { x: -1, z: 1 }, { x: 1, z: 1 } // Diagonals
            ];

            for (const offset of neighbors) {
                const neighbor = { x: current.x + offset.x, z: current.z + offset.z };
                const neighborKey = `${neighbor.x},${neighbor.z}`;

                if (!isValid(neighbor.x, neighbor.z)) continue;

                // Diagonal cost = 1.4, Cardinal = 1.0
                const moveCost = (offset.x !== 0 && offset.z !== 0) ? 1.4 : 1.0;
                const tentativeG = (gScore.get(currentKey) || 0) + moveCost;

                if (tentativeG < (gScore.get(neighborKey) || Infinity)) {
                    cameFrom.set(neighborKey, current);
                    gScore.set(neighborKey, tentativeG);
                    fScore.set(neighborKey, tentativeG + this.heuristic(neighbor, end));

                    if (!openSetHas(neighbor)) {
                        openSet.push(neighbor);
                    }
                }
            }
        }

        return null; // No path found
    }

    static heuristic(a, b) {
        // Manhattan distance is fast and decent for grids
        return Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
    }

    static reconstructPath(cameFrom, current) {
        const totalPath = [current];
        let key = `${current.x},${current.z}`;
        while (cameFrom.has(key)) {
            current = cameFrom.get(key);
            key = `${current.x},${current.z}`;
            totalPath.unshift(current);
        }
        return totalPath;
    }
}
