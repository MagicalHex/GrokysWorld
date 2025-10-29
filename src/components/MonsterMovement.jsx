// MonsterMovement.jsx
import React, { useEffect, useCallback, useRef } from 'react';
import { subscribe } from '../utils/gameLoop';

const MonsterMovement = ({
  objects,
  playerPos,
  onObjectsChange,
  restrictedTiles,
  rows,
  columns,
  globalMonsterHealths,
  monsterTypes
}) => {
  // === REFS TO HOLD LATEST VALUES ===
  const refs = useRef({
    objects,
    playerPos,
    restrictedTiles,
    rows,
    columns,
    globalMonsterHealths,
    monsterTypes,
    onObjectsChange,
  });

  // Update refs on every render
  useEffect(() => {
    refs.current = {
      objects,
      playerPos,
      restrictedTiles,
      rows,
      columns,
      globalMonsterHealths,
      monsterTypes,
      onObjectsChange,
    };
  }, [
    objects,
    playerPos,
    restrictedTiles,
    rows,
    columns,
    globalMonsterHealths,
    monsterTypes,
    onObjectsChange,
  ]);

  const distance = (p1, p2) => Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y);

  const getBestMove = useCallback((mx, my, monsterType) => {
    const { playerPos, objects, restrictedTiles, rows, columns } = refs.current;

    const distToPlayer = distance({ x: mx, y: my }, playerPos);
    const maxChaseDistance = monsterType === 'spider' ? 12 : 7;
    if (distToPlayer > maxChaseDistance) return null;

    const directions = [
      { x: mx, y: my - 1 },
      { x: mx, y: my + 1 },
      { x: mx - 1, y: my },
      { x: mx + 1, y: my },
    ];

    let bestMove = null;
    let bestDist = Infinity;

    for (const dir of directions) {
      const targetKey = `${dir.x},${dir.y}`;
      const targetObj = objects[targetKey];

      const isWalkable =
        !targetObj ||
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
    }

    return bestMove;
  }, []); // ← NOW EMPTY! No deps!

  useEffect(() => {
    let lastMoveTime = 0;
    const MOVE_INTERVAL = 500;

    const unsubscribe = subscribe((delta, time) => {
      if (time - lastMoveTime < MOVE_INTERVAL) return;
      lastMoveTime = time;

      const {
        objects,
        playerPos,
        restrictedTiles,
        rows,
        columns,
        globalMonsterHealths,
        monsterTypes,
        onObjectsChange,
      } = refs.current;

      const monsters = [];
      Object.entries(objects).forEach(([key, monsterId]) => {
        const type = monsterTypes[monsterId];
        if (['skeleton', 'spider', 'cavespider'].includes(type)) {
          const [x, y] = key.split(',').map(Number);
          const health = globalMonsterHealths[monsterId] ?? 100;
          if (health > 0) {
            monsters.push({ key, monsterId, type, x, y, health });
          }
        }
      });

      const moves = monsters
        .map(({ key, monsterId, type, x, y }) => {
          const bestMove = getBestMove(x, y, type);
          return { from: key, monsterId, to: bestMove };
        })
        .filter((move) => move.to);

      if (moves.length === 0) return;

      const targetCounts = {};
      moves.forEach((move) => {
        const toKey = `${move.to.x},${move.to.y}`;
        targetCounts[toKey] = (targetCounts[toKey] || 0) + 1;
      });

      const validMoves = moves.filter((move) => {
        const toKey = `${move.to.x},${move.to.y}`;
        return targetCounts[toKey] === 1;
      });

      if (validMoves.length === 0) return;

      const newObjects = { ...objects };
      validMoves.forEach(({ from, monsterId, to }) => {
        const toKey = `${to.x},${to.y}`;
        delete newObjects[from];
        newObjects[toKey] = monsterId;
      });

      onObjectsChange(newObjects);
    });

    return unsubscribe;
  }, [getBestMove]); // ← Only depends on getBestMove (now stable)

  return null;
};

export default MonsterMovement;