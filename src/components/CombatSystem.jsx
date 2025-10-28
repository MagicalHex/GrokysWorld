// src/components/CombatSystem.jsx
import React, { useEffect, useRef, useState } from 'react';
import { DamagePopup } from './DamagePopup';   // <-- we’ll create this next

// Random integer in [min, max] inclusive
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// -------------------------------------------------------------------
// 1. Weapon → damage table (feel free to move this to a constants file)
// -------------------------------------------------------------------
// PLAYER WEAPONS
const WEAPON_DAMAGE_RANGES = {
  fist:   { min:  8, max: 15 },
  dagger: { min: 12, max: 20 },
  sword:  { min: 18, max: 25 },
};

// MONSTERS
const MONSTER_DAMAGE_RANGES = {
  skeleton: { min:  5, max: 20 },
  spider:   { min:  0, max: 15 },   // as requested
};

const getEquippedWeapon = (inventory) => {
  // Safety: if inventory is null/undefined, default to fist
  if (!inventory) return 'fist';

  // Case 1: Array of items → find one with .equipped = true
  if (Array.isArray(inventory)) {
    const equipped = inventory.find(item => item.equipped);
    return equipped?.type || 'fist';
  }

  // Case 2: Object with direct keys → look for truthy "equipped" weapon
  if (typeof inventory === 'object') {
    // Example: { sword: true }, { equipped: 'dagger' }, etc.
    if (inventory.equipped) return inventory.equipped;
    if (inventory.sword) return 'sword';
    if (inventory.dagger) return 'dagger';
    // add more as needed
  }

  return 'fist'; // fallback
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
  inventory,               // <-- NEW PROP
  healPopup,
  onHealPopupFinish
}) {
  const distance = (p1, p2) => Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y);
  const lastPlayerAttack = useRef(0);
  const lastMonsterAttack = useRef({});
  const PLAYER_COOLDOWN = 1500;
  const MONSTER_COOLDOWN = 3000;

  // -----------------------------------------------------------------
  // 2. Damage-popups state (array of {id, x, y, dmg, isPlayer})
  // -----------------------------------------------------------------
  const [popups, setPopups] = useState([]);

  const addPopup = (x, y, dmg, isPlayer = false) => {
    const id = `${Date.now()}-${Math.random()}`;
    setPopups(prev => [...prev, { id, x, y, dmg, isPlayer }]);
  };

  // ADD THIS useEffect in CombatSystem
const prevHealthRef = useRef(playerHealth);

useEffect(() => {
  if (playerHealth < prevHealthRef.current && playerHealth > 0) {
    const dmg = prevHealthRef.current - playerHealth;
    addPopup(playerPos.x, playerPos.y, dmg, true);
  }
  prevHealthRef.current = playerHealth;
}, [playerHealth, playerPos]);
  // -----------------------------------------------------------------
// 2.1 HANDLE HEAL POPUP FROM PARENT
// -----------------------------------------------------------------
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

  // Auto-remove after animation (1.5s total)
  const timer = setTimeout(() => {
    setPopups(prev => prev.filter(p => p.id !== id));
    onHealPopupFinish?.();
  }, 1500);

  return () => clearTimeout(timer);
}, [healPopup, onHealPopupFinish]);
  // -----------------------------------------------------------------
  // 3. Combat loop
  // -----------------------------------------------------------------
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const newObjects = { ...objects };
      let objectsChanged = false;

      // ---- PLAYER WEAPON -------------------------------------------------
      // const weapon = getEquippedWeapon(inventory);
      // const playerDmg = WEAPON_DAMAGE[weapon] ?? WEAPON_DAMAGE.fist;

      Object.entries(objects).forEach(([key, monsterId]) => {
        const type = monsterTypes[monsterId];
        if (!['skeleton', 'spider'].includes(type)) return;
        if ((globalMonsterHealths[monsterId] ?? 100) <= 0) return;

        const [mx, my] = key.split(',').map(Number);
        const isAdjacent = distance({ x: mx, y: my }, playerPos) === 1;

        // ==================== PLAYER ATTACK ====================
// === PLAYER ATTACK ===
if (
  !isDead &&
  isAdjacent &&
  now - lastPlayerAttack.current >= PLAYER_COOLDOWN
) {
  const weapon = getEquippedWeapon(inventory);
  const { min, max } = WEAPON_DAMAGE_RANGES[weapon] ?? WEAPON_DAMAGE_RANGES.fist;
  const dmg = randInt(min, max);

  const curHealth = globalMonsterHealths[monsterId] ?? 100;
  const newHealth = Math.max(0, curHealth - dmg);

  onMonsterHealthChange(monsterId, newHealth);
  addPopup(mx, my, dmg);   // show the *actual* rolled damage

  if (newHealth <= 0) {
    newObjects[key] = 'gold';
    objectsChanged = true;
  }

  lastPlayerAttack.current = now;
}
// === MONSTER ATTACK ===
if (
  !isDead &&
  isAdjacent &&
  now - (lastMonsterAttack.current[monsterId] ?? 0) >= MONSTER_COOLDOWN
) {
  const { min, max } = MONSTER_DAMAGE_RANGES[type] ?? MONSTER_DAMAGE_RANGES.skeleton;
  const dmg = randInt(min, max);

  onPlayerHealthChange(prev => Math.max(0, prev - dmg));

  // onPlayerHealthChange(prev => {
  //   const newHealth = Math.max(0, prev - dmg);
  //   if (newHealth <= 0 && !isDead) setIsDead(true);
  //   addPopup(playerPos.x, playerPos.y, dmg, true);
  //   return newHealth;
  // });

  lastMonsterAttack.current[monsterId] = now;
}
      });

      if (objectsChanged) onObjectsChange(newObjects);
    }, 500);

    return () => clearInterval(interval);
  }, [
    playerPos,
    playerHealth,
    onPlayerHealthChange,
    objects,
    globalMonsterHealths,
    monsterTypes,
    onMonsterHealthChange,
    onObjectsChange,
    isDead,
    setIsDead,
    inventory,
    healPopup,
  onHealPopupFinish,
  ]);

  // -----------------------------------------------------------------
  // 4. Player death → dove
  // -----------------------------------------------------------------
  useEffect(() => {
    if (playerHealth > 0 || !isDead) return;
    const newObjects = { ...objects };
    const pk = `${playerPos.x},${playerPos.y}`;
    if (newObjects[pk] === 'player') {
      delete newObjects[pk];
      newObjects[pk] = 'dove';
      onObjectsChange(newObjects);
    }
  }, [playerHealth, playerPos, objects, onObjectsChange, isDead]);

  // -----------------------------------------------------------------
  // 5. Render popups (they live inside the tile-map coordinate system)
  // -----------------------------------------------------------------
return (
  <>
    {popups.map(p => (
      <DamagePopup
        key={p.id}
        x={p.x}
        y={p.y}
        damage={p.dmg}
        isPlayer={p.isPlayer}
        isHeal={p.isHeal}  // NEW
        onFinish={() => setPopups(prev => prev.filter(x => x.id !== p.id))}
      />
    ))}
  </>
);
}