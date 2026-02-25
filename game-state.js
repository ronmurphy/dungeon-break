import { shuffle } from './dungeon-generator.js';

export const SUITS = { HEARTS: '♥', DIAMONDS: '♦', CLUBS: '♣', SPADES: '♠', SKULLS: '💀', MENACES: '👺' };

export const ITEMS_SHEET_COUNT = 10;
export const WEAPON_SHEET_COUNT = 20;

export const CURSED_ITEMS = [
    { id: 'cursed_blade', name: "Bloodthirst Blade", cost: 66, type: 'weapon', val: 12, suit: '♦', desc: "12 DMG. Drains 1 HP per room.", isCursed: true },
    { id: 'cursed_ring', name: "Ring of Burden", cost: 66, type: 'passive', desc: "+10 Max HP. Cannot Flee.", isCursed: true }
];

export const ARMOR_DATA = [
    { id: 0, name: "Studded Gloves", ap: 2, cost: 25, slot: "hands", desc: "Light hand protection." },
    { id: 1, name: "Articulated Gauntlets", ap: 5, cost: 50, slot: "hands", desc: "Heavy plated hand protection." },
    { id: 2, name: "Iron Pot Helm", ap: 5, cost: 45, slot: "head", desc: "Solid iron headgear." },
    { id: 3, name: "Heavy Greaves", ap: 5, cost: 45, slot: "legs", desc: "Thick leg armor." },
    { id: 4, name: "Padded Gambeson", ap: 1, cost: 25, slot: "chest", desc: "Basic cloth armor." },
    { id: 5, name: "Reinforced Leather", ap: 2, cost: 30, slot: "chest", desc: "Hardened leather chestpiece." },
    { id: 6, name: "Chainmail Hauberk", ap: 3, cost: 40, slot: "chest", desc: "Interlinked metal rings." },
    { id: 7, name: "Steel Breastplate", ap: 4, cost: 55, slot: "chest", desc: "Solid steel chest protection." },
    { id: 8, name: "Gothic Plate", ap: 5, cost: 75, slot: "chest", desc: "Masterwork full plate." },
    { id: 9, name: "Ranger's Mask", ap: 1, cost: 40, slot: "head", desc: "+1 AP. 20% chance wanderers won't engage you in combat." },
    { id: 10, name: "Cultist's Mask", ap: 3, cost: 50, slot: "head", desc: "+3 AP. Wanderers are drawn to you — doubled detection range, no blind spots." },
    // ── Bone Set (drop-only) ─────────────────────────────────────────────────
    { id: 11, name: "Bone Mask",         ap: 2, cost: 150, slot: "head",  setId: 'bone',     setName: 'Bone',     img: 'items/sets/item_bone_mask.png',      dropOnly: true, desc: "Bone Set 1/4. +2 AP. Full set: skeleton companions ignore you + summon a skeletal ally." },
    { id: 12, name: "Bone Plate",        ap: 2, cost: 150, slot: "chest", setId: 'bone',     setName: 'Bone',     img: 'items/sets/item_bone_chest.png',     dropOnly: true, desc: "Bone Set 2/4. +2 AP. Full set: skeleton companions ignore you + summon a skeletal ally." },
    { id: 13, name: "Bone Gauntlets",    ap: 2, cost: 150, slot: "hands", setId: 'bone',     setName: 'Bone',     img: 'items/sets/item_bone_gloves.png',    dropOnly: true, desc: "Bone Set 3/4. +2 AP. Full set: skeleton companions ignore you + summon a skeletal ally." },
    { id: 14, name: "Bone Greaves",      ap: 2, cost: 150, slot: "legs",  setId: 'bone',     setName: 'Bone',     img: 'items/sets/item_bone_legs.png',      dropOnly: true, desc: "Bone Set 4/4. +2 AP. Full set: skeleton companions ignore you + summon a skeletal ally." },
    // ── Infernal Set (drop-only) ─────────────────────────────────────────────
    { id: 15, name: "Infernal Mask",     ap: 2, cost: 150, slot: "head",  setId: 'infernal', setName: 'Infernal', img: 'items/sets/item_infernal_mask.png',   dropOnly: true, desc: "Infernal Set 1/4. +2 AP. Full set: demons and the corrupted will not engage you." },
    { id: 16, name: "Infernal Plate",    ap: 2, cost: 150, slot: "chest", setId: 'infernal', setName: 'Infernal', img: 'items/sets/item_infernal_chest.png',  dropOnly: true, desc: "Infernal Set 2/4. +2 AP. Full set: demons and the corrupted will not engage you." },
    { id: 17, name: "Infernal Gauntlets",ap: 2, cost: 150, slot: "hands", setId: 'infernal', setName: 'Infernal', img: 'items/sets/item_infernal_gloves.png', dropOnly: true, desc: "Infernal Set 3/4. +2 AP. Full set: demons and the corrupted will not engage you." },
    { id: 18, name: "Infernal Greaves",  ap: 2, cost: 150, slot: "legs",  setId: 'infernal', setName: 'Infernal', img: 'items/sets/item_infernal_legs.png',   dropOnly: true, desc: "Infernal Set 4/4. +2 AP. Full set: demons and the corrupted will not engage you." },
];

