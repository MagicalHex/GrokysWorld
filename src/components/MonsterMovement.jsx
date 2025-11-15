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

  const MONSTER_TYPES = Object.keys(MONSTER_DATA);
  const isMonster = (type) => MONSTER_TYPES.includes(type);

  const getBestMove = useCallback((mx, my, monsterType) => {
    const { playerPos, objects, restrictedTiles, rows: gridRows, columns: gridCols, monsterTypes } = refs.current;

    const startPos = { x: mx, y: my };
    const startKey = `${mx},${my}`;
    const playerKey = `${playerPos.x},${playerPos.y}`;

    // Early exit: too far (Manhattan heuristic)
    const manhattanDist = distance(startPos, playerPos);
    const maxChaseDistance = monsterType === 'spider' ? 12 : 7;
    if (manhattanDist > maxChaseDistance) return null;

    // Early exit: adjacent (CombatSystem handles attack)
    const dx = Math.abs(playerPos.x - mx);
    const dy = Math.abs(playerPos.y - my);
    if (dx + dy <= 1 && dx + dy > 0) {
      return null;
    }

    // === BFS for shortest path ===
    const cameFrom = new Map();
    const queue = [{ x: mx, y: my }];
    const visited = new Set([startKey]);
    cameFrom.set(startKey, null);

    const dirs = [
      [0, -1], // up
      [0, 1],  // down
      [-1, 0], // left
      [1, 0]   // right
    ];

    let reachedPlayer = false;
    while (queue.length > 0 && !reachedPlayer) {
      const curr = queue.shift();
      const currKey = `${curr.x},${curr.y}`;

      if (currKey === playerKey) {
        reachedPlayer = true;
        break;
      }

      for (const [dx, dy] of dirs) {
        const nx = curr.x + dx;
        const ny = curr.y + dy;
        const nKey = `${nx},${ny}`;

        if (nx < 0 || nx >= gridCols || ny < 0 || ny >= gridRows) continue;
        if (visited.has(nKey)) continue;

        // === WALKABLE CHECK (matches movement logic) ===
        if (restrictedTiles.has(nKey)) continue;

        const obj = objects[nKey];
        let walkable = false;
        if (!obj) {
          walkable = true;
        } else if (obj === 'spiderweb' || obj === 'gold') {
          walkable = true;
        } else if (obj.startsWith('portal-to-')) {
          walkable = true;
        } else {
          // Other monsters: walkable (will swap in movement)
          const objType = monsterTypes[obj];
          if (objType && isMonster(objType)) {
            walkable = true;
          }
        }

        // Player tile: walkable ONLY as GOAL
        if (nKey === playerKey) {
          walkable = true;
        }

        if (!walkable) continue;

        visited.add(nKey);
        queue.push({ x: nx, y: ny });
        cameFrom.set(nKey, currKey);
      }
    }

    // No path to player
    if (!cameFrom.has(playerKey)) return null;

    // === RECONSTRUCT PATH ===
    const path = [];
    let current = playerKey;
    while (current !== startKey) {
      path.push(current);
      current = cameFrom.get(current);
      if (!current) return null; // Safety (shouldn't happen)
    }
    path.push(startKey);
    path.reverse(); // [start, next, ..., player]

    // Path distance (steps)
    const pathDist = path.length - 1;
    if (pathDist > maxChaseDistance) return null;

    // Already at goal? (shouldn't, due to early checks)
    if (pathDist <= 1) return null;

    // NEXT MOVE: path[1]
    const nextKey = path[1];
    const [nextX, nextY] = nextKey.split(',').map(Number);
    return { x: nextX, y: nextY };
  }, []); // Stable deps, reads refs.current inside

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

      // Process each monster IN ORDER (stable, prevents chain reactions/freezes)
      for (const { key, monsterId, type, x, y } of monsters) {
        const result = getBestMove(x, y, type);
        if (!result) continue; // No valid move (adj/too far/no path)

        const toX = result.x;
        const toY = result.y;
        const toKey = `${toX},${toY}`;

        // === ALLOW SWAPPING WITH OTHER MONSTERS ===
        const occupant = newObjects[toKey];
        if (occupant && isMonster(monsterTypes[occupant])) {
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