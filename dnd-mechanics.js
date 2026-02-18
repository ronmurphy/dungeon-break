/**
 * dnd-mechanics.js
 * Core logic for "Dungeon Break" - The Coffee Break RPG
 * Handles dice rolls, modifiers, and the "Dulling Blade" durability system.
 * 
 * Stats: STR, DEX, INT, LCK (Single digit point-buy system)
 */

export const DND_CONFIG = {
    // Map Attribute Score to Modifier
    // System: Single digit point buy (0-9). The score IS the modifier.
    getModifier: (score) => {
        return score;
    },

    // Map a total power level (Stat + Weapon) to a Die Size
    // Returns { sides, bonus }
    getDiceConfig: (power) => {
        if (power < 4) return { sides: 4, bonus: 0 }; // Minimum d4
        const dice = [20, 12, 10, 8, 6, 4];
        for (let d of dice) {
            if (power >= d) return { sides: d, bonus: power - d };
        }
        return { sides: 4, bonus: 0 };
    }
};

export class DiceRoller {
    static roll(sides) {
        if (sides <= 0) return 0;
        return Math.floor(Math.random() * sides) + 1;
    }
}

export class CombatResolver {
    /**
     * Resolves a clash between attacker and defender.
     * Both roll (Power -> Die + Bonus). Highest total wins and hits.
     * 
     * @param {number} attPower - Attacker's Total Power (Str + Weapon)
     * @param {number} defPower - Defender's Total Power
     * @param {number} attAC - Attacker's Armor Class
     * @param {number} defAC - Defender's Armor Class
     */
    static resolveClash(attPower, defPower, attAC, defAC) {
        const attConfig = DND_CONFIG.getDiceConfig(attPower);
        const defConfig = DND_CONFIG.getDiceConfig(defPower);

        const attRoll = DiceRoller.roll(attConfig.sides);
        const defRoll = DiceRoller.roll(defConfig.sides);

        const attTotal = attRoll + attConfig.bonus;
        const defTotal = defRoll + defConfig.bonus;

        let result = {
            attacker: { roll: attRoll, total: attTotal, config: attConfig },
            defender: { roll: defRoll, total: defTotal, config: defConfig },
            winner: 'tie',
            damage: 0
        };

        if (attTotal > defTotal) {
            result.winner = 'attacker';
            result.damage = Math.max(0, attTotal - defAC);
        } else if (defTotal > attTotal) {
            result.winner = 'defender';
            result.damage = Math.max(0, defTotal - attAC);
        }

        return result;
    }

    /**
     * Resolves a single attack interaction using the "Dulling Blade" mechanic.
     * 
     * Rule: Damage = Roll - AC - Wear
     * Rule: If Damage is 0 (blocked), Wear increases (The Clang).
     * Rule: If Weapon Value - Wear <= 0, Weapon Breaks.
     * 
     * @param {number} strScore - Player's Strength Score (e.g., 11)
     * @param {number} weaponVal - Weapon's Base Value (e.g., 3)
     * @param {number} currentWear - Current wear/dullness on weapon (starts at 0)
     * @param {number} enemyArmor - Enemy's Armor/DR Value (e.g., 1)
     */
    static resolveAttack(strScore, weaponVal, currentWear, enemyArmor) {
        // 1. Calculate Modifier
        const mod = DND_CONFIG.getModifier(strScore);
        
        // 2. Determine Die Size
        // Power = Weapon Base + Str Mod
        const power = weaponVal + mod;
        const dieSides = DND_CONFIG.getDieSize(power);

        // 3. Roll
        const rawRoll = DiceRoller.roll(dieSides);

        // 4. Apply Reductions (AC + Wear)
        // Damage cannot be negative
        const damageCalc = rawRoll - enemyArmor - currentWear;
        const finalDamage = Math.max(0, damageCalc);

        // 5. Durability Check ("The Clang")
        // If damage was fully blocked (0), weapon takes stress/dulls
        let newWear = currentWear;
        let broken = false;
        let msg = "";
        
        if (finalDamage === 0) {
            newWear++;
            msg = "Blocked! Weapon dulls.";
            
            // Break condition: If wear consumes the weapon's base value
            if (weaponVal - newWear <= 0) {
                broken = true;
                msg = "SHATTERED!";
            }
        }

        return {
            die: `d${dieSides}`,
            roll: rawRoll,
            blocked: enemyArmor + currentWear, // Total reduction
            damage: finalDamage,
            newWear: newWear,
            isBroken: broken,
            isCrit: rawRoll === dieSides && dieSides > 1,
            msg: msg
        };
    }

    /**
     * Resolves a generic attribute check (e.g. Luck, Int).
     * @param {number} statScore - The attribute score (modifier).
     * @param {number} dc - Difficulty Class (default 10).
     * @returns {object} Result { success, roll, total }
     */
    static resolveCheck(statScore, dc = 10) {
        const mod = DND_CONFIG.getModifier(statScore);
        const roll = DiceRoller.roll(20);
        return {
            success: (roll + mod) >= dc,
            roll: roll,
            total: roll + mod
        };
    }
}