import React, { useEffect, useCallback } from 'react';
import { useMonsterHealths } from './hooks/useMonsterHealths';

const MonsterMovement = ({
  objects,
  playerPos,
  onObjectsChange,
  restrictedTiles,
  rows,
  columns
}) => {
  const [monsterHealths] = useMonsterHealths(objects);

  const distance = (pos1, pos2) => {
    return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
  };

  const getBestMove = useCallback((mx, my, monsterType) => {
    const distToPlayer = distance({ x: mx, y: my }, playerPos);
    const maxChaseDistance = monsterType === 'spider' ? 12 : 7;
    if (distToPlayer > maxChaseDistance) return null;

    const directions = [
      { x: mx, y: my - 1 },
      { x: mx, y: my + 1 },
      { x: mx - 1, y: my },
      { x: mx + 1, y: my }
    ];

    let bestMove = null;
    let bestDist = Infinity;
    directions.forEach(dir => {
      const targetKey = `${dir.x},${dir.y}`;
      const targetObj = objects[targetKey];
      
      const isWalkable = !targetObj || 
                        targetObj === 'spiderweb' || 
                        targetObj.startsWith('portal-to-');
      
      if (
        dir.x >= 0 && dir.x < columns &&
        dir.y >= 0 && dir.y < rows &&
        isWalkable &&
        !restrictedTiles.has(targetKey) &&
        !(dir.x === playerPos.x && dir.y === playerPos.y)
      ) {
        const distToPlayer = distance(dir, playerPos);
        if (distToPlayer < bestDist) {
          bestDist = distToPlayer;
          bestMove = dir;
        }
      }
    });

    return bestMove;
  }, [playerPos, objects, restrictedTiles, rows, columns]);

  useEffect(() => {
    const interval = setInterval(() => {
      // STEP 1: SNAPSHOT ALL MONSTERS
      const monsters = [];
      Object.keys(objects).forEach(key => {
        const type = objects[key];
        if (type === 'skeleton' || type === 'spider') {
          const [x, y] = key.split(',').map(Number);
          monsters.push({ key, type, x, y });
        }
      });

      // STEP 2: CALCULATE ALL MOVES
      let moves = monsters.map(({ key, type, x, y }) => {
        const bestMove = getBestMove(x, y, type);
        return { from: key, type, to: bestMove };
      }).filter(move => move.to);

      // ✅ STEP 3: COLLISION DETECTION & RESOLUTION!
      const targetCounts = {};
      moves.forEach(move => {
        const toKey = `${move.to.x},${move.to.y}`;
        targetCounts[toKey] = (targetCounts[toKey] || 0) + 1;
      });

      // FILTER COLLISIONS: Keep only first monster per tile
      moves = moves.filter(move => {
        const toKey = `${move.to.x},${move.to.y}`;
        return targetCounts[toKey] === 1;  // Only if NO collision
      });

      if (moves.length === 0) return;

      // STEP 4: ONE STATE UPDATE - NO EATING!
      const newObjects = { ...objects };
      
      moves.forEach(({ from, type, to }) => {
        delete newObjects[from];
        const toKey = `${to.x},${to.y}`;
        newObjects[toKey] = type;
      });

      onObjectsChange(newObjects);
      
      console.log(`🎮 ANTI-EAT: ${moves.length} monsters moved safely!`, moves);
    }, 500);
    
    return () => clearInterval(interval);
  }, [getBestMove, objects, onObjectsChange]);

  return null;
};

export default MonsterMovement;