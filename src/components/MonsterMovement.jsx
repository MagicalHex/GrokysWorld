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

  // THIS CODE WORKS WELL, IT MAKES MONSTERS STRESSING TO GET TO PLAYER
  // const getBestMove = useCallback((mx, my, monsterType) => {
  //   const { playerPos, objects, restrictedTiles, rows, columns } = refs.current;

  //   const distToPlayer = distance({ x: mx, y: my }, playerPos);
  //   const maxChaseDistance = monsterType === 'spider' ? 12 : 7;
  //   if (distToPlayer > maxChaseDistance) return null;

  // FROM HERE - THIS CODE WORKS WELL BUT MONSTERS CAN GET WEIRD STUCK BUT THEY SEEM TO ATTACK BETTER
  const getBestMove = useCallback((mx, my, monsterType) => {
    const { playerPos, objects, restrictedTiles, rows, columns } = refs.current;

    const distToPlayer = distance({ x: mx, y: my }, playerPos);
    const maxChaseDistance = monsterType === 'spider' ? 12 : 7;
    if (distToPlayer > maxChaseDistance) return null;

    // === IF ADJACENT → DO NOT MOVE. CombatSystem handles attack ===
    const dx = Math.abs(playerPos.x - mx);
    const dy = Math.abs(playerPos.y - my);
    if (dx <= 1 && dy <= 1 && (dx + dy > 0)) {
      return null;
    } // TO HERE

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
        targetObj === 'spiderweb';

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
      if (['skeleton', 'spider', 'littlespider', 'cavespider'].includes(type)) {
        const [x, y] = key.split(',').map(Number);
        const health = globalMonsterHealths[monsterId] ?? 100;
        if (health > 0) {
          monsters.push({ key, monsterId, type, x, y });
        }
      }
    });

    if (monsters.length === 0) return;

    const newObjects = { ...objects };
    let anyMove = false;

    // Process each monster IN ORDER (prevents total freeze)
    for (const { key, monsterId, type, x, y } of monsters) {
      const result = getBestMove(x, y, type);
      if (!result || result.action === 'attack') continue; // Let CombatSystem handle attack

      const toX = result.x;
      const toY = result.y;
      const toKey = `${toX},${toY}`;

      // === ALLOW SWAPPING WITH OTHER MONSTERS ===
      const occupant = newObjects[toKey];
      if (occupant && monsterTypes[occupant] && ['skeleton', 'spider', 'littlespider', 'cavespider'].includes(monsterTypes[occupant])) {
        // Swap positions!
        newObjects[key] = occupant;
        newObjects[toKey] = monsterId;
        anyMove = true;
      } 
      // === NORMAL MOVE (empty or walkable) ===
      else if (
        toX >= 0 && toX < columns &&
        toY >= 0 && toY < rows &&
        !restrictedTiles.has(toKey) &&
        !(toX === playerPos.x && toY === playerPos.y) &&
        (!newObjects[toKey] || newObjects[toKey] === 'spiderweb' || newObjects[toKey].startsWith('portal-to-'))
      ) {
        delete newObjects[key];
        newObjects[toKey] = monsterId;
        anyMove = true;
      }
    }

    if (anyMove) {
      onObjectsChange(newObjects);
    }
  });

  return unsubscribe;
}, [getBestMove]);

  return null;
};

export default MonsterMovement;