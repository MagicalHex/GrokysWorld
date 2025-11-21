// MonsterMovement.jsx
import React, { useEffect, useCallback, useRef } from 'react';
import { subscribe } from '../utils/gameLoop';
import MONSTER_DATA from '../../public/data/monsters.json';

/**
 * MonsterMovement Component
 * Handles all monster AI pathfinding & movement every 500ms
 * Uses BFS to chase player while respecting walls, objects, and other monsters
 */
const MonsterMovement = ({
  objects,
  playerPos,
  onObjectsChange,
  restrictedTiles,
  rows,
  columns,
  globalMonsterHealths,
  monsterTypes,

  // === NEW: Animation sync props ===
  monsterMoveDirectionRef,   // { current: { [monsterId]: 'up'|'down'|'left'|'right' } }
  monsterMoveTriggerRef,     // { current: number } – bumps to trigger sprite animation
  forceMonsterUpdate         // () => void – forces MonsterLayer to re-render
}) => {
  // =================================================================
  // Keep latest props in refs (so the game loop can access fresh data)
  // =================================================================
  const refs = useRef({
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
  });

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

  // =================================================================
  // Helper: Manhattan distance
  // =================================================================
  const distance = (p1, p2) => Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y);

  // List of valid monster type strings (from MONSTER_DATA)
  const MONSTER_TYPES = Object.keys(MONSTER_DATA);
  const isMonster = (type) => MONSTER_TYPES.includes(type);

  // =================================================================
  // Core AI: Find the best next tile toward the player using BFS
  // Returns { x, y, direction } or null if no valid move
  // =================================================================
  const getBestMove = useCallback((mx, my, monsterType) => {
    const {
      playerPos,
      objects,
      restrictedTiles,
      rows: gridRows,
      columns: gridCols,
      monsterTypes
    } = refs.current;

    const start = { x: mx, y: my };
    const startKey = `${mx},${my}`;
    const playerKey = `${playerPos.x},${playerPos.y}`;

    // Too far → idle
    const maxChaseDistance = monsterType === 'spider' ? 12 : 7;
    if (distance(start, playerPos) > maxChaseDistance) return null;

    // Already adjacent or on player → don't move (attack handled elsewhere)
    if (distance(start, playerPos) <= 1) return null;

    // =================================================================
    // BFS to find shortest path
    // =================================================================
    const cameFrom = new Map();
    const queue = [start];
    const visited = new Set([startKey]);
    cameFrom.set(startKey, null);

    const directions = [
      [0, -1, 'up'],
      [0, 1, 'down'],
      [-1, 0, 'left'],
      [1, 0, 'right']
    ];

    while (queue.length > 0) {
      const curr = queue.shift();
      const currKey = `${curr.x},${curr.y}`;

      if (currKey === playerKey) {
        // Path found!
        const path = [];
        let step = playerKey;
        while (step !== startKey) {
          path.push(step);
          step = cameFrom.get(step);
        }
        path.push(startKey);
        path.reverse();

        const nextKey = path[1]; // first move
        const [nx, ny] = nextKey.split(',').map(Number);

        const dirX = nx - mx;
        const dirY = ny - my;
        let direction = 'down';
        if (dirY === -1) direction = 'up';
        else if (dirY === 1) direction = 'down';
        else if (dirX === -1) direction = 'left';
        else if (dirX === 1) direction = 'right';

        return { x: nx, y: ny, direction };
      }

      for (const [dx, dy] of directions) {
        const nx = curr.x + dx;
        const ny = curr.y + dy;
        const nKey = `${nx},${ny}`;

        // Bounds check
        if (nx < 0 || nx >= gridCols || ny < 0 || ny >= gridRows) continue;
        if (visited.has(nKey)) continue;

        // Restricted tiles (walls, trees, etc.)
        if (restrictedTiles.has(nKey)) continue;

        const occupant = objects[nKey];

        // === BLOCKED IF: another monster is standing there ===
        const occupantType = occupant && monsterTypes[occupant];
        if (occupantType && isMonster(occupantType)) {
          continue; // monsters block each other → no swapping!
        }

        // Walkable static objects
        const walkableStatic = !occupant ||
          occupant === 'spiderweb' ||
          occupant === 'gold' ||
          occupant.startsWith('portal-to-');

        // Player tile is always "walkable" for pathfinding (we stop before stepping on player)
        const isPlayerTile = nKey === playerKey;

        if (walkableStatic || isPlayerTile) {
          visited.add(nKey);
          queue.push({ x: nx, y: ny });
          cameFrom.set(nKey, currKey);
        }
      }
    }

    return null; // no path
  }, []);

  // =================================================================
  // Main game loop: move monsters every 500ms
  // =================================================================
  useEffect(() => {
    let lastMoveTime = 0;
    const MOVE_INTERVAL = 500; // ms

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
        forceMonsterUpdate
      } = refs.current;

      // Collect all alive monsters
      const monsters = Object.entries(objects)
        .map(([key, id]) => {
          const type = monsterTypes[id];
          if (!type || !isMonster(type)) return null;
          const [x, y] = key.split(',').map(Number);
          if ((globalMonsterHealths[id] ?? 0) <= 0) return null;
          return { key, id, type, x, y };
        })
        .filter(Boolean);

      if (monsters.length === 0) return;

      const newObjects = { ...objects };
      let anyMove = false;

      for (const { key, id, type, x, y } of monsters) {
        const move = getBestMove(x, y, type);
        if (!move) continue;

        const { x: toX, y: toY, direction } = move;
        const toKey = `${toX},${toY}`;

        // === Update animation direction & trigger flip ===
        if (direction && monsterMoveDirectionRef.current) {
          monsterMoveDirectionRef.current[id] = direction;
          monsterMoveTriggerRef.current += 1;
          forceMonsterUpdate?.();
        }

        // === FINAL MOVE CHECK (still valid?) ===
        const occupant = newObjects[toKey];
        const occupantIsMonster = occupant && isMonster(monsterTypes[occupant]);

        // Block move if another monster is there (prevents swapping)
        if (occupantIsMonster) continue;

        // Player tile → don't step on player (attack handled elsewhere)
        if (toX === playerPos.x && toY === playerPos.y) continue;

        // Must be empty or walkable static object
        const targetIsWalkable =
          !occupant ||
          occupant === 'spiderweb' ||
          occupant === 'gold' ||
          occupant.startsWith('portal-to-');

        if (!targetIsWalkable) continue;

        // === PERFORM MOVE ===
        delete newObjects[key];
        newObjects[toKey] = id;
        anyMove = true;
      }

      if (anyMove) {
        onObjectsChange(newObjects);
      }
    });

    return unsubscribe;
  }, [getBestMove]);

  return null; // renderless component
};

export default MonsterMovement;