export const ITEM_DATA = [
    { id: 0, name: "Volatile Bomb", cost: 30, type: 'active', desc: "Deal weapon dmg to random enemy." },
    { id: 1, name: "Spectral Lantern", cost: 50, type: 'passive', desc: "Permanent Gold Light." },
    { id: 2, name: "Skeleton Key", cost: 35, type: 'active', desc: "Avoid room (even if last avoided)." },
    { id: 3, name: "Leather Map", cost: 40, type: 'passive', desc: "Reveal all room locations." },
    { id: 4,  name: "Purple Hourglass",    cost: 30, type: 'active',  desc: "Re-roll the Soul Broker's wares. Use at the shop." },
    { id: 5, name: "Protective Herbs", cost: 25, type: 'passive', desc: "+5 HP from Bonfires." },
    { id: 6, name: "Silver Mirror", cost: 60, type: 'passive', desc: "Survive fatal blow once." },
    { id: 7, name: "Music Box", cost: 35, type: 'active', desc: "-2 to all monsters in room." },
    { id: 8, name: "Iron-Bound Tome", cost: 50, type: 'passive', desc: "+2 Soul Coins per kill." },
    { id: 9,  name: "Town Portal Scroll",  cost: 45, type: 'active',  desc: "Opens a portal back to camp. Walk through again to return." },
    { id: 10, name: "Adventurer's Pack",    cost: 40, type: 'active',  desc: "Permanently expand backpack by 3 slots. (Single use)" },
    { id: 11, name: "Spellbook",            cost: 55, type: 'active',  desc: "Arcane blast: 1d8+STR+LCK to all enemies within 3 units." },
    { id: 12, name: "Unmarked Map",         cost: 45, type: 'passive', desc: "Reveal all rooms. Soul coin pickups worth +15%." },
    { id: 13, name: "Lucky Duck",           cost: 0,  type: 'passive', desc: "+1 LCK while in hotbar. Stackable up to 6. Find them in the Duck Dungeon." },
    { id: 14, name: "Ranger's Mask",        cost: 40, type: 'active',  desc: "Wanderers ignore you for the next 2 room encounters." },
    { id: 15, name: "Pell's Bowl",          cost: 35, type: 'passive', desc: "+3 HP whenever you rest at a bonfire." }
];

