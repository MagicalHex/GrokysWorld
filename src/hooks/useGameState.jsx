// src/hooks/useGameState.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { loadMaps } from '../data/loadMaps';

const ROWS = 16;
const COLS = 24;
const PORTAL_ENTRY_POINTS = { 1: { x: 1, y: 1 }, 2: { x: 1, y: 2 }, 3: { x: 3, y: 3 }, 4: { x: 4, y: 4 }, 5: { x: 1, y: 1 } };
const RESTRICTED_TERRAIN = new Set([
  'stone', 'darkstone', 'stonepillar', 'grassnowalk',
  'timberwallup', 'timberwallside', 'timberwallcornerright', 'timberwallcornerleft'
]);

export const useGameState = () => {
  /* --------------------------------------------------------------
     1. Core state (unchanged)
     -------------------------------------------------------------- */
  const [levels, setLevels] = useState({});
  const [currentLevel, setCurrentLevel] = useState(1);
  const [restrictedTilesByLevel, setRestrictedTilesByLevel] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [globalPlayerHealth, setGlobalPlayerHealth] = useState(100);
  const [globalInventory, setGlobalInventory] = useState({});
  const [isDead, setIsDead] = useState(false);
  const [globalMonsterHealths, setGlobalMonsterHealths] = useState({}); // New state
  const [monsterTypes, setMonsterTypes] = useState({}); // New: Maps ID to type (e.g., { 'spider_2_18_2': 'spider' })
  const [originalSpawns, setOriginalSpawns] = useState({});

  /* --------------------------------------------------------------
     2. Helper: update a single level (must be defined first)
     -------------------------------------------------------------- */
  const updateLevel = useCallback((levelId, updates) => {
    setLevels(prev => ({
      ...prev,
      [levelId]: { ...prev[levelId], ...updates }
    }));
  }, []);

  /* --------------------------------------------------------------
     3. onLevelChange – must be defined *before* anything that uses it
     -------------------------------------------------------------- */
  const onLevelChange = useCallback((newLevel, customSpawn = null) => {
    const id = String(newLevel);
    if (!levels[id]) return;
    const pos = customSpawn || PORTAL_ENTRY_POINTS[id] || { x: 1, y: 1 };
    updateLevel(id, { playerPos: pos });
    setCurrentLevel(Number(id));
  }, [levels, updateLevel]);

  /* --------------------------------------------------------------
     4. Respawn (uses onLevelChange → safe now)
     -------------------------------------------------------------- */
  const respawnPlayer = useCallback(() => {
    setIsDead(false);
    setGlobalPlayerHealth(100);
    // setGlobalInventory({}); // optional
    onLevelChange(1, { x: 2, y: 14 });
  }, [onLevelChange]);

  /* --------------------------------------------------------------
     5. Global setters
     -------------------------------------------------------------- */
  const onPlayerHealthChange = useCallback((newHealth) => {
    setGlobalPlayerHealth(newHealth);
    if (newHealth <= 0 && !isDead) setIsDead(true);
  }, [isDead]);

  const onInventoryChange = useCallback((updater) => {
    setGlobalInventory(prev => (typeof updater === 'function' ? updater(prev) : updater));
  }, []);

  
  /* --------------------------------------------------------------
     6. NEW: PLAYER MOVE – the whole logic lives here
     -------------------------------------------------------------- */
  const onPlayerMoveAttempt = useCallback((newPos) => {
  const levelId = currentLevel;
  const level = levels[levelId];
  if (!level) return;

  const { objects = {}, playerPos, restrictedTiles = new Set() } = level;

  const newKey = `${newPos.x},${newPos.y}`;
  const oldKey = playerPos ? `${playerPos.x},${playerPos.y}` : null;

  // ---- 1. Validate -------------------------------------------------
  if (restrictedTiles.has(newKey)) return;
  const targetObj = objects[newKey];

  // ---- 2. Build new objects map ----------------------------------
  const newObjs = { ...objects };
  if (oldKey && newObjs[oldKey] === 'player') delete newObjs[oldKey];

  // ---- 3. PICK-UP -------------------------------------------------
  const PICKUP = new Set(['spiderweb','timber','coin','gold','potion','woodobject','rockobject']);
  let pickupItem = null;

  if (targetObj && PICKUP.has(targetObj)) {
    pickupItem = targetObj;               // <-- tell UI to animate
    // **Do NOT delete the item yet** – UI will delete after animation
  } else {
    const PERSIST = new Set([
      'unlockeddoorobject','portal-to-1','portal-to-2','portal-to-3','portal-to-4',
      'bridge','ladder','holeobject','ropeobject'
    ]);
    const isPersist = targetObj && PERSIST.has(targetObj);
    if (!isPersist && !targetObj?.startsWith('portal-to-')) {
      newObjs[newKey] = 'player';
    }
  }

  // ---- 4. Commit (objects + playerPos + pendingPickup) ------------
  updateLevel(levelId, {
    objects: newObjs,
    playerPos: newPos,
    pendingPickup: pickupItem          // <-- NEW flag
  });

  // ---- 5. Portal / hole / rope ------------------------------------
  if (targetObj?.startsWith('portal-to-')) {
    const to = parseInt(targetObj.split('-to-')[1],10);
    setTimeout(() => (to===1 ? onLevelChange(to,{x:22,y:8}) : onLevelChange(to)), 100);
  } else if (targetObj === 'holeobject') {
    setTimeout(() => onLevelChange(5), 100);
  } else if (targetObj === 'ropeobject') {
    setTimeout(() => onLevelChange(1,{x:21,y:14}), 100);
  }
}, [
  currentLevel, levels, updateLevel, onLevelChange
]);
/* --------------------------------------------------------------
   6. Helper: clear pendingPickup after UI finishes
   -------------------------------------------------------------- */
const clearPendingPickup = useCallback(() => {
  updateLevel(currentLevel, { pendingPickup: null });
}, [currentLevel, updateLevel]);

  /* --------------------------------------------------------------
     7. Existing callbacks (objects, grid, respawn, …)
     -------------------------------------------------------------- */
  const onObjectsChange = useCallback((updater, id = currentLevel) => {
    if (typeof updater === 'function') {
      setLevels(prev => {
        const level = prev[id];
        if (!level) return prev;
        const newObjects = updater(level.objects || {});
        return { ...prev, [id]: { ...level, objects: newObjects } };
      });
    } else {
      updateLevel(id, { objects: updater });
    }
  }, [currentLevel, updateLevel]);

  const onPlayerPosChange = useCallback((newPos, id = currentLevel) => {
    updateLevel(id, { playerPos: newPos });
  }, [currentLevel, updateLevel]);


// ──────────────────────────────────────────────────────────────
// 1. Helper: get original key from monsterId (only for monsters)
// ──────────────────────────────────────────────────────────────
const getOriginalKey = (monsterId, levels) => {
  if (typeof monsterId !== 'string') return null;
  const parts = monsterId.split('_');
  if (parts.length !== 4) return null;

  const levelId = Number(parts[1]);
  const x = Number(parts[2]);
  const y = Number(parts[3]);
  const candidate = `${x},${y}`;

  const orig = levels[levelId]?.originalSpawns?.[candidate];
  if (orig && (orig === parts[0] || orig === monsterId)) {
    return candidate;
  }
  return null;
};

// ──────────────────────────────────────────────────────────────
// Respawn delay map – define once, use everywhere
// ──────────────────────────────────────────────────────────────
const RESPAWN_DELAYS = {
  treeobject: 15000,     // 15 seconds
  stoneobject: 20000,    // 20 seconds (example)
  spider: 30000,         // 30 seconds
  skeleton: 45000,       // 45 seconds (example)
  default: 10000         // fallback
};

// ──────────────────────────────────────────────────────────────
// Helper: get delay from type
// ──────────────────────────────────────────────────────────────
const getRespawnDelay = (type) => {
  return RESPAWN_DELAYS[type] ?? RESPAWN_DELAYS.default;
};
// ──────────────────────────────────────────────────────────────
// 2. Unified scheduleRespawn – handles BOTH monsters and static objects
// ──────────────────────────────────────────────────────────────
const scheduleRespawn = useCallback((arg1, arg2, arg3, arg4) => {
  let levelId, key, type, delay = 3000;
  let isMonster = false;
  let monsterId = null;

  // ─── Overload 1: monsterId (string) → respawn at original tile
  if (typeof arg1 === 'string' && arg2 === undefined || typeof arg2 === 'number') {
    monsterId = arg1;
    const parts = monsterId.split('_');
    type = parts[0];
    delay = typeof arg2 === 'number' ? arg2 : getRespawnDelay(type); // ← USE TYPE DELAY (respawn time based on object)

    const origKey = getOriginalKey(monsterId, levels);
    if (!origKey) {
      console.warn('[useGameState] No original key for monster:', monsterId);
      return;
    }

    levelId = Number(parts[1]);
    key = origKey;
    isMonster = true;

  // ─── Overload 2: levelId, key, type, delay → trees, stones, etc.
  } else {
    levelId = arg1;
    key = arg2;
    type = arg3;
    delay = arg4 ?? 3000;
    isMonster = false;
  }

  const timestamp = Date.now() + delay;

  // ─── Prevent duplicate queue entries
  const queue = levels[levelId]?.respawnQueue || [];
  const alreadyQueued = queue.some(i => i.key === key && i.type === type);
  if (alreadyQueued) {
    console.log('[useGameState] Respawn already queued:', { levelId, key, type });
    return;
  }

  // ─── Add to queue
  updateLevel(levelId, prev => ({
    ...prev,
    respawnQueue: [...(prev.respawnQueue || []), { key, type, timestamp }]
  }));

  // ─── Set up the actual respawn timeout
  const timerId = setTimeout(() => {
    setLevels(prevLevels => {
      const level = prevLevels[levelId];
      if (!level) return prevLevels;

      const now = Date.now();

      // Too early? Reschedule
      if (now < timestamp) {
        if (isMonster) {
          scheduleRespawn(monsterId, timestamp - now);
        } else {
          scheduleRespawn(levelId, key, type, timestamp - now);
        }
        return prevLevels;
      }

      // Can we place it?
      const occupied = level.objects[key];
      const canPlace = !occupied ||
        ['gold', 'coin', 'timberwoodchoppedobject'].includes(occupied);

      if (!canPlace) {
        // Try again in 1s
        if (isMonster) {
          scheduleRespawn(monsterId, 1000);
        } else {
          scheduleRespawn(levelId, key, type, 1000);
        }
        return prevLevels;
      }

      // ─── Place the object
      if (isMonster) {
        const [x, y] = key.split(',').map(Number);
        const newMonsterId = `${type}_${levelId}_${x}_${y}`;
        setGlobalMonsterHealths(p => ({ ...p, [newMonsterId]: 100 }));
        setMonsterTypes(p => ({ ...p, [newMonsterId]: type }));

        return {
          ...prevLevels,
          [levelId]: {
            ...level,
            objects: { ...level.objects, [key]: newMonsterId },
            respawnQueue: level.respawnQueue.filter(i => !(i.key === key && i.type === type))
          }
        };
      } else {
        // Static object (tree, stone, etc.)
        return {
          ...prevLevels,
          [levelId]: {
            ...level,
            objects: { ...level.objects, [key]: type },
            respawnQueue: level.respawnQueue.filter(i => !(i.key === key && i.type === type))
          }
        };
      }
    });
  }, delay);

}, [levels, updateLevel, setLevels, setGlobalMonsterHealths, setMonsterTypes]);

// ──────────────────────────────────────────────────────────────
//  uses per-type delay
// ──────────────────────────────────────────────────────────────
const onQueueRespawn = useCallback((levelId, { key, type }) => {
  console.log('[useGameState] onQueueRespawn called:', { levelId, key, type });
  const delay = getRespawnDelay(type);
  scheduleRespawn(levelId, key, type, delay);
}, [scheduleRespawn]);

  const handleGridChange = useCallback((newGrid, levelId = currentLevel) => {
    const restricted = new Set();
    newGrid.forEach((row, y) => {
      row.forEach((tile, x) => {
        if (RESTRICTED_TERRAIN.has(tile)) restricted.add(`${x},${y}`);
      });
    });
    setRestrictedTilesByLevel(prev => ({ ...prev, [levelId]: restricted }));
    updateLevel(levelId, { grid: newGrid });
  }, [currentLevel, updateLevel]);

  /* --------------------------------------------------------------
    For fighting monsters and respawning them
     -------------------------------------------------------------- */
  // Monster health update
const onMonsterHealthChange = useCallback((monsterId, newHealth) => {
  console.log('[useGameState] onMonsterHealthChange:', { monsterId, newHealth });

  setGlobalMonsterHealths(prev => ({
    ...prev,
    [monsterId]: newHealth
  }));

  if (newHealth > 0) return;

  const type = monsterTypes[monsterId];
  if (!['spider', 'skeleton'].includes(type)) return;

  // Uses per-type delay from RESPAWN_DELAYS (e.g. 30s for spider)
  scheduleRespawn(monsterId); // ← delay auto-determined by type
}, [monsterTypes, scheduleRespawn]);
  /* --------------------------------------------------------------
     8. Load maps + initialise monster health
     -------------------------------------------------------------- */
useEffect(() => {
  loadMaps().then(loaded => {
    const restricted = {};
    const initialized = {};

    Object.entries(loaded).forEach(([id, data]) => {
      /* ---------- restricted tiles ---------- */
      const restrictedTiles = new Set();
      data.grid.forEach((row, y) => {
        row.forEach((tile, x) => {
          if (RESTRICTED_TERRAIN.has(tile)) restrictedTiles.add(`${x},${y}`);
        });
      });
      restricted[id] = restrictedTiles;

      /* ---------- objects → monster IDs ---------- */
      const objects = { ...data.objects || {} };
      Object.entries(data.objects || {}).forEach(([key, type]) => {
        if (['skeleton', 'spider'].includes(type)) {
          const [x, y] = key.split(',').map(Number);
          const monsterId = `${type}_${id}_${x}_${y}`;   // spider_2_21_2
          objects[key] = monsterId;

          setMonsterTypes(prev => ({ ...prev, [monsterId]: type }));
          setGlobalMonsterHealths(prev => ({ ...prev, [monsterId]: 100 }));
        }
      });

      /* ---------- keep the *original* spawn map ---------- */
      const originalSpawns = data.originalSpawns || data.objects || {};

      initialized[id] = {
        ...data,
        objects,
        originalSpawns,               // <-- stored per level
        respawnQueue: []              // initialise queue
      };

      /* ---------- ONE global copy (optional) ---------- */
      setOriginalSpawns(prev => ({
        ...prev,
        [id]: originalSpawns
      }));
    });

    setRestrictedTilesByLevel(restricted);
    setLevels(initialized);
    setCurrentLevel(1);
    setIsLoading(false);
  });
}, []);

  /* --------------------------------------------------------------
     9. Derived values
     -------------------------------------------------------------- */
  const currentLevelData = levels[currentLevel] || {};
  const restrictedTiles = restrictedTilesByLevel[currentLevel] || new Set();

  /* --------------------------------------------------------------
     10. Return everything (including the NEW callback)
     -------------------------------------------------------------- */
  return {
    levels,
    currentLevel,
    currentLevelData,
    restrictedTiles,
    rows: ROWS,
    columns: COLS,
    isLoading,
    globalPlayerHealth,
    globalInventory,
    isDead,
    setIsDead,
    globalMonsterHealths,
    monsterTypes,

    setCurrentLevel,
    onLevelChange,
    onObjectsChange,
    onPlayerPosChange,
    handleGridChange,
    onQueueRespawn: payload => onQueueRespawn(currentLevel, payload),
    getOriginalSpawns: id => levels[id]?.originalSpawns || {},

    onPlayerHealthChange,
    onInventoryChange,
    onMonsterHealthChange,
    respawnPlayer,
    onPlayerMoveAttempt,
  clearPendingPickup,          // <-- expose to PlayMode
  pendingPickup: levels[currentLevel]?.pendingPickup ?? null,

    // <<< NEW >>>
    onPlayerMoveAttempt,

    // UI helpers
    renderSelector: () => (
      <select value={currentLevel} onChange={e => onLevelChange(Number(e.target.value))}>
        {Object.entries(levels).map(([id, data]) => (
          <option key={id} value={id}>{data.name || `Level ${id}`}</option>
        ))}
      </select>
    )
  };
};