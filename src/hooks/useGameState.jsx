// src/hooks/useGameState.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { loadMaps } from '../data/loadMaps';

const ROWS = 16;
const COLS = 24;
const PORTAL_ENTRY_POINTS = { 
  1: { x: 1, y: 1 }, // Town
  2: { x: 1, y: 2 }, // Wilderness
  3: { x: 1, y: 2 }, // Slimecave
  4: { x: 4, y: 4 }, // StoneCave
  5: { x: 1, y: 2 }, // Town Mines level 1
  6: { x: 1, y: 2 },  // Slimecave 1
  7: { x: 21, y: 3 }, // Town Mines level 2
  8: { x: 6, y: 4 }, // Town Mines level 3
  9: { x: 21, y: 14 }, }; // Deadshriek's lair
  
const RESTRICTED_TERRAIN = new Set([
  'stone', 'stonepillar', 'grassnowalk',
  'timberwallup', 'timberwallside', 'timberwallcornerright', 'timberwallcornerleft', 'mscv', 'none', 'mscl'
]);

// ──────────────────────────────────────────────────────
//  Monster base health – change only here
// ──────────────────────────────────────────────────────
// useGameState.js
const MONSTER_BASE_DATA = {
  skeleton:     { hp: 200,  name: "SKELETON" },
  spider:       { hp: 200,  name: "SPIDER" },
  littlespider: { hp: 300,  name: "LITTLE SPIDER" },
  cavespider:   { hp: 500,  name: "CAVE SPIDER" },
  demonspider:  { hp: 600,  name: "DEMON SPIDER" },
  deadshriek:   { hp: 1000, name: "DEAD SHRIEK" },
};

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
const [lastDamageTime, setLastDamageTime] = useState(Date.now());

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
     // USED THIS CODE BUT PLAYER OBJECT GOT STUCK IN LEVEL CHANGE
  // const onLevelChange = useCallback((newLevel, customSpawn = null) => {
  //   const id = String(newLevel);
  //   if (!levels[id]) return;
  //   const pos = customSpawn || PORTAL_ENTRY_POINTS[id] || { x: 1, y: 1 };
  //   updateLevel(id, { playerPos: pos });
  //   setCurrentLevel(Number(id));
  // }, [levels, updateLevel]);

  // NEW CODE, A BIT STRESS IMPLEMENTED, HELPS WITH PLAYER OBJECT NOT GETTING STUCK
  const onLevelChange = useCallback((newLevel, customSpawn = null) => {
  const id = String(newLevel);
  if (!levels[id]) return;

  const pos = customSpawn || PORTAL_ENTRY_POINTS[id] || { x: 1, y: 1 };
  const newKey = `${pos.x},${pos.y}`;

  // STEP 1: Clear 'player' from ALL levels
  const cleanedLevels = Object.fromEntries(
    Object.entries(levels).map(([levelId, level]) => {
      const newObjects = { ...level.objects };
      let changed = false;

      Object.keys(newObjects).forEach(key => {
        if (newObjects[key] === 'player') {
          delete newObjects[key];
          changed = true;
        }
      });

      return [levelId, { ...level, objects: changed ? newObjects : level.objects }];
    })
  );

  // STEP 2: Place player in new level
  cleanedLevels[id] = {
    ...cleanedLevels[id],
    playerPos: pos,
    objects: {
      ...cleanedLevels[id].objects,
      [newKey]: 'player'
    }
  };

  // STEP 3: Update state
  setLevels(cleanedLevels);
  setCurrentLevel(Number(id));
}, [levels, setLevels]);

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
     const [healPopup, setHealPopup] = useState(null);

const onHealPopup = useCallback((x, y, amount) => {
  setHealPopup({ x, y, damage: amount, isHeal: true });
}, []);

// Level and player pos
useEffect(() => {
  const levelData = levels[currentLevel];
  if (levelData?.playerPos) {
    playerPosRef.current = levelData.playerPos;
  }
}, [currentLevel, levels]);

const playerPosRef = useRef({ x: 0, y: 0 });

const onPlayerHealthChange = useCallback((setter) => {
  setGlobalPlayerHealth(prev => {
    const newHealth = typeof setter === 'function' ? setter(prev) : setter;
    if (newHealth <= 0 && !isDead) setIsDead(true);
    return newHealth;
  });
}, [isDead]);

