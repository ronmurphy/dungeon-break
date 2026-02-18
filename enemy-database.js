/**
 * enemy-database.js
 * Defines base stats for enemies based on their model type.
 */

export const ENEMY_DATA = {
    'skeleton': { name: "Skeleton", hp: 8, ac: 1, str: 1, xp: 10 },
    'ironjaw': { name: "Ironjaw", hp: 15, ac: 2, str: 3, xp: 20 },
    'human': { name: "Bandit", hp: 20, ac: 1, str: 2, xp: 25 },
    'evil': { name: "Cultist", hp: 30, ac: 3, str: 4, xp: 40 }
};

export function getEnemyStats(filename) {
    if (!filename) return { ...ENEMY_DATA['skeleton'] };
    
    const lower = filename.toLowerCase();
    if (lower.includes('skeleton')) return { ...ENEMY_DATA['skeleton'] };
    if (lower.includes('ironjaw')) return { ...ENEMY_DATA['ironjaw'] };
    if (lower.includes('evil')) return { ...ENEMY_DATA['evil'] };
    if (lower.includes('male') || lower.includes('female')) return { ...ENEMY_DATA['human'] };
    
    return { ...ENEMY_DATA['skeleton'] }; // Fallback
}
