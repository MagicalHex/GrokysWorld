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
    isHeal: true,
    isPlayer: true
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
  // Throttled logger (once every 3 sec)
// Put this once at the top of your file
const logCombat = (() => {
  let lastBatch = 0;
  const queue = [];

  const flush = () => {
    if (queue.length > 0 && Date.now() - lastBatch > 3000) {
      console.log('%c[COMBAT BATCH]', 'color: #ffaa00; font-weight: bold;');
      queue.forEach(msg => console.log(`   ${msg}`));
      queue.length = 0;
      lastBatch = Date.now();
    }
  };

  return (msg) => {
    queue.push(msg);
    flush();
  };
})();
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

let hasMonsterInRange = false; // Check if monster is in range of any attack
let nearestRangeType = null; // 'melee', 'ranged' or 'spell'
let hasManyMonstersInRange = 0;  // count ≥2 for fireball
let hasMonsterInSpellRange = false;  // any ≤10 tiles

const weaponStats = getWeaponStats(equipment, nearestRangeType);
let weaponRange = weaponStats.range || 1;
let isSpell = weaponStats.isAOE ?? false;

// TEMP TEST: FORCE FIREBALL TO PROVE COUNTER WORKS
// ← Remove these 2 lines after test succeeds
// weaponRange = 10;
// isSpell = true;

// THIS IS THE ONLY DEBUG YOU NEED
logCombat(`WEAPON: ${JSON.stringify({
  range: weaponRange,
  isAOE: weaponStats.isAOE,
  isSpell: isSpell,
  rawStats: weaponStats
})}`);
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

const isInWeaponRange = d <= weaponRange;
const isAdjacent = d <= 1;

if (isInWeaponRange) {
    hasMonsterInRange = true;
    hasManyMonstersInRange++;

    if (isAdjacent) nearestRangeType = 'melee';
    else nearestRangeType = isSpell ? 'spell' : 'ranged';
    
    logCombat(`IN RANGE! Type: ${nearestRangeType} | hasMany: ${hasManyMonstersInRange}`);
  }

  const weaponStats = getWeaponStats(equipment, nearestRangeType);
  
// === PLAYER ATTACK — ONLY ONCE PER TICK (but AOE hits ALL!) ===
if (!attackedThisTick && hasMonsterInRange) {
  logCombat(`ATTACK CHECK | attackedThisTick: ${attackedThisTick} | hasMonsterInRange: ${hasMonsterInRange} | nearestRangeType: ${nearestRangeType}`);
  
  const isMeleeAttack = nearestRangeType === 'melee';
  const cooldownKey = isMeleeAttack ? cooldowns.MELEE : cooldowns.RANGED;

  logCombat(`cooldownKey: ${cooldownKey} | now-lastAttack: ${now - lastPlayerAttack}`);

  if (now - lastPlayerAttack >= cooldownKey) {
    logCombat(`✅ ATTACK FIRED! isSpell: ${isSpell} | targets collecting...`);
    
    // === COLLECT ALL VALID TARGETS ===
    const targets = [];
    
    for (const [key, objId] of Object.entries(objects)) {
      const [mx, my, mLevelStr] = key.split(',');
      const mPos = { x: Number(mx), y: Number(my) };
      
      const type = monsterTypes[objId];
      if (!type || !isMonster(type)) continue;
      if ((globalMonsterHealths[objId] ?? 100) <= 0) continue;

      const d = distance(mPos, playerPos);
      if (d <= weaponRange) {
        targets.push({ objId, mPos, key, type, distance: d });
      }
    }

    logCombat(`Found ${targets.length} targets`);

    // === AOE vs SINGLE TARGET ===
    const hitAll = isSpell; // Fireball = true
    const finalTargets = hitAll ? targets : [targets[0]]; // Single = first only

    logCombat(`Final targets: ${finalTargets.length} (AOE: ${hitAll})`);

    // === ATTACK ALL FINAL TARGETS ===
    finalTargets.forEach(({ objId, mPos, key, type }) => {
      logCombat(`→ Hitting ${objId}`);
      
      // 1 in 8 chance to crit (12.5%)
      const isCrit = Math.random() < 1/8;
      const { min: dmgMin, max: dmgMax } = weaponStats.damage;
      const dmg = isCrit ? dmgMax * 2 : randInt(dmgMin, dmgMax);

      const curHealth = globalMonsterHealths[objId] ?? 100;
      const newHealth = Math.max(0, curHealth - dmg);

      // 1. Damage popup (immediate)
      addPopup({
        x: mPos.x,
        y: mPos.y,
        dmg,
        isCrit,
        monsterId: objId,
      });

      // 2. Apply damage
      onMonsterHealthChange(objId, newHealth);

      // 3. Handle death + XP/loot
      if (newHealth <= 0) {
        const monster = monsterData[type];
        if (!monster) {
          console.warn(`No monster data for type: ${type}`);
          newObjects[key] = 'gold';
          objectsChanged = true;
          return; // continue in forEach
        }

        // XP (timeout for smooth UI)
        setTimeout(() => {
          const xpRange = monster.xp || [0, 0];
          const xpGained = Math.floor(Math.random() * (xpRange[1] - xpRange[0] + 1)) + xpRange[0];
          if (xpGained > 0 && refs.current.addPopup) {
            refs.current.addPopup({
              dmg: xpGained,
              isXP: true,
              isPlayer: true
            });
          }
        }, 300);

        // Loot drops
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

        // Pick one drop (or default gold)
        const droppedItem = drops.length > 0 ? drops[Math.floor(Math.random() * drops.length)] : 'gold';
        newObjects[key] = droppedItem;
        objectsChanged = true;
      }
    });

    // === ONE ATTACK ACTION (cooldown triggers once) ===
    lastPlayerAttack = now;
    attackedThisTick = true;
    attackCooldownType = isMeleeAttack ? 'melee' : 'ranged';
    setCooldownSignal({ active: true, type: attackCooldownType });
  }
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