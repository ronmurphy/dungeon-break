// dnd-mechanics.js
// Core logic for "Dungeon Break" - The Coffee Break RPG

export const DND_RULES = {
    CRIT_MULTIPLIER: 2.0,
    BASE_AC: 10
};

export function rollDie(sides = 20) {
    return Math.floor(Math.random() * sides) + 1;
}

export function getModifier(score) {
    // Simplified D&D: Direct value (0-5 range) instead of (Score-10)/2
    return score; 
}

/**
 * Resolves an attack action.
 * @param {Object} attacker - Entity with stats { str, dex, int }
 * @param {Object} defender - Entity with stats { ac }
 * @param {String} type - 'melee' (STR), 'ranged' (DEX), 'magic' (INT)
 */
export function resolveAttack(attacker, defender, type = 'melee') {
    const d20 = rollDie(20);
    let statMod = 0;

    if (attacker.stats) {
        if (type === 'melee') statMod = attacker.stats.str || 0;
        else if (type === 'ranged') statMod = attacker.stats.dex || 0;
        else if (type === 'magic') statMod = attacker.stats.int || 0;
    }

    // Critical Hit (Natural 20)
    if (d20 === 20) {
        return { 
            hit: true, 
            crit: true, 
            roll: d20, 
            total: d20 + statMod, 
            msg: "CRITICAL HIT!" 
        };
    }

    // Critical Miss (Natural 1)
    if (d20 === 1) {
        return { 
            hit: false, 
            crit: false, 
            roll: d20, 
            total: d20 + statMod, 
            msg: "CRITICAL MISS!" 
        };
    }

    const targetAC = (defender.stats && defender.stats.ac) ? defender.stats.ac : DND_RULES.BASE_AC;
    const total = d20 + statMod;
    const hit = total >= targetAC;

    return {
        hit: hit,
        crit: false,
        roll: d20,
        total: total,
        msg: hit ? "Hit!" : "Missed..."
    };
}

export function rollDamage(weapon, isCrit) {
    // Weapon val is base damage (e.g., 4 for Rusty Sword)
    let dmg = weapon.val + (Math.random() * 2); // Slight variance
    if (isCrit) dmg *= DND_RULES.CRIT_MULTIPLIER;
    return Math.floor(dmg);
}