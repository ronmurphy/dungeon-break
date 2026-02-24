/**
 * pathfinding.js
 * Optimized A* implementation for grid-based movement using a Binary Heap.
 * Compatible with bsp-dungeon.js tile grids.
 */

class BinaryHeap {
    constructor(scoreFunction) {
        this.content = [];
        this.scoreFunction = scoreFunction;
    }

    push(element) {
        this.content.push(element);
        this.bubbleUp(this.content.length - 1);
    }

    pop() {
        const result = this.content[0];
        const end = this.content.pop();
        if (this.content.length > 0) {
            this.content[0] = end;
            this.sinkDown(0);
        }
        return result;
    }

    remove(node) {
        const length = this.content.length;
        for (let i = 0; i < length; i++) {
            if (this.content[i] !== node) continue;
            const end = this.content.pop();
            if (i < length - 1) {
                this.content[i] = end;
                if (this.scoreFunction(end) < this.scoreFunction(node)) {
                    this.bubbleUp(i);
                } else {
                    this.sinkDown(i);
                }
            }
            return;
        }
    }

    size() {
        return this.content.length;
    }

    bubbleUp(n) {
        const element = this.content[n];
        const score = this.scoreFunction(element);
        while (n > 0) {
            const parentN = Math.floor((n + 1) / 2) - 1;
            const parent = this.content[parentN];
            if (score >= this.scoreFunction(parent)) break;
            this.content[parentN] = element;
            this.content[n] = parent;
            n = parentN;
        }
    }

    sinkDown(n) {
        const length = this.content.length;
        const element = this.content[n];
        const elemScore = this.scoreFunction(element);

        while (true) {
            const child2N = (n + 1) * 2;
            const child1N = child2N - 1;
            let swap = null;
            let child1Score;

            if (child1N < length) {
                const child1 = this.content[child1N];
                child1Score = this.scoreFunction(child1);
                if (child1Score < elemScore) swap = child1N;
            }

            if (child2N < length) {
                const child2 = this.content[child2N];
                const child2Score = this.scoreFunction(child2);
                if (child2Score < (swap === null ? elemScore : child1Score)) swap = child2N;
            }

            if (swap === null) break;
            this.content[n] = this.content[swap];
            this.content[swap] = element;
            n = swap;
        }
    }
}

export class Pathfinder {
    /**
     * Finds a path from start to end on the grid.
     * @param {Object} start - {x, z} grid coordinates (integers)
     * @param {Object} end - {x, z} grid coordinates (integers)
     * @param {Array<Uint8Array>} grid - The floor grid [row][col] from bsp-dungeon.js
     * @param {number} cols - Grid width
     * @param {number} rows - Grid height
     * @param {Object} options - { getHeight: (x, z) => number }
     * @returns {Array} Array of {x, z} points (including start and end), or null if no path.
     */
    static findPath(start, end, grid, cols, rows, options = {}) {
        // 1. Validate Start/End
        if (!this.isValid(start.x, start.z, grid, cols, rows)) return null;
        
        // If target is invalid (e.g. clicked a wall), try to find a valid neighbor
        let target = end;
        if (!this.isValid(end.x, end.z, grid, cols, rows)) {
            // Simple check: is there a valid neighbor?
            const neighbors = [
                { x: 0, z: -1 }, { x: 0, z: 1 }, { x: -1, z: 0 }, { x: 1, z: 0 }
            ];
            let found = false;
            for (const n of neighbors) {
                if (this.isValid(end.x + n.x, end.z + n.z, grid, cols, rows)) {
                    target = { x: end.x + n.x, z: end.z + n.z };
                    found = true;
                    break;
                }
            }
            if (!found) return null;
        }

        const openHeap = new BinaryHeap(node => node.f);
        const openSet = new Map(); // key: "x,z" -> node
        const closedSet = new Set(); // key: "x,z"

        const startNode = { x: start.x, z: start.z, g: 0, f: 0, parent: null };
        startNode.f = this.heuristic(startNode, target);
        
        openHeap.push(startNode);
        openSet.set(`${start.x},${start.z}`, startNode);

        while (openHeap.size() > 0) {
            const current = openHeap.pop();
            const currentKey = `${current.x},${current.z}`;
            
            openSet.delete(currentKey);
            closedSet.add(currentKey);

            // Reached destination
            if (current.x === target.x && current.z === target.z) {
                return this.reconstructPath(current);
            }

            // Neighbors (8-way)
            const neighbors = [
                { x: 0, z: -1 }, { x: 0, z: 1 }, { x: -1, z: 0 }, { x: 1, z: 0 }, // Cardinals
                { x: -1, z: -1 }, { x: 1, z: -1 }, { x: -1, z: 1 }, { x: 1, z: 1 } // Diagonals
            ];

            for (const offset of neighbors) {
                const nx = current.x + offset.x;
                const nz = current.z + offset.z;
                const nKey = `${nx},${nz}`;

                if (closedSet.has(nKey)) continue;
                if (!this.isValid(nx, nz, grid, cols, rows)) continue;

                // Height Check (if provided)
                if (options.getHeight) {
                    const h1 = options.getHeight(current.x, current.z);
                    const h2 = options.getHeight(nx, nz);
                    // Max step height 1.5 units (handles steep hills but blocks cliffs)
                    if (Math.abs(h2 - h1) > 1.5) continue;
                }

                // Diagonal cost = 1.414, Cardinal = 1.0
                const isDiag = (offset.x !== 0 && offset.z !== 0);
                const moveCost = isDiag ? 1.414 : 1.0;
                
                // Corner cutting check for diagonals (don't walk through walls)
                if (isDiag) {
                    if (!this.isValid(current.x + offset.x, current.z, grid, cols, rows) ||
                        !this.isValid(current.x, current.z + offset.z, grid, cols, rows)) {
                        continue; 
                    }
                }

                const gScore = current.g + moveCost;
                let neighbor = openSet.get(nKey);

                if (!neighbor) {
                    neighbor = { x: nx, z: nz, g: gScore, f: 0, parent: current };
                    neighbor.f = gScore + this.heuristic(neighbor, target);
                    openHeap.push(neighbor);
                    openSet.set(nKey, neighbor);
                } else if (gScore < neighbor.g) {
                    // Found a better path to this neighbor
                    neighbor.g = gScore;
                    neighbor.f = gScore + this.heuristic(neighbor, target);
                    neighbor.parent = current;
                    
                    // Update position in heap
                    openHeap.remove(neighbor);
                    openHeap.push(neighbor);
                }
            }
        }

        return null; // No path
    }

    static isValid(x, z, grid, cols, rows) {
        if (x < 0 || x >= cols || z < 0 || z >= rows) return false;
        const tile = grid[z][x]; // grid[row][col]
        // 1=Room, 2=Corridor (BSP). 1=Walkable (CA).
        return tile === 1 || tile === 2;
    }

    static heuristic(a, b) {
        // Octile distance is better for 8-way movement than Manhattan
        const dx = Math.abs(a.x - b.x);
        const dz = Math.abs(a.z - b.z);
        return (dx + dz) + (1.414 - 2) * Math.min(dx, dz);
    }

    static reconstructPath(node) {
        const path = [];
        let curr = node;
        while (curr) {
            path.unshift({ x: curr.x, z: curr.z });
            curr = curr.parent;
        }
        return path;
    }
}
