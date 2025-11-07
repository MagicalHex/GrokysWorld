// src/utils/monsterRegistry.js
import MONSTER_DATA from '../../public/data/monsters.json';

// Single source: all valid monster types
export const MONSTER_TYPES = Object.keys(MONSTER_DATA);

// Helper: is this a monster?
export const isMonster = (type) => MONSTER_TYPES.includes(type);

// Get monster config
export const getMonsterData = (type) => MONSTER_DATA[type] || null;