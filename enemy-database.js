/**
 * enemy-database.js
 * Defines base stats for enemies based on their model type.
 */

export const ENEMY_DATA = {
    'skeleton': { name: "Skeleton", hp: 8, ac: 1, str: 1, xp: 10 },
    'skeleton-viking': { name: "Skeletal Viking", hp: 12, ac: 2, str: 2, xp: 15 },
    'ironjaw': { name: "Ironjaw", hp: 15, ac: 2, str: 3, xp: 20 },
    'human': { name: "Bandit", hp: 20, ac: 1, str: 2, xp: 25 },
    'evil': { name: "Cultist", hp: 30, ac: 3, str: 4, xp: 40 },
    'king': { name: "King", hp: 50, ac: 5, str: 5, xp: 100 },
    'queen': { name: "Queen", hp: 45, ac: 4, str: 4, xp: 80 },
    'sorcoress': { name: "Sorceress", hp: 35, ac: 3, str: 3, xp: 60 },
    'assassin': { name: "Assassin", hp: 25, ac: 2, str: 4, xp: 50 },
    'female_twin': { name: "F. Twin", hp: 30, ac: 3, str: 3, xp: 60 },
    'male_twin': { name: "M. Twin", hp: 30, ac: 3, str: 3, xp: 60 },
    'demoness': { name: "Demoness", hp: 20, ac: 2, str: 3, xp: 70 },
    'gremlinn': { name: "Grimmlinn", hp: 25, ac: 2, str: 3, xp: 80 },
    'magma_dog': { name: "Magma Dog", hp: 20, ac: 2, str: 3, xp: 30 }
};

export function getEnemyStats(filename) {
    if (!filename) return { ...ENEMY_DATA['skeleton'] };
    
    const lower = filename.toLowerCase();
    if (lower.includes('skeleton')) return { ...ENEMY_DATA['skeleton'] };
    if (lower.includes('viking')) return { ...ENEMY_DATA['skeleton-viking'] };
    if (lower.includes('king')) return { ...ENEMY_DATA['king'] };
    if (lower.includes('queen')) return { ...ENEMY_DATA['queen'] };
    if (lower.includes('sorcoress')) return { ...ENEMY_DATA['sorceress'] };
    if (lower.includes('assassin')) return { ...ENEMY_DATA['assassin'] };
    if (lower.includes('female_twin')) return { ...ENEMY_DATA['female_twin'] };
    if (lower.includes('male_twin')) return { ...ENEMY_DATA['male_twin'] };
    if (lower.includes('ironjaw')) return { ...ENEMY_DATA['ironjaw'] };
    if (lower.includes('evil')) return { ...ENEMY_DATA['evil'] };
    if (lower.includes('male') || lower.includes('female')) return { ...ENEMY_DATA['human'] };
    if (lower.includes('gwark')) return { ...ENEMY_DATA['ironjaw'], name: "Gwark" };
    if (lower.includes('gremlin')) return { ...ENEMY_DATA['skeleton'], name: "Gremlin", hp: 6, ac: 0 };
    if (lower.includes('stolem')) return { ...ENEMY_DATA['ironjaw'], name: "Stone Golem", hp: 25, ac: 4, str: 4 };
    if (lower.includes('demoness')) return { ...ENEMY_DATA['demoness'] };
    if (lower.includes('gremlinn')) return { ...ENEMY_DATA['gremlinn'] };
    if (lower.includes('magma_dog')) return { ...ENEMY_DATA['magma_dog'] };
    
    return { ...ENEMY_DATA['skeleton'] }; // Fallback
}
