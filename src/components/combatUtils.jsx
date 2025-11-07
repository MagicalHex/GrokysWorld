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
    'fist'
  );
};

export const getWeaponStats = (equipment) => {
  const id = getEquippedWeaponId(equipment);
  if (id === 'fist') return { damage: { min: 40, max: 50 }, range: 1 };

  const stats = ITEMS[id]?.stats ?? {};
  return {
    damage: stats.damage ?? { min: 5, max: 10 },
    range: stats.range ?? 1,
  };
};

export const getArmorDefense = (equipment) => {
  return ITEMS[equipment.armor]?.stats?.defense ?? 0;
};