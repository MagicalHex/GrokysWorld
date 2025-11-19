// src/components/Items.jsx - Updated with damage/range/stats
export const ITEMS = {
  // ──────────────────────────────────────────────────────────────
  // ARMOR (defense only)
  // ──────────────────────────────────────────────────────────────
  'knights-armor': {
    image: '/ownemojis/knights-armor.webp',
    emoji: 'armor',
    name: 'Knights Armor',
    description: '18 defense',  // ← Updated
    rarity: 'rare',
    stats: { defense: 18 },     // ← NEW: for CombatSystem
    cost: { woodobject: 12, rockobject: 12, gold: 20 },
    sell: { gold: 45 }
  },
  'dark-armor': {
    image: '/ownemojis/dark-armor.webp',
    emoji: 'armor',
    name: 'Dark Armor',
    description: '25 defense',  // ← Updated
    rarity: 'epic',
    stats: { defense: 25 },
    cost: { woodobject: 10, rockobject: 10, gold: 5 },
    sell: { gold: 80 }
  },
  'wing-armor': {
    image: '/ownemojis/wing-armor.webp',
    name: 'Wing Armor',
    description: '30 defense',  // ← Updated
    rarity: 'legendary',
    stats: { defense: 30 },
    cost: { woodobject: 10, rockobject: 10, gold: 5 },
    sell: { gold: 120 }
  },

  // ──────────────────────────────────────────────────────────────
  // WEAPONS (damage + range)
  // ──────────────────────────────────────────────────────────────
    fist: {
    emoji: 'fist',
    name: 'Fist',
    description: '12-20 damage',
    rarity: 'common',
    stats: { 
      damage: { min: 50, max: 50 },
      range: 1,
      isAOE: false,
    },
    sell: { gold: 10 }
  },
  'short-sword': {
    image: '/ownemojis/short-sword.webp',
    emoji: 'sword',
    name: 'Short Sword',
    description: '10-18 damage',  // ← Updated
    rarity: 'common',
    stats: { 
      damage: { min: 10, max: 18 },  // ← NEW
      range: 1,
      isAOE: false,
    },
    cost: { woodobject: 5, gold: 8 },
    sell: { gold: 4 }
  },
  dagger: {
    image: '/ownemojis/dagger.webp',
    name: 'Dagger',
    description: '12-20 damage',
    rarity: 'common',
    stats: { 
      damage: { min: 12, max: 20 },
      range: 1,
      isAOE: false,
    },
    sell: { gold: 10 }
  },
  sword: {
    image: '/ownemojis/sword.webp',
    name: 'Sword',
    description: '18-25 damage',
    rarity: 'uncommon',
    stats: { 
      damage: { min: 18, max: 25 },
      range: 1,
      isAOE: false,
    },
    sell: { gold: 25 }
  },
  axe: {
    image: '/ownemojis/axe.webp',
    name: 'Axe',
    description: '22-32 damage',
    rarity: 'rare',
    stats: { 
      damage: { min: 22, max: 32 },
      range: 1,
      isAOE: false,
    },
    sell: { gold: 40 }
  },
  bow: {
    image: '/ownemojis/bow.webp',
    name: 'Bow',
    description: '15-28 damage, 5 range',  // ← Updated
    rarity: 'uncommon',
    stats: { 
      damage: { min: 15, max: 28 },
      range: 4,
      isAOE: false,
    },
    sell: { gold: 20 }
  },
  crossbow: {
    image: '/ownemojis/crossbow.webp',
    name: 'Crossbow',
    description: '5-70 damage, 3 range',
    rarity: 'rare',
    stats: { 
      damage: { min: 5, max: 70 },
      range: 3,
      isAOE: false,
    },
    sell: { gold: 50 }
  },
  // ──────────────────────────────────────────────────────────────
  // SPELLS
  // ──────────────────────────────────────────────────────────────
fireball: {
  emoji: '🔥',
  name: 'Fireball',
  description: '8 AOE dmg (2+ enemies ≤10 tiles)',
  rarity: 'rare',
  stats: {
    damage: { min: 8, max: 8 },  // Fixed 8 dmg per enemy in AOE
    range: 10,                   // Max flight distance
    aoeRadius: 2.5,              // Explosion radius
    isAOE: true,                 // ← Special flag for crowd logic
  },
  cost: { gold: 50 },  // Or whatever
  sell: { gold: 20 }
},
  // ──────────────────────────────────────────────────────────────
  // NON-EQUIPMENT
  // ──────────────────────────────────────────────────────────────
  woodobject: {
    name: 'Wood',
    description: 'Basic building material',
    rarity: 'common',
    cost: {},
    sell: { gold: 1 }
  },
  // ... add rest
};