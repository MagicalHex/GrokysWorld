// src/components/CombatSystem.jsx
import React, { useEffect, useRef, useState } from 'react';
import { DamagePopup } from './DamagePopup';
import { subscribe } from '../utils/gameLoop';

// Random integer in [min, max] inclusive
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// -------------------------------------------------------------------
// 1. Weapon → damage table
// -------------------------------------------------------------------
const WEAPON_DAMAGE_RANGES = {
  fist:   { min:  8, max: 15 },
  dagger: { min: 12, max: 20 },
  sword:  { min: 18, max: 25 },
};

const MONSTER_DAMAGE_RANGES = {
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
  onDamageTaken
}) {
  const distance = (p1, p2) => Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y);

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
      onDamageTaken
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
    onDamageTaken
  ]);

  // === DAMAGE POPUPS ===
  const [popups, setPopups] = useState([]);

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
    const PLAYER_COOLDOWN = 1500;
    const MONSTER_COOLDOWN = 3000;

    let lastPlayerAttack = 0;
    const lastMonsterAttack = {};

    const unsubscribe = subscribe((delta, time) => {
      const now = time;
      const {
        playerPos,
        objects,
        globalMonsterHealths,
        monsterTypes,
        onMonsterHealthChange,
        onObjectsChange,
        onPlayerHealthChange,
        isDead,
        setIsDead,
        inventory,
        addPopup,
      } = refs.current;

      if (isDead) return;

      const newObjects = { ...objects };
      let objectsChanged = false;

      Object.entries(objects).forEach(([key, monsterId]) => {
        const type = monsterTypes[monsterId];
        if (!['skeleton', 'spider', 'cavespider'].includes(type)) return;
        if ((globalMonsterHealths[monsterId] ?? 100) <= 0) return;

        const [mx, my] = key.split(',').map(Number);
        const isAdjacent = distance({ x: mx, y: my }, playerPos) === 1;

        // === PLAYER ATTACK ===
        if (
          isAdjacent &&
          now - lastPlayerAttack >= PLAYER_COOLDOWN
        ) {
          const weapon = getEquippedWeapon(inventory);
          const { min, max } = WEAPON_DAMAGE_RANGES[weapon] ?? WEAPON_DAMAGE_RANGES.fist;
          const dmg = randInt(min, max);

          const curHealth = globalMonsterHealths[monsterId] ?? 100;
          const newHealth = Math.max(0, curHealth - dmg);

          onMonsterHealthChange(monsterId, newHealth);
          addPopup(mx, my, dmg);

          if (newHealth <= 0) {
            newObjects[key] = 'gold';
            objectsChanged = true;
          }

          lastPlayerAttack = now;
        }

        // === MONSTER ATTACK ===
if (
  isAdjacent &&
  now - (lastMonsterAttack[monsterId] ?? 0) >= MONSTER_COOLDOWN
) {
  const { min, max } = MONSTER_DAMAGE_RANGES[type] ?? MONSTER_DAMAGE_RANGES.skeleton;
  const dmg = randInt(min, max);

  onPlayerHealthChange(prev => {
    const newHealth = Math.max(0, prev - dmg);
    if (newHealth <= 0 && !isDead) setIsDead(true);
    
    // TELL REGEN SYSTEM: "PLAYER GOT HIT!"
    if (newHealth < prev && onDamageTaken) {
      onDamageTaken();
    }

    return newHealth;
  });

  lastMonsterAttack[monsterId] = now;
}
      });

      if (objectsChanged) {
        onObjectsChange(newObjects);
      }
    });

    return unsubscribe;
  }, []); // ← Runs ONCE

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

  // === RENDER POPUPS ===
  return (
    <>
      {popups.map(p => (
        <DamagePopup
          key={p.id}
          x={p.x}
          y={p.y}
          damage={p.dmg}
          isPlayer={p.isPlayer}
          isHeal={p.isHeal}
          onFinish={() => setPopups(prev => prev.filter(x => x.id !== p.id))}
        />
      ))}
    </>
  );
}