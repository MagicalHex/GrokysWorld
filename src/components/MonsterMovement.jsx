// MonsterMovement.jsx
import React, { useEffect, useCallback, useRef } from 'react';
import { subscribe } from '../utils/gameLoop';
import MONSTER_DATA from '../../public/data/monsters.json';

const MonsterMovement = ({
  objects,
  playerPos,
  onObjectsChange,
  restrictedTiles,
  rows,
  columns,
  globalMonsterHealths,
  monsterTypes,
  // ADD THESE PROPS
  monsterMoveDirectionRef,     // { current: { [monsterId]: 'up'|'down'|... } }
  monsterMoveTriggerRef,       // { current: number } — global trigger count
  forceMonsterUpdate           // () => void — force re-render in MonsterLayer
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
    // ADD THESE
    monsterMoveDirectionRef,
    monsterMoveTriggerRef,
    forceMonsterUpdate,
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
      monsterMoveDirectionRef,
      monsterMoveTriggerRef,
      forceMonsterUpdate,
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
    monsterMoveDirectionRef,
    monsterMoveTriggerRef,
    forceMonsterUpdate,
  ]);

  const distance = (p1, p2) => Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y);

  const MONSTER_TYPES = Object.keys(MONSTER_DATA);
  const isMonster = (type) => MONSTER_TYPES.includes(type);

  const getBestMove = useCallback((mx, my, monsterType) => {
    const { playerPos, objects, restrictedTiles, rows: gridRows, columns: gridCols, monsterTypes } = refs.current;

    const startPos = { x: mx, y: my };
    const startKey = `${mx},${my}`;
    const playerKey = `${playerPos.x},${playerPos.y}`;

    const manhattanDist = distance(startPos, playerPos);
    const maxChaseDistance = monsterType === 'spider' ? 12 : 7;
    if (manhattanDist > maxChaseDistance) return null;

    const dx = Math.abs(playerPos.x - mx);
    const dy = Math.abs(playerPos.y - my);
    if (dx + dy <= 1 && dx + dy > 0) {
      return null;
    }

    // === BFS (unchanged) ===
    const cameFrom = new Map();
    const queue = [{ x: mx, y: my }];
    const visited = new Set([startKey]);
    cameFrom.set(startKey, null);

    const dirs = [
      [0, -1, 'up'],
      [0, 1, 'down'],
      [-1, 0, 'left'],
      [1, 0, 'right']
    ];

    let reachedPlayer = false;
    while (queue.length > 0 && !reachedPlayer) {
      const curr = queue.shift();
      const currKey = `${curr.x},${curr.y}`;

      if (currKey === playerKey) {
        reachedPlayer = true;
        break;
      }

      for (const [dx, dy, dir] of dirs) {
        const nx = curr.x + dx;
        const ny = curr.y + dy;
        const nKey = `${nx},${ny}`;

        if (nx < 0 || nx >= gridCols || ny < 0 || ny >= gridRows) continue;
        if (visited.has(nKey)) continue;
        if (restrictedTiles.has(nKey)) continue;

        const obj = objects[nKey];
        let walkable = false;
        if (!obj) {
          walkable = true;
        } else if (obj === 'spiderweb' || obj === 'gold' || obj.startsWith('portal-to-')) {
          walkable = true;
        } else {
          const objType = monsterTypes[obj];
          if (objType && isMonster(objType)) {
            walkable = true;
          }
        }

        if (nKey === playerKey) walkable = true;
        if (!walkable) continue;

        visited.add(nKey);
        queue.push({ x: nx, y: ny });
        cameFrom.set(nKey, currKey);
      }
    }

    if (!cameFrom.has(playerKey)) return null;

    const path = [];
    let current = playerKey;
    while (current !== startKey) {
      path.push(current);
      current = cameFrom.get(current);
      if (!current) return null;
    }
    path.push(startKey);
    path.reverse();

    const pathDist = path.length - 1;
    if (pathDist > maxChaseDistance || pathDist <= 1) return null;

    const nextKey = path[1];
    const [nextX, nextY] = nextKey.split(',').map(Number);

    // Determine direction from current -> next
    const dirX = nextX - mx;
    const dirY = nextY - my;
    let direction = null;
    if (dirY === -1) direction = 'up';
    else if (dirY === 1) direction = 'down';
    else if (dirX === -1) direction = 'left';
    else if (dirX === 1) direction = 'right';

    return { x: nextX, y: nextY, direction };
  }, []);

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
        monsterMoveDirectionRef,
        monsterMoveTriggerRef,
        forceMonsterUpdate,
      } = refs.current;

      const monsters = [];
      Object.entries(objects).forEach(([key, monsterId]) => {
        const type = monsterTypes[monsterId];
        if (isMonster(type)) {
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

      for (const { key, monsterId, type, x, y } of monsters) {
        const result = getBestMove(x, y, type);
        if (!result) continue;

        const { x: toX, y: toY, direction } = result;
        const toKey = `${toX},${toY}`;

        // SET DIRECTION + TRIGGER RENDER
        if (direction && monsterMoveDirectionRef.current) {
          monsterMoveDirectionRef.current[monsterId] = direction;
          monsterMoveTriggerRef.current += 1;
          forceMonsterUpdate();
        }

        const occupant = newObjects[toKey];
        if (occupant && isMonster(monsterTypes[occupant])) {
          newObjects[key] = occupant;
          newObjects[toKey] = monsterId;
          anyMove = true;
        } 
        else if (
          toX >= 0 && toX < columns &&
          toY >= 0 && toY < rows &&
          !restrictedTiles.has(toKey) &&
          !(toX === playerPos.x && toY === playerPos.y) &&
          (!newObjects[toKey] || 
           newObjects[toKey] === 'spiderweb' || 
           newObjects[toKey] === 'gold' || 
           newObjects[toKey].startsWith('portal-to-'))
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