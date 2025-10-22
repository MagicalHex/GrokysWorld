import React, { useEffect, useRef } from 'react';

const CombatSystem = ({
  playerPos,
  playerHealth,
  setPlayerHealth,
  objects,
  monsterHealths,
  setMonsterHealths,
  onObjectsChange
}) => {
  const distance = (pos1, pos2) => Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
  const lastPlayerAttack = useRef(0);
  const cooldown = 1500;

  useEffect(() => {
    const now = Date.now();
    
    // MONSTER ATTACKS
    Object.keys(objects).forEach(monsterKey => {
      const monsterType = objects[monsterKey];
      if (!['skeleton', 'spider'].includes(monsterType)) return;

      const [mx, my] = monsterKey.split(',').map(Number);
      if (distance({ x: mx, y: my }, playerPos) === 1) {
        const damage = monsterType === 'skeleton' ? 10 : 15;
        setPlayerHealth(prev => Math.max(0, prev - damage));
      }
    });

    // PLAYER ATTACKS (COOLDOWN!)
    if (now - lastPlayerAttack.current < cooldown) return;

    const playerKey = `${playerPos.x},${playerPos.y}`;
    const adjacentKeys = [
      playerKey,
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
          console.log(`⚔️ ${type.toUpperCase()}: ${(newHealths[key] || 100) + damage} → ${newHealths[key]} HP`);
          return newHealths;
        });
        attacked = true;
      }
    });

    if (attacked) lastPlayerAttack.current = now;
  }, [playerPos, objects, setPlayerHealth, setMonsterHealths]);

  // DEAD MONSTER CLEANUP
  useEffect(() => {
    const newHealths = { ...monsterHealths };
    let changed = false;
    
    Object.keys(newHealths).forEach(key => {
      if (newHealths[key] <= 0) {
        console.log(`💀 ${objects[key]?.toUpperCase()} DEFEATED!`);
        delete newHealths[key];
        changed = true;
      }
    });

    if (changed) {
      const newObjects = { ...objects };
      Object.keys(newHealths).forEach(key => {
        if (monsterHealths[key] <= 0) delete newObjects[key];
      });
      onObjectsChange(newObjects);
      setMonsterHealths(newHealths);
    }
  }, [monsterHealths, objects, setMonsterHealths, onObjectsChange]);

  return null;
};

export default CombatSystem;