export const CLASS_DATA = {
    knight: {
        name: "Vanguard",
        desc: "A stalwart defender. Barehanded attacks deal 3 DMG.",
        hp: 20,
        items: [{ type: 'weapon', id: 'rusty_sword', val: 4, suit: '♦', name: "Rusty Sword" }, { type: 'armor', id: 0 }],
        icon: { type: 'class-icon', val: 0 },
        spellCap: 0,
        stats: { str: 3, dex: 0, int: 0, ac: 14 }, // Tanky, hits hard
        skills: [{ id: 'power_strike', name: "Power Strike", desc: "Attack with +3 Power. (Once/Battle)" }]
    },
    rogue: {
        name: "Scoundrel",
        desc: "Cunning and greedy. Can flee consecutive rooms.",
        hp: 20,
        items: [{ type: 'weapon', id: 'knife', val: 2, suit: '♦', name: "Thief's Knife" }, { type: 'item', id: 2 }, { type: 'item', id: 8 }],
        icon: { type: 'class-icon', val: 1 },
        spellCap: 0,
        stats: { str: 1, dex: 4, int: 1, ac: 12 }, // Fast, hard to hit
        skills: [{ id: 'cheap_shot', name: "Cheap Shot", desc: "Guaranteed Hit if Enemy HP < 50%. (Once/Battle)" }]
    },
    occultist: {
        name: "Arcanist",
        desc: "Seeker of forbidden knowledge. Spells may Echo (20%).",
        hp: 15,
        items: [{ type: 'weapon', id: 'dagger', val: 2, suit: '♦', name: "Ritual Dagger" }, { type: 'item', id: 1 }],
        icon: { type: 'class-icon', val: 2 },
        spellCap: 14,
        stats: { str: 0, dex: 1, int: 5, ac: 10 }, // Glass cannon
        skills: [{ id: 'eldritch_blast', name: "Eldritch Blast", desc: "Deal 1d8 Magic DMG (Ignores AC). (Once/Battle)" }]
    },
    priest: {
        name: "Confessor",
        desc: "A holy healer. Faith restores 1 HP every 40 paces walked.",
        hp: 20,
        items: [{ type: 'weapon', id: 'mace', val: 3, suit: '♣', name: "Cleric's Mace" }, { type: 'item', id: 5 }], // Herbs
        icon: { type: 'class-icon', val: 3 },
        spellCap: 3,
        stats: { str: 2, dex: 0, int: 3, ac: 13 },
        skills: [{ id: 'smite', name: "Smite", desc: "Deal 2 DMG, Heal 2 HP. (Once/Battle)" }]
    },
    ranger: {
        name: "Strider",
        desc: "Wilderness survivor. Waypoints reveal surroundings.",
        hp: 20,
        items: [{ type: 'weapon', id: 'knife', val: 2, suit: '♦', name: "Hunting Knife" }, { type: 'armor', id: 5 }, { type: 'item', id: 7 }], // Leather Armor, Music Box
        icon: { type: 'class-icon', val: 4 },
        spellCap: 2,
        stats: { str: 2, dex: 3, int: 1, ac: 12 },
        skills: [{ id: 'snipe', name: "Snipe", desc: "High Crit Chance Attack. (Once/Battle)" }]
    },
    bard: {
        name: "Minstrel",
        desc: "Jack of all trades. Shop prices -20%.",
        hp: 18,
        items: [{ type: 'weapon', id: 'dirk', val: 2, suit: '♦', name: "Hidden Dirk" }, { type: 'item', id: 6 }], // Silver Mirror
        icon: { type: 'class-icon', val: 5 },
        spellCap: 5,
        stats: { str: 1, dex: 3, int: 3, ac: 11 },
        skills: [{ id: 'distract', name: "Distract", desc: "Enemy rolls d4 next turn. (Once/Battle)" }]
    },
    paladin: {
        name: "Templar",
        desc: "Righteous crusader. +1 AP every 5 kills.",
        hp: 22,
        items: [{ type: 'weapon', id: 'hammer', val: 3, suit: '♦', name: "Warhammer" }, { type: 'armor', id: 7 }], // Steel Breastplate (4 AP)
        icon: { type: 'class-icon', val: 6 },
        spellCap: 2,
        stats: { str: 4, dex: 0, int: 1, ac: 16 }, // Heavy tank
        skills: [{ id: 'holy_bash', name: "Holy Bash", desc: "Deal Weapon DMG + Gain 2 AP. (Once/Battle)" }]
    },
    necromancer: {
        name: "Reanimator",
        desc: "Wields the Cursed Blade. Exact kills heal 1 HP.",
        hp: 30,
        items: [{ type: 'weapon', id: 'cursed_blade', val: 12, suit: '♦', name: "Bloodthirst Blade", isCursed: true }],
        icon: { type: 'class-icon', val: 7 },
        spellCap: 5,
        stats: { str: 2, dex: 1, int: 4, ac: 11 },
        skills: [{ id: 'siphon', name: "Siphon Life", desc: "Deal 3 DMG, Heal 3 HP. (Once/Battle)" }]
    },
    artificer: {
        name: "Tinkerer",
        desc: "Master of gadgets. 15% chance to save consumables.",
        hp: 20,
        items: [{ type: 'weapon', id: 'wrench', val: 3, suit: '♦', name: "Heavy Wrench" }, { type: 'item', id: 0 }, { type: 'item', id: 2 }], // Bomb, Key
        icon: { type: 'class-icon', val: 8 },
        spellCap: 2,
        stats: { str: 1, dex: 2, int: 4, ac: 12 },
        skills: [{ id: 'flashbang', name: "Flashbang", desc: "Stun Enemy (Skip Turn). (Once/Battle)" }]
    }
};

