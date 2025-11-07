// splitInventory.js or inline in PlayerInventory
import { ITEMS } from './Items';

const CATEGORY_SET = {
  bow:   new Set(['bow']),
  armor: new Set(['knights-armor','dark-armor','wing-armor']),
  sword: new Set(['dagger','sword','axe','short-sword']),
};

const getStat = (id, type) => ITEMS[id]?.stats?.[type] || 0;

export const splitInventory = (raw) => {
  const equip = {};
  const inv = { ...raw };
  const candidates = { bow: [], armor: [], sword: [] };

  // Build candidate lists
  for (const id of Object.keys(raw)) {
    const qty = raw[id];
    if (qty <= 0) continue;

    if (CATEGORY_SET.bow.has(id))   for (let i = 0; i < qty; i++) candidates.bow.push(id);
    if (CATEGORY_SET.armor.has(id)) for (let i = 0; i < qty; i++) candidates.armor.push(id);
    if (CATEGORY_SET.sword.has(id)) for (let i = 0; i < qty; i++) candidates.sword.push(id);
  }

  const pickBest = (ids, stat) => {
    if (ids.length === 0) return undefined;
    return ids.reduce((a, b) => getStat(b, stat) > getStat(a, stat) ? b : a);
  };

  const bestBow = pickBest(candidates.bow, 'attack');
  if (bestBow) { equip.bow = bestBow; inv[bestBow] = (inv[bestBow] || 0) - 1; }

  const bestArmor = pickBest(candidates.armor, 'defense');
  if (bestArmor) { equip.armor = bestArmor; inv[bestArmor] = (inv[bestArmor] || 0) - 1; }

  const bestSword = pickBest(candidates.sword, 'attack');
  if (bestSword) { equip.sword = bestSword; inv[bestSword] = (inv[bestSword] || 0) - 1; }

  // Clean up zeros
  Object.keys(inv).forEach(k => {
    if (inv[k] <= 0) delete inv[k];
  });

  return { equipment: equip, inventory: inv };
};