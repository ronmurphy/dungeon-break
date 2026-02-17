/**
 * dnd-mechanics.js
 * Core logic for "Dungeon Break" - The Coffee Break RPG
 * Handles dice rolls, modifiers, and the "Dulling Blade" durability system.
 */

export const DND_CONFIG = {
    // Map Attribute Score to Modifier (Simplified: Score - 10)
    // Example: 11 -> +1, 10 -> 0
    getModifier: (score) => {
        return Math.max(0, score - 10);
    },

    // Map a total power level (Stat + Weapon) to a Die Size
    // This makes getting stronger feel visceral (geometry upgrade)
    getDieSize: (power) => {
        if (power <= 4) return 4;
        if (power <= 6) return 6;
        if (power <= 8) return 8;
        if (power <= 10) return 10;
        if (power <= 12) return 12;
        return 20; // God tier
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
}