// --- CORE GAME STATE ---
export const game = {
    hp: 20, maxHp: 20,
    slain: 0,
    rooms: [],
    currentRoomIdx: 0,
    moves: 0,
    lastAvoided: false,
    potionsUsedThisTurn: false,
    sex: 'm',
    classId: 'knight',
    mode: 'checkpoint',
    activeRoom: null,
    chosenCount: 0,
    combatCards: [],
    slainStack: [],
    carryCard: null,
    combatBusy: false,
    soulCoins: 0,
    equipment: { head: null, chest: null, hands: null, legs: null, weapon: null },
    backpack: [],
    hotbar: [],
    ap: 0,
    maxAp: 0,
    bonfireUsed: false,
    merchantUsed: false,
    pendingPurchase: null,
    isBossFight: false,
    torchCharge: 20,
    anvil: [null, null],
    currentTrack: null,
    deck: [],
    visitedWaypoints: [],
    enemiesDefeated: 0,
    brokerPhase: 0,
    level: 1,
    xp: 0,
    seed: 1,
    useBSP: false,
    torchEnabled: true,
    campMap: false
};
window.game = game;

export function getDisplayVal(v) {
    const map = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
    return map[v] || v;
}

export function getUVForCell(cellIdx, totalCells = 9) {
    return { u: cellIdx / totalCells, v: 0 };
}