// Reset popup after animation
const onHealPopupFinish = useCallback(() => {
  setHealPopup(null);
}, []);
// Inventory
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
      'bridge','ladder','hole-to-5', 'hole-to-6', 'hole-to-7', 'rope-to-1', 'rope-to-2', 'rope-to-3', 'rope-to-4', 'rope-to-5', 'rope-to-6',
      'rope-to-7', 'rope-to-8',
      'campfirebenchobject_right', 'campfirebenchobject_left', 'campfirebenchobject_bottom', 'campfirebenchobject_top'
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
    pendingPickup: pickupItem
  });
  
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
const getOriginalKey = useCallback((monsterId, levels) => {
  console.log('[getOriginalKey] Called for:', monsterId);

  if (!monsterId || typeof monsterId !== 'string') {
    console.warn('→ Invalid monsterId:', monsterId);
    return null;
  }

  const parts = monsterId.split('_');
  if (parts.length < 4) {
    console.warn('→ Invalid format:', parts);
    return null;
  }

  // EXTRACT FROM ID: spider_2_21_2 → x=21, y=2
  const x = parts[2];
  const y = parts[3];
  const key = `${x},${y}`;

  console.log('→ Extracted from ID:', key);
  return key;
}, [levels]);

// ──────────────────────────────────────────────────────────────
// Respawn delay map – define once, use everywhere
// ──────────────────────────────────────────────────────────────
const RESPAWN_DELAYS = {
  treeobject: 1500,
  lightstoneobject: 2000,
  spider: 2000,
  littlespider: 2000,
  skeleton: 30000,
  cavespider: 50000,      
  deadshriek: 50000,    
  default: 10000
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
  console.log('[scheduleRespawn] CALLED WITH:', { arg1, arg2, arg3, arg4 });
  console.log('typeof arg1:', typeof arg1);

  let levelId, key, type, delay = 3000;
  let isMonster = false;
  let monsterId = null;

  // ─── Overload 1: monsterId (string)
  if (typeof arg1 === 'string') {
    monsterId = arg1;
    console.log('→ [MONSTER PATH] monsterId =', monsterId);

    const parts = monsterId.split('_');
    console.log('→ parts =', parts);

    if (parts.length < 4) {
      console.warn('→ Invalid monsterId format:', monsterId);
      return;
    }

    type = parts[0];
    levelId = Number(parts[1]);
    delay = typeof arg2 === 'number' ? arg2 : getRespawnDelay(type);
    const forceSpawn = typeof arg3 === 'boolean' ? arg3 : false;

    console.log('→ type:', type, 'levelId:', levelId, 'delay:', delay, 'forceSpawn:', forceSpawn);

    let origKey;
    if (forceSpawn) {
      const x = parts[2], y = parts[3];
      origKey = `${x},${y}`;
      console.log('→ forceSpawn: using x,y from ID →', origKey);
    } else {
      console.log('→ Calling getOriginalKey for:', monsterId);
      origKey = getOriginalKey(monsterId, levels);
      console.log('→ getOriginalKey returned:', origKey);
      if (!origKey) {
        console.warn('→ [FATAL] No original key for:', monsterId);
        return;
      }
    }

    key = origKey;
    isMonster = true;

  // ─── Overload 2: levelId, key, type, delay
  } else {
    levelId = arg1;
    key = arg2;
    type = arg3;
    delay = arg4 ?? 3000;
    isMonster = false;
    console.log('→ [STATIC PATH] levelId:', levelId, 'key:', key, 'type:', type, 'delay:', delay);
  }

  console.log('→ FINAL: levelId=', levelId, 'key=', key, 'type=', type, 'isMonster=', isMonster);

  const timestamp = Date.now() + delay;
  console.log('→ timestamp =', new Date(timestamp).toLocaleTimeString());

  // ─── Prevent duplicate
  const queue = levels[levelId]?.respawnQueue || [];
  const alreadyQueued = queue.some(i => i.key === key && i.type === type);
  if (alreadyQueued) {
    console.log('→ [DUPLICATE] Already queued:', { levelId, key, type });
    return;
  }

  // ─── Add to queue
  console.log('→ Adding to queue:', { levelId, key, type, timestamp });
  updateLevel(levelId, prev => ({
    ...prev,
    respawnQueue: [...(prev.respawnQueue || []), { key, type, timestamp }]
  }));

  // ─── Set timeout
  console.log('→ setTimeout in', delay, 'ms');
  const timerId = setTimeout(() => {
    console.log('[TIMER FIRED] for:', { levelId, key, type, monsterId });

    setLevels(prevLevels => {
      const level = prevLevels[levelId];
      if (!level) {
        console.warn('→ Level not found:', levelId);
        return prevLevels;
      }

      const now = Date.now();
      console.log('→ now:', now, 'timestamp:', timestamp, 'too early?', now < timestamp);

      if (now < timestamp) {
        console.log('→ Too early → rescheduling in', timestamp - now, 'ms');
        if (isMonster) {
          console.log('→ RECALL: scheduleRespawn(monsterId, delay)');
          scheduleRespawn(monsterId, timestamp - now);
        } else {
          console.log('→ RECALL: scheduleRespawn(levelId, key, type, delay)');
          scheduleRespawn(levelId, key, type, timestamp - now);
        }
        return prevLevels;
      }

      const occupied = level.objects[key];
      console.log('→ Tile occupied by:', occupied);

// === FIND NEARBY AVAILABLE TILE ===
const [origX, origY] = key.split(',').map(Number);
const lootTiles = ['gold', 'coin', 'timberwoodchoppedobject', 'lightstonechoppedobject', 'spiderweb'];

let placed = false;
let newKey = key;

for (let radius = 1; radius <= 5 && !placed; radius++) {
  const candidates = [];

  for (let dx = -radius; dx <= radius; dx++) {
    for (let dy = -radius; dy <= radius; dy++) {
      if (Math.abs(dx) + Math.abs(dy) > radius) continue; // Manhattan

      const nx = origX + dx;
      const ny = origY + dy;
      const nKey = `${nx},${ny}`;

      if (nKey === key) continue; // skip original (we already know it's blocked)

      const occupant = level.objects[nKey];
      if (!occupant || lootTiles.includes(occupant)) {
        candidates.push({ key: nKey, dist: Math.abs(dx) + Math.abs(dy) });
      }
    }
  }

  if (candidates.length > 0) {
    // Sort by distance, pick closest
    candidates.sort((a, b) => a.dist - b.dist);
    newKey = candidates[0].key;
    placed = true;
    console.log(`→ SPAWNING NEARBY at ${newKey} (dist: ${candidates[0].dist})`);
  }
}

if (!placed) {
  console.log('→ No nearby tile → retry in 1s');
  if (isMonster) {
    scheduleRespawn(monsterId, 1000);
  } else {
    scheduleRespawn(levelId, key, type, 1000);
  }
  return prevLevels;
}

      console.log('→ PLACING:', isMonster ? 'MONSTER' : 'STATIC');

      if (isMonster) {
        const [x, y] = key.split(',').map(Number);
        const newMonsterId = `${type}_${levelId}_${x}_${y}`;
        console.log('→ Spawning new monster:', newMonsterId, 'at', key);
       // ── use base health from monsterData  ──
setGlobalMonsterHealths(p => ({
  ...p,
  [newMonsterId]: MONSTER_BASE_DATA[type]?.hp ?? 100
}));
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

}, [levels, updateLevel, setLevels, setGlobalMonsterHealths, setMonsterTypes, getOriginalKey]);

// ──────────────────────────────────────────────────────────────
//  RESPAWN, PART OF ABOVE
// ──────────────────────────────────────────────────────────────
const onQueueRespawn = useCallback((levelId, { key, type }) => {
  console.log('[useGameState] onQueueRespawn called:', { levelId, key, type });
  const delay = getRespawnDelay(type);
  scheduleRespawn(levelId, key, type, delay);
}, [scheduleRespawn]);

// ──────────────────────────────────────────────────────────────
//  SPAWN
// ──────────────────────────────────────────────────────────────
const spawnMonster = useCallback(
  (key, type, delay = 0) => {
    console.log('[useGameState] spawnMonster', { levelId: currentLevel, key, type, delay });

    const [x, y] = key.split(',');
    const fakeMonsterId = `${type}_${currentLevel}_${x}_${y}`;

    // ALWAYS forceSpawn = true — this is for quests/events only
    scheduleRespawn(fakeMonsterId, delay, true);
  },
  [currentLevel, scheduleRespawn]
);
// ──────────────────────────────────────────────────────────────
//  A HELP-SWEEPER TO SPAWN EVERY 30 SECONDS. HELPS TO AVOID STALE MONSTERS
// ──────────────────────────────────────────────────────────────
useEffect(() => {
  const interval = setInterval(() => {
    const level = levels[currentLevel];
    if (!level?.objects) return;

    // Scan current monsters in objects
    Object.entries(level.objects).forEach(([key, objId]) => {
      if (typeof objId !== 'string' || !objId.includes('_')) return;
      
      const type = objId.split('_')[0];
      if (!['spider', 'littlespider', 'skeleton', 'cavespider', 'demonspider', 'deadshriek'].includes(type)) return;

      // If tile is empty or wrong → respawn
      if (!level.objects[key] || level.objects[key] !== objId) {
        console.log(`[SWEEP] Respawn ${type} at ${key}`);
        scheduleRespawn(currentLevel, key, type, 0);
      }
    });
  }, 30_000);

  return () => clearInterval(interval);
}, [levels, currentLevel, scheduleRespawn]);

// ------------------------
// GRID CHANGES
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

  if (newHealth > 0) {
    setGlobalMonsterHealths(prev => ({
      ...prev,
      [monsterId]: newHealth
    }));
    return;
  }

  // === MONSTER IS DEAD ===
  const type = monsterTypes[monsterId];
  if (!['spider', 'littlespider', 'skeleton', 'cavespider', 'demonspider', 'deadshriek'].includes(type)) return;

  // 1. DROP LOOT (in objects)
  const parts = monsterId.split('_');
  const x = parts[2], y = parts[3];
  const key = `${x},${y}`;
  const levelId = Number(parts[1]);

  // Loot handled in CombatSystem
  // const loot = ['spider', 'littlespider', 'cavespider'].includes(type) && Math.random() < 0.33
  //   ? 'spiderweb'
  //   : 'gold';

  // 2. FULL CLEANUP
  setGlobalMonsterHealths(prev => {
    const copy = { ...prev };
    delete copy[monsterId];
    return copy;
  });

  setMonsterTypes(prev => {
    const copy = { ...prev };
    delete copy[monsterId];
    return copy;
  });

  // 3. REPLACE IN objects WITH LOOT
  setLevels(prevLevels => {
    const level = prevLevels[levelId];
    if (!level) return prevLevels;

    return {
      ...prevLevels,
      [levelId]: {
        ...level,
        objects: {
          ...level.objects
          // [key]: loot  // ← loot replaces monster
        }
      }
    };
  });

  // 4. SCHEDULE RESPAWN (safe now — old ID is GONE)
  scheduleRespawn(monsterId, RESPAWN_DELAYS[type] || 3000);

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
        if (['skeleton', 'spider', 'littlespider', 'cavespider', 'demonspider', 'deadshriek'].includes(type)) {
          const [x, y] = key.split(',').map(Number);
          const monsterId = `${type}_${id}_${x}_${y}`;   // spider_2_21_2
          objects[key] = monsterId;

          setMonsterTypes(prev => ({ ...prev, [monsterId]: type }));
          // ── use base health from monsterData ──
          setGlobalMonsterHealths(prev => ({
            ...prev,
            [monsterId]: MONSTER_BASE_DATA[type]?.hp ?? 100
          }));
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
    healPopup,
    onHealPopup,
    onHealPopupFinish,
    // lastDamageTime, NOTE THAT THIS IS COMMENTED OUT. It works at this level but blocks HealthRegen component for some reason
    setLastDamageTime,

    monsterData: MONSTER_BASE_DATA, // For setting different healths on different monsters

    setCurrentLevel,
    onLevelChange,
    onObjectsChange,
    onPlayerPosChange,
    handleGridChange,
    onQueueRespawn: payload => onQueueRespawn(currentLevel, payload),
    getOriginalSpawns: id => levels[id]?.originalSpawns || {},
    spawnMonster,

    onPlayerHealthChange,
    onInventoryChange,
    onMonsterHealthChange,
    respawnPlayer,
    onPlayerMoveAttempt,
  clearPendingPickup,          // <-- expose to PlayMode
  pendingPickup: levels[currentLevel]?.pendingPickup ?? null,

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