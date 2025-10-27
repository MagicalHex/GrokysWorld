import React, { useEffect, useRef } from 'react';

const CombatSystem = ({
  playerPos,
  playerHealth,
  setPlayerHealth,
  objects,
  monsterHealths,
  setMonsterHealths,
  onObjectsChange,
  onQueueRespawn,
  originalSpawns = {}   // ← DEFAULT EMPTY OBJECT
}) => {
  const distance = (pos1, pos2) => Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);

  const lastPlayerAttack = useRef(0);
  const lastMonsterAttack = useRef({});
  const PLAYER_COOLDOWN = 1500;
  const MONSTER_COOLDOWN = 3000;

  // === COMBAT LOGIC ===
  useEffect(() => {
    const now = Date.now();

    // --- MONSTER ATTACKS (3s cooldown) ---
    Object.keys(objects).forEach(monsterKey => {
      const monsterType = objects[monsterKey];
      if (!['skeleton', 'spider'].includes(monsterType)) return;

      const lastAttack = lastMonsterAttack.current[monsterKey] || 0;
      if (now - lastAttack < MONSTER_COOLDOWN) return;

      const [mx, my] = monsterKey.split(',').map(Number);
      if (distance({ x: mx, y: my }, playerPos) === 1) {
        const damage = monsterType === 'skeleton' ? 10 : 15;
        setPlayerHealth(prev => Math.max(0, prev - damage));
        lastMonsterAttack.current[monsterKey] = now;
      }
    });

    // --- PLAYER ATTACKS (1.5s cooldown) ---
    if (now - lastPlayerAttack.current < PLAYER_COOLDOWN) return;

    const adjacentKeys = [
      `${playerPos.x},${playerPos.y}`,
      `${playerPos.x + 1},${playerPos.y}`,
      `${playerPos.x - 1},${playerPos.y}`,
      `${playerPos.x},${playerPos.y + 1}`,
      `${playerPos.x},${playerPos.y - 1}`
    ];

    let attacked = false;
    adjacentKeys.forEach(key => {
      const type = objects[key];
      if (['skeleton', 'spider'].includes(type)) {
        const damage = type === 'skeleton' ? 20 : 25;
        setMonsterHealths(prev => {
          const newHealths = { ...prev };
          newHealths[key] = Math.max(0, (newHealths[key] || 100) - damage);
          return newHealths;
        });
        attacked = true;
      }
    });

    if (attacked) lastPlayerAttack.current = now;
  }, [playerPos, objects, setPlayerHealth, setMonsterHealths]);

  // === DEAD MONSTER + PLAYER CLEANUP ===
  useEffect(() => {
    const newHealths = { ...monsterHealths };
    const newObjects = { ...objects };
    let changed = false;

    // --- MONSTER DEATH ---
    Object.keys(newHealths).forEach(deathKey => {
      if (newHealths[deathKey] <= 0) {
        const monsterType = objects[deathKey];

        // Find original spawn
        let originalKey = null;
        if (originalSpawns && typeof originalSpawns === 'object') {
          for (const [origKey, type] of Object.entries(originalSpawns)) {
            if (type === monsterType) {
              originalKey = origKey;
              break;
            }
          }
        }

        if (originalKey && monsterType === 'spider') {
          console.log(`Spider died at ${deathKey} → respawning at ${originalKey}`);
          onQueueRespawn({ key: originalKey, type: 'spider' });
        }

        delete newObjects[deathKey];
        delete newHealths[deathKey];
        newObjects[deathKey] = 'gold';
        changed = true;
      }
    });

    // --- PLAYER DEATH: Remove corpse + add angel ---
    if (playerHealth <= 0) {
      const playerKey = `${playerPos.x},${playerPos.y}`;
      if (newObjects[playerKey] === 'player') {
        delete newObjects[playerKey]; // Remove body
        newObjects[playerKey] = 'angel'; // ← Walkable!
        changed = true;
        console.log(`Player died → angel at ${playerKey}`);
      }
    }

    if (changed) {
      onObjectsChange(newObjects);
      setMonsterHealths(newHealths);
    }
  }, [
    monsterHealths,
    objects,
    onObjectsChange,
    setMonsterHealths,
    playerHealth,
    playerPos,
    originalSpawns,
    onQueueRespawn
  ]);

  return null;
};

export default CombatSystem;