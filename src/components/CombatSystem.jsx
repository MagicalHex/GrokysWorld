// src/components/CombatSystem.jsx
import React, { useEffect, useRef } from 'react';

const CombatSystem = ({
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
}) => {
  const distance = (p1, p2) => Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y);
  const lastPlayerAttack = useRef(0);
  const lastMonsterAttack = useRef({});
  const PLAYER_COOLDOWN = 1500; // Player attacks every 1.5s
  const MONSTER_COOLDOWN = 3000; // Monsters attack every 3s

  useEffect(() => {
    console.log('[CombatSystem] globalMonsterHealths:', globalMonsterHealths);
    console.log('[CombatSystem] monsterTypes:', monsterTypes);
  }, [globalMonsterHealths, monsterTypes]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const newObjects = { ...objects };
      let objectsChanged = false;

      Object.entries(objects).forEach(([key, monsterId]) => {
        const type = monsterTypes[monsterId];
        if (!['skeleton', 'spider'].includes(type)) return;
        if ((globalMonsterHealths[monsterId] ?? 100) <= 0) return;

        const [mx, my] = key.split(',').map(Number);
        const isAdjacent = distance({ x: mx, y: my }, playerPos) === 1;

        // === PLAYER ATTACK ===
        if (isAdjacent && now - lastPlayerAttack.current >= PLAYER_COOLDOWN) {
          const dmg = type === 'skeleton' ? 20 : 25;
          console.log('[CombatSystem] Player attacks', type, 'at key:', key, 'id:', monsterId);
          if (globalMonsterHealths[monsterId] === undefined) {
            console.log('[CombatSystem] Initializing health for', monsterId);
            onMonsterHealthChange(monsterId, 100);
          }
          console.log('  → Current health:', globalMonsterHealths[monsterId] ?? 100);
          console.log('  → Damage:', dmg);
          const newHealth = Math.max(0, (globalMonsterHealths[monsterId] ?? 100) - dmg);
          console.log('  → Setting health to:', newHealth);
          onMonsterHealthChange(monsterId, newHealth);
          console.log('  → onMonsterHealthChange called');

          if (newHealth <= 0) {
            // Transform spider into loot
            newObjects[key] = 'gold';
            objectsChanged = true;
          }

          lastPlayerAttack.current = now;
        }

        // === MONSTER ATTACK ===
        if (isAdjacent && now - (lastMonsterAttack.current[monsterId] ?? 0) >= MONSTER_COOLDOWN) {
          const dmg = type === 'skeleton' ? 10 : 15;
          onPlayerHealthChange((prev) => {
            const newHealth = Math.max(0, prev - dmg);
            if (newHealth <= 0 && !isDead) setIsDead(true);
            return newHealth;
          });
          lastMonsterAttack.current[monsterId] = now;
        }
      });

      if (objectsChanged) {
        onObjectsChange(newObjects);
      }
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
    onQueueRespawn,
    originalSpawns,
    isDead,
    setIsDead,
  ]);

  useEffect(() => {
    if (playerHealth > 0 || !isDead) return;
    console.log('[CombatSystem] Player is dead, replacing with dove at', `${playerPos.x},${playerPos.y}`);
    const newObjects = { ...objects };
    const pk = `${playerPos.x},${playerPos.y}`;
    if (newObjects[pk] === 'player') {
      delete newObjects[pk];
      newObjects[pk] = 'dove';
      console.log('[CombatSystem] Dove placed, updating objects');
      onObjectsChange(newObjects);
    }
  }, [playerHealth, playerPos, objects, onObjectsChange, isDead]);

  return null;
};

export default CombatSystem;