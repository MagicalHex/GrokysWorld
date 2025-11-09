// src/components/CombatSystem.jsx
import React, { useEffect, useRef, useState } from 'react';
// import { DamagePopup } from './DamagePopup';
import { subscribe } from '../utils/gameLoop';
import { ITEMS } from './Items';

import { isMonster } from '../utils/monsterRegistry';

import {
  getWeaponStats,
  getArmorDefense
} from './combatUtils';

// Random integer in [min, max] inclusive
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// ---------------------------------------------------------------------

// Monster stats (hardcoded for now - can move to separate file later)
// const getMonsterStats = (type) => ({
//   littlespider:  { min:  0, max: 10, range: 1 },
//   spider:        { min:  0, max: 15, range: 1 },
//   skeleton:      { min:  0, max: 20, range: 1 },
//   cavespider:    { min:  0, max: 30, range: 1 },
//   demonspider:   { min: 20, max: 70, range: 3 },
//   deadshriek:    { min: 15, max: 70, range: 4 }
// }[type] || { min: 0, max: 20, range: 1 });

export default function CombatSystem({
  playerPos,
  playerHealth,
  onPlayerHealthChange,
  objects,
  globalMonsterHealths,
  monsterTypes,
  onMonsterHealthChange,
  onObjectsChange,
  onQueueRespawn,
  originalSpawns = {},
  isDead,
  setIsDead,
  inventory,
  healPopup,
  onHealPopupFinish,
  setLastDamageTime,
  addPopup,
  popups,
  setPopups,
  cooldownSignal,
  setCooldownSignal,
  currentLevel,
  cooldowns,
  monsterData,
  playerXp,
  setPlayerXp,
  equipment
}) {
  // const distance = (p1, p2) => Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y);
  const distance = (p1, p2) => {
  const dx = Math.abs(p1.x - p2.x);
  const dy = Math.abs(p1.y - p2.y);
  return Math.max(dx, dy); // CHEBYSHEV DISTANCE!
};

  // === REFS TO HOLD LATEST VALUES ===
  const refs = useRef({
    playerPos,
    playerHealth,
    objects,
    globalMonsterHealths,
    monsterTypes,
    onPlayerHealthChange,
    onMonsterHealthChange,
    onObjectsChange,
    isDead,
    setIsDead,
    inventory,
    addPopup: null, // will be set below
      cooldownSignal,
  setCooldownSignal,
  currentLevel,
  equipment
  });

  // Update refs on every render
  useEffect(() => {
    refs.current = {
      playerPos,
      playerHealth,
      objects,
      globalMonsterHealths,
      monsterTypes,
      onPlayerHealthChange,
      onMonsterHealthChange,
      onObjectsChange,
      isDead,
      setIsDead,
      inventory,
      addPopup: refs.current.addPopup, // preserve function
        cooldownSignal,
  setCooldownSignal,
  currentLevel,
  equipment
    };
  }, [
    playerPos,
    playerHealth,
    objects,
    globalMonsterHealths,
    monsterTypes,
    onPlayerHealthChange,
    onMonsterHealthChange,
    onObjectsChange,
    isDead,
    setIsDead,
    inventory,
    setPopups,
    popups,
      cooldownSignal,
  setCooldownSignal,
  currentLevel,
  equipment
  ]);

  // === DAMAGE POPUPS ===
  // const [popups, setPopups] = useState([]);

    // === PLAYER DEATH → DOVE ===
  useEffect(() => {
    if (playerHealth > 0 || !isDead) return;
    const { objects, onObjectsChange, playerPos } = refs.current;
    const newObjects = { ...objects };
    const pk = `${playerPos.x},${playerPos.y}`;
    if (newObjects[pk] === 'player') {
      delete newObjects[pk];
      newObjects[pk] = 'dove';
      onObjectsChange(newObjects);
    }
  }, [playerHealth, isDead]);

  // const addPopup = (x, y, dmg, isPlayer = false, isHeal = false) => {
  //   const id = `${Date.now()}-${Math.random()}`;
  //   setPopups(prev => [...prev, { id, x, y, dmg, isPlayer, isHeal }]);
  // };

  // Assign addPopup to refs
  refs.current.addPopup = addPopup;

  // === PLAYER DAMAGE TAKEN POPUP ===
  const prevHealthRef = useRef(playerHealth);
  useEffect(() => {
    if (playerHealth < prevHealthRef.current && playerHealth > 0) {
      const dmg = prevHealthRef.current - playerHealth;
      addPopup({
  x: playerPos.x,
  y: playerPos.y,
  dmg,
  isPlayer: true
});
    }
    prevHealthRef.current = playerHealth;
  }, [playerHealth, playerPos]);

  // === HEAL POPUP FROM PARENT ===
useEffect(() => {
  if (!healPopup) return;

  addPopup({
    x: healPopup.x,
    y: healPopup.y,
    dmg: healPopup.damage,
    isHeal: true
  });

  const timer = setTimeout(() => {
    onHealPopupFinish?.();
  }, 1500);

  return () => clearTimeout(timer);
}, [healPopup, onHealPopupFinish, addPopup]);

// Inside your CombatSystem component (attack loop/tick)
useEffect(() => {
  // Log ONCE when equipment changes
  // console.log('🎮 COMBAT SYSTEM - Equipment:', equipment);
  const weaponStats = getWeaponStats(equipment);
  const armorDefense = getArmorDefense(equipment);
  
  // console.log('⚔️  WEAPON STATS:', weaponStats);
  // console.log('🛡️  ARMOR DEFENSE:', armorDefense);
}, [equipment]); // Re-run when equipment changes
  // === MAIN COMBAT LOOP (via gameLoop) ===
useEffect(() => {
  // === Used for both attacks (here) and CooldownBar (PlayMode) to reset. ===
  // const PLAYER_COOLDOWN = 1500;
  // const PLAYER_RANGED_COOLDOWN = 5000;
  const MONSTER_COOLDOWN = 3000;

  let lastPlayerAttack = 0;
  const lastMonsterAttack = {};
  
  // Track current cooldown state to avoid unnecessary setState
  let currentCooldown = { active: false, type: null };

  const unsubscribe = subscribe((delta, time) => {
    const now = performance.now();
    const {
      playerPos,
      objects,
      globalMonsterHealths,
      monsterTypes,
      onMonsterHealthChange,
      onObjectsChange,
      onPlayerHealthChange,
      isDead,
      inventory,
      addPopup,
      setCooldownSignal,
      currentLevel,
      equipment
    } = refs.current;

    if (isDead) return;

    let attackedThisTick = false; // Reset every frame
let attackCooldownType = null;

    const newObjects = { ...objects };
    let objectsChanged = false;
    let attacked = false;

    let hasMonsterInRange = false;
    let nearestRangeType = null; // 'melee' or 'ranged'

    // === SINGLE PASS: Scan + Attack ===
    for (const [key, objId] of Object.entries(objects)) {
      const [mx, my, mLevelStr] = key.split(',');
      const mLevel = Number(mLevelStr);
      const mPos = { x: Number(mx), y: Number(my) };

      // Skip non-monsters, dead, or wrong level
      const type = monsterTypes[objId];
      if (!type || !isMonster(type)) continue;
      if ((globalMonsterHealths[objId] ?? 100) <= 0) continue;
      // if (mLevel !== currentLevel) continue; This breaks it

// 1. PLAYER ATTACK - Updated to use dynamic weapon range/damage
const d = distance(mPos, playerPos);
// const weapon = getEquippedWeapon(inventory);  // Gets 'bow', 'sword', etc.
const weaponStats = getWeaponStats(equipment);  // { damage: {min,max}, range }
const weaponRange = weaponStats.range || 1;
const isInWeaponRange = d <= weaponRange;
const isAdjacent = d <= 1;

if (isInWeaponRange) {
  hasMonsterInRange = true;
  if (isAdjacent) nearestRangeType = 'melee';
  else if (!nearestRangeType) nearestRangeType = 'ranged';
}

// === PLAYER ATTACK — ONLY ONCE PER TICK ===
if (!attackedThisTick && 
    isInWeaponRange && 
    now - lastPlayerAttack >= (isAdjacent ? cooldowns.MELEE : cooldowns.RANGED)) {
  // 1 in 8 chance to crit (12.5%)
  const isCrit = Math.random() < 1/8;   // ← 1/8 = 0.125

  const { min: dmgMin, max: dmgMax } = weaponStats.damage;
  const dmg = isCrit
    ? dmgMax * 2                     // Crit: double max
    : randInt(dmgMin, dmgMax);       // Normal: random in range

  // console.log(`Player ${isCrit ? 'CRITICAL!' : ''} → ${dmg} dmg`);

  const curHealth = globalMonsterHealths[objId] ?? 100;
  const newHealth = Math.max(0, curHealth - dmg);

  // 1. Damage popup (immediate)
  addPopup({
    x: mPos.x,
    y: mPos.y,
    dmg,
    isCrit,
  });

  // 2. Apply damage
  onMonsterHealthChange(objId, newHealth);

if (newHealth <= 0) {
  const monster = monsterData[type];
  if (!monster) {
    console.warn(`No monster data for type: ${type}`);
    newObjects[key] = 'gold';
    objectsChanged = true;
    continue;
  }

  // 1. Handle XP
  setTimeout(() => {
  const xpRange = monster.xp || [0, 0];
  const xpGained = Math.floor(Math.random() * (xpRange[1] - xpRange[0] + 1)) + xpRange[0];
  if (xpGained > 0) {
    addPopup({
      x: playerPos.x,
      y: playerPos.y,
      dmg: xpGained,
      isXP: true
      });
      // Add to give player XP here
    }
  }, 300);      // <-- 300 ms delay (tweak as you like)


  // 2. Handle loot drops
  const drops = [];
  (monster.loot || []).forEach(item => {
    if (Math.random() < (item.chance || 1.0)) {
      const amount = item.min !== undefined && item.max !== undefined
        ? Math.floor(Math.random() * (item.max - item.min + 1)) + item.min
        : 1;
      for (let i = 0; i < amount; i++) {
        drops.push(item.id);
      }
    }
  });

  // 3. Pick one drop (or default to gold)
  const droppedItem = drops.length > 0 ? drops[Math.floor(Math.random() * drops.length)] : 'gold';
  newObjects[key] = droppedItem;
  objectsChanged = true;
}

    // === ONE-SHOT: ATTACK DONE ===
    lastPlayerAttack = now;
    attackedThisTick = true;
    attackCooldownType = isAdjacent ? 'melee' : 'ranged';

    // 🔥 CRITICAL: ONE-TIME SIGNAL → BAR OWNS THE REST
    setCooldownSignal({ active: true, type: attackCooldownType });
      }

// === MONSTER ATTACK ===
const monster = monsterData[type];
if (!monster) {
  console.warn(`No monster data for type: ${type}`);
  continue; // skip
}

const { damage, range: monsterRange = 1 } = monster;
if (!damage) {
  console.warn(`No damage defined for ${type}, using fallback`);
  damage = { min: 5, max: 10 };
}

// const d = distance(mPos, playerPos);

if (d <= monsterRange && now - (lastMonsterAttack[objId] ?? 0) >= MONSTER_COOLDOWN) {
  const rawDmg = randInt(damage.min, damage.max);
  const armorDefense = getArmorDefense(equipment);
  const finalDmg = Math.max(1, rawDmg - armorDefense);

  // console.log(`Monster ${type}: ${rawDmg} - ${armorDefense} = ${finalDmg} dmg → player`);

  onPlayerHealthChange(prev => {
    const newHealth = Math.max(0, prev - finalDmg);
    if (newHealth < prev) refs.current.setLastDamageTime?.(Date.now());
    if (newHealth <= 0 && !refs.current.isDead) refs.current.setIsDead(true);
    return newHealth;
  });

  lastMonsterAttack[objId] = now;
}
    }

    if (objectsChanged) onObjectsChange(newObjects);

    // === UPDATE COOLDOWN BAR: only if needed ===
    if (!hasMonsterInRange && currentCooldown.active) {
      currentCooldown = { active: false, type: null };
      setCooldownSignal(currentCooldown);
    } else if (hasMonsterInRange && !currentCooldown.active && nearestRangeType) {
      // Optional: auto-activate visual if in range but not attacking
      // Or leave it to attack trigger
    }
  });

  return unsubscribe;
}, []);

}