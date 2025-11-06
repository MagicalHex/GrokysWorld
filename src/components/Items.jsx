// src/ITEMS.js
export const ITEMS = {
  // ──────────────────────────────────────────────────────────────
  //  id (exact string used in inventory / addsToInventory)
  // ──────────────────────────────────────────────────────────────
  'knights-armor': {
    image: '/ownemojis/knights-armor.webp',   // optional – real image
    emoji: 'armor',                           // optional – fallback
    name: 'Knights Armor',
    description: '10 armor',
    rarity: 'rare',          // common | uncommon | rare | epic
    cost: { woodobject: 12, rockobject: 12, gold: 20 },
    sell: { gold: 45 }
  },

  'dark-armor': {
    image: '/ownemojis/dark-armor.webp',
    emoji: 'armor',
    name: 'Dark Armor',
    description: '5 armor',
    rarity: 'uncommon',
    cost: { woodobject: 10, rockobject: 10, gold: 5 },
    sell: { gold: 15 }
  },
  'wing-armor': {
    image: '/ownemojis/wing-armor.webp',
    name: 'Wing Armor',
    description: '5 armor',
    rarity: 'uncommon',
    cost: { woodobject: 10, rockobject: 10, gold: 5 },
    sell: { gold: 15 }
  },
  'short-sword': {
    image: '/ownemojis/short-sword.webp',
    emoji: 'sword',
    name: 'Short Sword',
    description: '+3 damage',
    rarity: 'common',
    cost: { woodobject: 5, gold: 8 },
    sell: { gold: 4 }
  },

  woodobject: {
    // no image → we use the emoji from OBJECTS
    name: 'Wood',
    description: 'Basic building material',
    rarity: 'common',
    cost: {},               // not buyable
    sell: { gold: 1 }
  },

  // …add the rest of your items here
};