export function getAssetData(type, value, suit, extra) {
    let file = 'block.png';
    let v = value;
    let s = suit;

    if (type === 'monster') {
        if (suit === SUITS.CLUBS) file = 'club.png';
        else if (suit === SUITS.SPADES) file = 'spade.png';
        else if (suit === SUITS.SKULLS) file = 'skull.png';
        else if (suit === SUITS.MENACES) file = 'menace.png';
        else file = 'club.png';
    }
    else if (type === 'weapon' || type === 'passive') {
        if (value === 'cursed_blade') file = 'weapons_final.png';
        else if (value === 'cursed_ring') file = 'items.png';
        else {
            const cap = CLASS_DATA[game.classId] ? (CLASS_DATA[game.classId].spellCap || 0) : 0;
            if (type === 'weapon' && value <= cap) file = 'occultist.png';
            else file = 'weapons_final.png';
        }
    }
    else if (type === 'class-icon') file = 'classes.png';
    else if (type === 'potion') file = 'heart.png';
    else if (type === 'block') file = 'block.png';
    else if (type === 'bonfire') file = 'rest_m_large.png';
    else if (type === 'gift' && extra) {
        if (extra.type === 'armor') {
            file = 'armor.png';
            v = extra.id;
        } else {
            if (extra.type === 'weapon') {
                if (extra.id === 'cursed_blade') file = 'weapons_final.png';
                else if (extra.val <= (CLASS_DATA[game.classId].spellCap || 0)) file = 'occultist.png';
                else file = 'weapons_final.png';
            } else {
                file = 'heart.png';
            }
            v = extra.val; s = extra.suit;
        }
    }
    else if (type === 'armor') { file = 'armor.png'; v = value; }
    else if (type === 'item') { file = 'items.png'; v = value; }

    let cellIdx = 0;
    let sheetCount = 9;
    if (file === 'items.png') sheetCount = ITEMS_SHEET_COUNT;
    if (file === 'weapons_final.png') sheetCount = WEAPON_SHEET_COUNT;

    if (type === 'block') { cellIdx = value % 9; }
    else if (type === 'bonfire') { cellIdx = 0; }
    else if (type === 'armor' || type === 'item') {
        if (file === 'items.png') sheetCount = ITEMS_SHEET_COUNT;
        cellIdx = value;
        if (value === 'cursed_ring') cellIdx = 9;
    } else if (type === 'weapon' || type === 'class-icon') {
        if (value === 'cursed_blade') cellIdx = 9;
        else if (type === 'weapon' && game.classId === 'occultist' && value > 10) cellIdx = value - 6;
        else cellIdx = Math.max(0, value - (type === 'weapon' ? 2 : 0));
    } else if (type === 'gift' && extra && extra.type === 'armor') {
        cellIdx = v;
    } else if (type === 'gift' && extra && extra.type === 'weapon') {
        if (extra.id === 'cursed_blade') cellIdx = 9;
        else if (game.classId === 'occultist' && v > 10) cellIdx = v - 6;
        else cellIdx = Math.max(0, v - 2);
    } else {
        if (v <= 3) cellIdx = 0;
        else if (v <= 5) cellIdx = 1;
        else if (v <= 7) cellIdx = 2;
        else if (v <= 9) cellIdx = 3;
        else if (v === 10) cellIdx = 4;
        else if (v === 11) cellIdx = 5;
        else if (v === 12) cellIdx = 6;
        else if (v === 13) cellIdx = 7;
        else if (v === 14) cellIdx = 8;
        else cellIdx = 0;
    }
    // Standalone single-image items — return directly, bypassing spritesheet UV math
    if (type === 'item' && value ===  9) return { file: 'items/item_scroll.png',       uv: { u: 0, v: 0 }, isStrip: true, sheetCount: 1 };
    if (type === 'item' && value === 10) return { file: 'items/item_backpack.png',      uv: { u: 0, v: 0 }, isStrip: true, sheetCount: 1 };
    if (type === 'item' && value === 11) return { file: 'items/item_spellbook.png',     uv: { u: 0, v: 0 }, isStrip: true, sheetCount: 1 };
    if (type === 'item' && value === 12) return { file: 'items/item_unmarked_map.png',  uv: { u: 0, v: 0 }, isStrip: true, sheetCount: 1 };
    if (type === 'item'  && value === 13) return { file: 'items/item_toy_duck.png',      uv: { u: 0, v: 0 }, isStrip: true, sheetCount: 1 };
    if (type === 'item'  && value === 14) return { file: 'items/item_female_mask.png',   uv: { u: 0, v: 0 }, isStrip: true, sheetCount: 1 };
    if (type === 'item'  && value === 15) return { file: 'items/item_pell_bowl.png',     uv: { u: 0, v: 0 }, isStrip: true, sheetCount: 1 };
    if (type === 'armor' && value ===  9) return { file: 'items/item_female_mask.png',   uv: { u: 0, v: 0 }, isStrip: true, sheetCount: 1 };
    if (type === 'armor' && value === 10) return { file: 'items/item_male_mask.png',     uv: { u: 0, v: 0 }, isStrip: true, sheetCount: 1 };
    if (type === 'armor' && value === 11) return { file: 'items/sets/item_bone_mask.png',      uv: { u: 0, v: 0 }, isStrip: true, sheetCount: 1 };
    if (type === 'armor' && value === 12) return { file: 'items/sets/item_bone_chest.png',     uv: { u: 0, v: 0 }, isStrip: true, sheetCount: 1 };
    if (type === 'armor' && value === 13) return { file: 'items/sets/item_bone_gloves.png',    uv: { u: 0, v: 0 }, isStrip: true, sheetCount: 1 };
    if (type === 'armor' && value === 14) return { file: 'items/sets/item_bone_legs.png',      uv: { u: 0, v: 0 }, isStrip: true, sheetCount: 1 };
    if (type === 'armor' && value === 15) return { file: 'items/sets/item_infernal_mask.png',  uv: { u: 0, v: 0 }, isStrip: true, sheetCount: 1 };
    if (type === 'armor' && value === 16) return { file: 'items/sets/item_infernal_chest.png', uv: { u: 0, v: 0 }, isStrip: true, sheetCount: 1 };
    if (type === 'armor' && value === 17) return { file: 'items/sets/item_infernal_gloves.png',uv: { u: 0, v: 0 }, isStrip: true, sheetCount: 1 };
    if (type === 'armor' && value === 18) return { file: 'items/sets/item_infernal_legs.png',  uv: { u: 0, v: 0 }, isStrip: true, sheetCount: 1 };
    const isStrip = !file.includes('rest');
    return { file, uv: getUVForCell(cellIdx, sheetCount), isStrip, sheetCount };
}

