// src/utils/combatUtils.js
import { ITEMS } from './Items';

export const getEquippedWeaponId = (equipment) => {
  return (
    equipment.bow ||
    equipment.crossbow ||
    equipment.sword ||
    equipment.axe ||
    equipment['short-sword'] ||
    equipment.dagger ||
    equipment.fireball ||
    'fist'
  );
};
// Add this helper (scans all enemies ≤ range)
export const countEnemiesInRange = (playerPos, objects, monsterTypes, globalMonsterHealths, maxRange) => {
  let count = 0;
  for (const [key, objId] of Object.entries(objects)) {
    const [mx, my, mLevelStr] = key.split(',');
    const mLevel = Number(mLevelStr);
    // const mPos = { x: Number(mx), y: Number(my) };  // Assume you pass this
    const type = monsterTypes[objId];
    if (!type || !isMonster(type)) continue;
    if ((globalMonsterHealths[objId] ?? 100) <= 0) continue;
    // if (mLevel !== currentLevel) continue;  // Your level check
    const d = distance({ x: Number(mx), y: Number(my) }, playerPos);
    if (d <= maxRange) count++;
  }
  return count;
};

// src/utils/combatUtils.js
export const getWeaponStats = (equipment, rangeType = 'auto') => {
  let id;
  
  if (rangeType === 'melee') {
    // Prioritize melee weapons, fallback to fist
    id = equipment.sword || equipment.axe || equipment['short-sword'] || equipment.dagger || 'fist';
  } else if (rangeType === 'ranged') {
    // Ranged weapons
    id = equipment.bow || equipment.crossbow || 'fist';
  } else if (rangeType === 'spell') {
    // Spells (fireball, ice-spike, etc.)
    id = equipment.fireball || equipment['ice-spike'] || equipment['lightning-bolt'] || 'fist';
  } else {
    // 'auto' - your original logic (highest priority first)
    id = getEquippedWeaponId(equipment);
  }
  
  if (id === 'fist') {
    return { damage: { min: 40, max: 50 }, range: 1, aoeRadius: 0, isAOE: false };
  }
  
  const stats = ITEMS[id]?.stats ?? {};
  return {
    damage: stats.damage ?? { min: 5, max: 10 },
    range: stats.range ?? 1,
    aoeRadius: stats.aoeRadius || 0,
    isAOE: !!stats.isAOE,
  };
};

export const getArmorDefense = (equipment) => {
  return ITEMS[equipment.armor]?.stats?.defense ?? 0;
};