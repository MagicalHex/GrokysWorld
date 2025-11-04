// src/components/CombatSystem.jsx
import React, { useEffect, useRef, useState } from 'react';
// import { DamagePopup } from './DamagePopup';
import { subscribe } from '../utils/gameLoop';

// Random integer in [min, max] inclusive
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// -------------------------------------------------------------------
// 1. Weapon → damage table
// -------------------------------------------------------------------
const WEAPON_DAMAGE_RANGES = {
  fist:   { min:  40, max: 50 },
  dagger: { min: 12, max: 20 },
  sword:  { min: 18, max: 25 },
  crossbow: { min:  5, max:  5 },   // fixed 5 dmg – weak but safe
};

const MONSTER_DAMAGE_RANGES = {
  littlespider:     { min:  0, max: 10 },
  spider:     { min:  0, max: 15 },
  skeleton:   { min:  0, max: 20 },
  cavespider: { min:  0, max: 30 },
};

const getEquippedWeapon = (inventory) => {
  if (!inventory) return 'fist';
  if (Array.isArray(inventory)) {
    const equipped = inventory.find(item => item.equipped);
    return equipped?.type || 'fist';
  }
  if (typeof inventory === 'object') {
    if (inventory.equipped) return inventory.equipped;
    if (inventory.sword) return 'sword';
    if (inventory.dagger) return 'dagger';
    if (inventory.crossbow) return 'crossbow';
  }
  return 'fist';
};

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
  popups,
  setPopups,
  cooldownSignal,
  setCooldownSignal,
  currentLevel,
  cooldowns
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
  currentLevel
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
  currentLevel
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
  currentLevel
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

  const addPopup = (x, y, dmg, isPlayer = false, isHeal = false) => {
    const id = `${Date.now()}-${Math.random()}`;
    setPopups(prev => [...prev, { id, x, y, dmg, isPlayer, isHeal }]);
  };

  // Assign addPopup to refs
  refs.current.addPopup = addPopup;

  // === PLAYER DAMAGE TAKEN POPUP ===
  const prevHealthRef = useRef(playerHealth);
  useEffect(() => {
    if (playerHealth < prevHealthRef.current && playerHealth > 0) {
      const dmg = prevHealthRef.current - playerHealth;
      addPopup(playerPos.x, playerPos.y, dmg, true);
    }
    prevHealthRef.current = playerHealth;
  }, [playerHealth, playerPos]);

  // === HEAL POPUP FROM PARENT ===
  useEffect(() => {
    if (!healPopup) return;

    const id = `heal-${Date.now()}-${Math.random()}`;
    const popup = {
      id,
      x: healPopup.x,
      y: healPopup.y,
      dmg: healPopup.damage,
      isPlayer: false,
      isHeal: true,
    };

    setPopups(prev => [...prev, popup]);

    const timer = setTimeout(() => {
      setPopups(prev => prev.filter(p => p.id !== id));
      onHealPopupFinish?.();
    }, 1500);

    return () => clearTimeout(timer);
  }, [healPopup, onHealPopupFinish]);

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
      currentLevel
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
      if (!type || !['skeleton', 'spider', 'littlespider', 'cavespider'].includes(type)) continue;
      if ((globalMonsterHealths[objId] ?? 100) <= 0) continue;
      // if (mLevel !== currentLevel) continue; This breaks it

      const d = distance(mPos, playerPos);
      const isAdjacent = d <= 1;
      const isInRanged = d <= 3;

if (isInRanged) {
    hasMonsterInRange = true;
    if (isAdjacent) nearestRangeType = 'melee';
    else if (!nearestRangeType) nearestRangeType = 'ranged';
  }

  // === PLAYER ATTACK — ONLY ONCE PER TICK ===
  if (!attackedThisTick && 
      isInRanged && 
now - lastPlayerAttack >= (isAdjacent ? cooldowns.MELEE : cooldowns.RANGED)) {
    
    // === DO THE ATTACK ===
    const weapon = getEquippedWeapon(inventory);
    const range = isAdjacent 
      ? (WEAPON_DAMAGE_RANGES[weapon] ?? WEAPON_DAMAGE_RANGES.fist)
      : WEAPON_DAMAGE_RANGES.crossbow;
    const dmg = randInt(range.min, range.max);

    const curHealth = globalMonsterHealths[objId] ?? 100;
    const newHealth = Math.max(0, curHealth - dmg);

    onMonsterHealthChange(objId, newHealth);
    addPopup(mPos.x, mPos.y, dmg);

    if (newHealth <= 0) {
      const spiderTypes = ['spider', 'littlespider', 'cavespider'];
      newObjects[key] = spiderTypes.includes(type) && Math.random() < 0.33 ? 'spiderweb' : 'gold';
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
      if (isAdjacent && now - (lastMonsterAttack[objId] ?? 0) >= MONSTER_COOLDOWN) {
        const { min, max } = MONSTER_DAMAGE_RANGES[type] ?? MONSTER_DAMAGE_RANGES.skeleton;
        const dmg = randInt(min, max);
        onPlayerHealthChange(prev => {
          const newHealth = Math.max(0, prev - dmg);
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