export function getWeaponName(v) {
    const names = {
        2: "Knife", 3: "Club", 4: "Dagger", 5: "Mace",
        6: "Scimitar", 7: "Long Sword", 8: "War Hammer", 9: "Battle Axe",
        10: "Halberd", 11: "Great Sword",
        12: "War Scythe", 13: "Flail", 14: "Rapier", 15: "Polearm",
        16: "Morningstar", 17: "Heavy Crossbow", 18: "War Pick", 19: "Claymore",
        20: "Ritual Sickles", 21: "Spear"
    };
    return names[v] || `Weapon lv.${v}`;
}

export function getSpellName(v) {
    const names = {
        2: "Fire Bolt", 3: "Ice Dagger", 4: "Poison Dart",
        5: "Lightning", 6: "Ball Lightning", 7: "Fireball",
        8: "Abyssal Rift", 9: "Comet Fall", 10: "Eldritch Annihilation",
        11: "Fireball", 12: "Abyssal Rift", 13: "Comet Fall", 14: "Eldritch Annihilation"
    };
    return names[v] || "Unknown Spell";
}

export function getMonsterName(v, suit) {
    if (suit === SUITS.SKULLS) {
        if (v <= 3) return 'Skeleton';
        if (v <= 5) return 'Zombie';
        if (v <= 7) return 'Ghost';
        if (v <= 9) return 'Skeletal Warrior';
        if (v === 10) return 'Ghoul';
        if (v === 11) return 'Wight';
        if (v === 12) return 'Wraith';
        if (v === 13) return 'Vampire';
        if (v === 14) return 'Lich Lord';
    } else if (suit === SUITS.MENACES) {
        if (v <= 3) return 'Kobold';
        if (v <= 5) return 'Goblin';
        if (v <= 7) return 'Gremlin';
        if (v <= 9) return 'Hobgoblin';
        if (v === 10) return 'Orc';
        if (v === 11) return 'Gnoll';
        if (v === 12) return 'Lizard-man';
        if (v === 13) return 'Yuan-ti';
        if (v === 14) return 'Bugbear Chief';
    } else {
        if (v <= 3) return 'Shadow Creeper';
        if (v <= 5) return 'Graveling';
        if (v <= 7) return 'Rat-Bat';
        if (v <= 9) return 'Spined Horror';
        if (v === 10) return 'Grue';
        if (v === 11) return 'Jack of Spite';
        if (v === 12) return 'Queen of Sorrow';
        if (v === 13) return 'King of Ruin';
        if (v === 14) return 'Primeval Ace';
    }
    return `Monster (${v})`;
}

export function createDeck() {
    let multiplier = 1;
    if (game.floor >= 4) multiplier = 2;
    if (game.floor >= 7) multiplier = 3;

    let monsterSuits = [SUITS.CLUBS, SUITS.MENACES];
    if (game.floor >= 4) monsterSuits = [SUITS.SPADES, SUITS.SKULLS];
    if (game.floor >= 7) monsterSuits = [SUITS.MENACES, SUITS.SKULLS];

    const deck = [];
    for (let i = 0; i < multiplier; i++) {
        monsterSuits.forEach(suit => {
            for (let v = 2; v <= 14; v++) {
                deck.push({ suit, val: v, type: 'monster', name: getMonsterName(v, suit) });
            }
        });
        for (let v = 2; v <= 10; v++) {
            const cap = CLASS_DATA[game.classId] ? (CLASS_DATA[game.classId].spellCap || 0) : 0;
            if (v <= cap) {
                deck.push({ suit: SUITS.DIAMONDS, val: v, type: 'weapon', name: getSpellName(v), isSpell: true });
            } else {
                deck.push({ suit: SUITS.DIAMONDS, val: v, type: 'weapon', name: getWeaponName(v) });
            }
        }
        for (let v = 2; v <= 10; v++) {
            deck.push({ suit: SUITS.HEARTS, val: v, type: 'potion', name: `HP Incense ${v}` });
        }
    }
    return shuffle(deck);
}
