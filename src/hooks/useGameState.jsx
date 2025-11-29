// src/hooks/useGameState.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { loadMaps } from '../data/loadMaps';
import MONSTER_DATA from '../../public/data/monsters.json';
import { OBJECT_DATA } from '../data/objectRegistry';
import { MONSTER_TYPES, isMonster } from '../utils/monsterRegistry';
import { ITEMS } from '../components/Items.jsx';

// OLD
// const ROWS = 16;
// const COLS = 24;

// STORY AND DEFAULT
const COLS = 50;
const ROWS = 50;
const TILE_SIZE = 48;
// SURVIVAL
const SURVIVAL_ROWS = 30;
const SURVIVAL_COLS = 30;

const PORTAL_ENTRY_POINTS = { 
  1: { x: 1, y: 1 }, // Town
  2: { x: 1, y: 2 }, // Wilderness
  3: { x: 1, y: 2 }, // Slimecave
  4: { x: 4, y: 4 }, // StoneCave
  5: { x: 1, y: 2 }, // Town Mines level 1
  6: { x: 1, y: 2 },  // Slimecave 3
  7: { x: 21, y: 3 }, // Town Mines level 2
  8: { x: 6, y: 4 }, // Town Mines level 3
  9: { x: 21, y: 14 }, // Deadshriek's lair
  10: { x: 1, y: 2 }, }; // Slimecave 2

const RESTRICTED_TERRAIN = new Set([
  'stone', 'stonepillar', 'grassnowalk',
  'timberwallup', 'timberwallside', 'timberwallcornerright', 'timberwallcornerleft', 'mscv', 'none', 'mscl', 'lava', 'slime', 'slimedark'
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
  const [lastDamageTime, setLastDamageTime] = useState(Date.now());

  // Derive monster types directly from JSON
  const MONSTER_TYPES = Object.keys(MONSTER_DATA);
  const isMonster = (type) => MONSTER_TYPES.includes(type);
// -------------------------------------------------
// 1. Static object registry (shared by every level)
// -------------------------------------------------
  const [objectTypes] = useState(OBJECT_DATA);   // immutable – never changes

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
    // objects: {
    //   ...cleanedLevels[id].objects,
    //   [newKey]: 'player'
    // }
  };

  // STEP 3: Update state
  setLevels(cleanedLevels);
  setCurrentLevel(Number(id));
}, [levels, setLevels]);

// ──────────────────────────────────────────────────────────────
//  TRACK SURVIVAL MODE STATS
// ──────────────────────────────────────────────────────────────
const [startTime, setStartTime] = useState(null);
const [elapsedTime, setElapsedTime] = useState(0);
const [isTimerRunning, setIsTimerRunning] = useState(false);
const [finalScore, setFinalScore] = useState(null);
useEffect(() => {
  if (!isTimerRunning || isDead) return;

  const interval = setInterval(() => {
    setElapsedTime(Date.now() - startTime);
  }, 100); // smooth enough, low overhead

  return () => clearInterval(interval);
}, [isTimerRunning, isDead, startTime]);
const getCurrentSurvivalWave = () => {
  return levels.survival?.currentWave ?? 1;
};

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
// useEffect(() => {
//   const levelData = levels[currentLevel];
//   if (levelData?.playerPos) {
//     playerPosRef.current = levelData.playerPos;
//   }
// }, [currentLevel, levels]);
// AUTO-START SURVIVAL TIMER — ONLY WHEN NEEDED
// Level and player pos
useEffect(() => {
  const levelData = levels[currentLevel];

  if (levelData?.playerPos) {
    playerPosRef.current = levelData.playerPos;

    // SURVIVAL MODE: START TIMER (once per run)
    if (
      currentLevel === 'survival' &&
      !isDead &&
      !isTimerRunning &&
      levelData.playerPos // ensures player actually spawned
    ) {
      console.log('SURVIVAL MODE DETECTED → TIMER STARTED');
      setStartTime(Date.now() - elapsedTime); // resumes if somehow paused (defensive)
      setIsTimerRunning(true);
      setFinalScore(null); // fresh run
    }
  }
}, [currentLevel, levels, isDead, isTimerRunning, elapsedTime]);

const playerPosRef = useRef({ x: 0, y: 0 });

// const onPlayerHealthChange = useCallback((setter) => {
//   setGlobalPlayerHealth(prev => {
//     const newHealth = typeof setter === 'function' ? setter(prev) : setter;
//     if (newHealth <= 0 && !isDead) setIsDead(true);
//     return newHealth;
//   });
// }, [isDead]);
const onPlayerHealthChange = useCallback((setter) => {
  setGlobalPlayerHealth(prev => {
    const newHealth = typeof setter === 'function' ? setter(prev) : setter;
    const clampedHealth = Math.max(0, newHealth);

    // ONLY HANDLE DEATH IN SURVIVAL MODE
    if (clampedHealth <= 0 && !isDead && currentLevel === 'survival') {
      setIsDead(true);
      setIsTimerRunning(false);

      const finalWave = levels.survival?.currentWave ?? 1;
      const timeSeconds = elapsedTime / 1000;

      const score = Math.floor(
        (finalWave * 12000) +
        Math.max(180000 - timeSeconds * 90, 0) +
        (finalWave >= 8 ? (finalWave - 7) * 30000 : 0)
      );

      setFinalScore(score);

      // Highscore — survival only
      const key = 'grokySurvivalHighscore';
      const best = Number(localStorage.getItem(key) || 0);
      if (score > best) {
        localStorage.setItem(key, score.toString());
        console.log('NEW SURVIVAL HIGH SCORE:', score);
      }
    }

    // Regular levels? Just die normally, no score
    else if (clampedHealth <= 0 && !isDead) {
      setIsDead(true);
    }

    return clampedHealth;
  });
}, [isDead, currentLevel, elapsedTime, levels.survival?.currentWave]);

// Reset popup after animation
const onHealPopupFinish = useCallback(() => {
  setHealPopup(null);
}, []);
// Inventory
const onInventoryChange = useCallback((updater) => {
  setGlobalInventory(prev => {
    const next = typeof updater === 'function' ? updater(prev) : updater;

    // Clean zero quantities
    const cleaned = { ...next };
    Object.keys(cleaned).forEach(key => {
      if (cleaned[key] === 0) delete cleaned[key];
    });

    return cleaned; // ← NO equipment here!
  });
}, []);
  // const onInventoryChange = useCallback((updater) => {
  //   setGlobalInventory(prev => (typeof updater === 'function' ? updater(prev) : updater));
  // }, []);

  
  /* --------------------------------------------------------------
     6. NEW: PLAYER MOVE – the whole logic lives here
     -------------------------------------------------------------- */
  const onPlayerMoveAttempt = useCallback((newPos) => {
  // console.log('[MOVE ATTEMPT] Input:', newPos);  // ← FIXED: use `newPos`

  // Handle BOTH {x,y} AND {dx,dy}
  let finalPos;
  if (newPos.dx !== undefined) {
    // Joystick format
    finalPos = { x: playerPos.x + newPos.dx, y: playerPos.y + newPos.dy };
    console.log('[MOVE] Joystick →', finalPos);
  } else {
    // Keyboard format  
    finalPos = newPos;
    // console.log('[MOVE] Keyboard →', finalPos);
  }

  const levelId = currentLevel;
  const level = levels[levelId];
  if (!level) return;

  const { objects = {}, playerPos, restrictedTiles = new Set() } = level;

  const newKey = `${finalPos.x},${finalPos.y}`;
  const oldKey = playerPos ? `${playerPos.x},${playerPos.y}` : null;

  // ---- 1. Validate -------------------------------------------------
  if (restrictedTiles.has(newKey)) return;
  const targetObj = objects[newKey];

  // ---- 2. Build new objects map ----------------------------------
  const newObjs = { ...objects };
  if (oldKey && newObjs[oldKey] === 'player') delete newObjs[oldKey];

  // ---- 3. PICK-UP -------------------------------------------------
  const PICKUP = new Set([
    'spiderweb','timber','coin','gold','potion','woodobject',
    'rockobject', 'dark-armor', 'knights-armor', 'short-sword', 'bow', 'crossbow', 'fireball', 'iceball', 'windball'
  ]);
  let pickupItem = null;

  if (targetObj && PICKUP.has(targetObj)) {
    pickupItem = targetObj;
  } else {
    const PERSIST = new Set([
      'unlockeddoorobject','portal-to-1','portal-to-2','portal-to-3','portal-to-4',
      'bridge','ladder','hole-to-4', 'hole-to-5', 'hole-to-6', 'hole-to-7', 'hole-to-8', 'hole-to-9',
      'rope-to-1', 'rope-to-2', 'rope-to-3', 'rope-to-4', 'rope-to-5', 'rope-to-6', 'rope-to-7', 'rope-to-8',
      'campfirebenchobject_right', 'campfirebenchobject_left', 'campfirebenchobject_bottom', 'campfirebenchobject_top'
    ]);
    const isPersist = targetObj && PERSIST.has(targetObj);
    if (!isPersist && !targetObj?.startsWith('portal-to-')) {
      newObjs[newKey] = 'player';
    }
  }

  // ---- 4. Commit --------------------------------------------------
  updateLevel(levelId, {
    // objects: newObjs,
    playerPos: finalPos,
    pendingPickup: pickupItem
  });
  
}, [currentLevel, levels, updateLevel, playerPosRef]);

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
  if (!monsterId || typeof monsterId !== 'string') return null;
  const parts = monsterId.split('_');
  if (parts.length < 5) return null;
  
  // LAST 2 PARTS = ALWAYS x,y
  const x = parts[parts.length - 2];
  const y = parts[parts.length - 1];
  return `${x},${y}`;
}, []);

// ──────────────────────────────────────────────────────────────
// Respawn delay map – define once, use everywhere
// ──────────────────────────────────────────────────────────────
const RESPAWN_DELAYS = {
  treeobject: 1500,
  lightstoneobject: 2000,
  spider: 2000,
  littlespider: 2000,
  skeleton1: 30000,
  cavespider: 50000,      
  deadshriek: 50000,
  swamptroll: 30000,
  swamptroll1: 30000,
  swampgolem: 30000,
  swampgolem1: 30000,
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
// ──────────────────────────────────────────────────────────────
// 1. Helper: Is this a survival wave monster? → NO individual respawn
// ──────────────────────────────────────────────────────────────
const isSurvivalWaveMonster = (monsterId) => {
  return typeof monsterId === 'string' && monsterId.includes('_wave');
};

// ──────────────────────────────────────────────────────────────
// 2. Helper: Extract coordinates from ANY monsterId (old or new format)
// ──────────────────────────────────────────────────────────────
const extractCoordsFromId = (monsterId) => {
  if (!monsterId) return null;
  const parts = monsterId.split('_');
  // Last two parts are always x,y (even with wave: skeleton1_Survival_wave3_10_15)
  if (parts.length < 3) return null;
  const y = parts.pop();
  const x = parts.pop();
  return `${x},${y}`;
};

// ──────────────────────────────────────────────────────────────
// 3. Helper: Generate fresh monsterId (universal format)
// ──────────────────────────────────────────────────────────────
const generateMonsterId = (type, levelId, key, waveNumber = null) => {
  const [x, y] = key.split(',');
  const wavePart = waveNumber !== null ? `_wave${waveNumber}` : '';
  return `${type}_${levelId}${wavePart}_${x}_${y}`;
};

// ──────────────────────────────────────────────────────────────
// 4. FINAL UNIVERSAL scheduleRespawn (replace your giant one)
// ──────────────────────────────────────────────────────────────
const scheduleRespawn = useCallback((arg1, arg2, arg3, arg4) => {
  let levelId, key, type, delay;
  let isMonster = false;

  // ─── Overload 1: monsterId string → respawn that monster
  if (typeof arg1 === 'string') {
    const monsterId = arg1;

    // SURVIVAL WAVE MONSTERS: never respawn individually
    if (isSurvivalWaveMonster(monsterId)) {
      console.log('[scheduleRespawn] Ignoring wave monster respawn:', monsterId);
      return;
    }

    const parts = monsterId.split('_');
    type = parts[0];

    // Extract levelId
    const levelPart = parts[1];
    levelId = levelPart === 'survival' || levelPart === 'story' ? levelPart : 'story';

    delay = typeof arg2 === 'number' ? arg2 : getRespawnDelay(type);

    // Extract key safely
    key = extractCoordsFromId(monsterId);
    if (!key) {
      console.warn('[scheduleRespawn] Could not extract coords from:', monsterId);
      return;
    }

    isMonster = true;

  // ─── Overload 2: levelId, key, type, delay → static object
  } else {
    levelId = arg1;
    key = arg2;
    type = arg3;
    delay = arg4 ?? getRespawnDelay(arg3);
    isMonster = false;
  }

  // ─── Final validation
  if (!levelId || !key || !type) {
    console.warn('[scheduleRespawn] Invalid args:', { levelId, key, type });
    return;
  }

  const timestamp = Date.now() + delay;

  // ─── Add to respawnQueue (prevents duplicates)
  updateLevel(levelId, prev => ({
    ...prev,
    respawnQueue: [...(prev.respawnQueue || []).filter(i => !(i.key === key && i.type === type)),
             { key, type, timestamp, isMonster }]
  }));

  // ─── The actual timer
  const timer = setTimeout(() => {
    setLevels(prevLevels => {
      const level = prevLevels[levelId];
      if (!level) return prevLevels;

      // Remove from queue
      const newQueue = level.respawnQueue?.filter(i => !(i.key === key && i.type === type)) || [];

      // Try to place (prefer original tile)
      const tryPlace = (targetKey) => {
        const occupant = level.objects[targetKey];
        const walkable = !occupant || ['gold', 'spiderweb', 'coin'].includes(occupant);
        if (walkable) {
          if (isMonster) {
            const newMonsterId = generateMonsterId(type, levelId, targetKey);
            setMonsterTypes(p => ({ ...p, [newMonsterId]: type }));
            setGlobalMonsterHealths(p => ({ ...p, [newMonsterId]: MONSTER_DATA[type]?.hp ?? 100 }));
            return { ...level.objects, [targetKey]: newMonsterId };
          } else {
            return { ...level.objects, [targetKey]: type };
          }
        }
        return null;
      };

      // 1. Try original spot
      let newObjects = tryPlace(key);
      if (newObjects) {
        return { ...prevLevels, [levelId]: { ...level, objects: newObjects, respawnQueue: newQueue }};
      }

      // 2. Try nearby (simple 3x3)
      const [x, y] = key.split(',').map(Number);
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx, ny = y + dy;
          const nKey = `${nx},${ny}`;
          newObjects = tryPlace(nKey);
          if (newObjects) {
            return { ...prevLevels, [levelId]: { ...level, objects: newObjects, respawnQueue: newQueue }};
          }
        }
      }

      // 3. Still blocked? Retry in 2s
      scheduleRespawn(levelId, key, type, 2000);
      return prevLevels;
    });
  }, delay);

}, [updateLevel, setLevels, setMonsterTypes, setGlobalMonsterHealths]);

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
// NEW
const spawnMonsterAt = useCallback((levelId, key, type, waveNumber = null) => {
  const [x, y] = key.split(',').map(Number);
  const wavePart = waveNumber ? `_wave${waveNumber}` : '';
  const monsterId = `${type}_${levelId}${wavePart}_${x}_${y}`;

  console.log(`SPAWNING MONSTER: ${monsterId} at ${key}`);

  setLevels(prev => {
    const level = prev[levelId];
    if (!level) return prev;

    // Initialize activeMonstersThisWave if needed
    const activeMonstersThisWave = level.activeMonstersThisWave || new Set();

    // Add this monster to current wave tracking
    if (waveNumber != null) {
      activeMonstersThisWave.add(monsterId);
    }

    return {
      ...prev,
      [levelId]: {
        ...level,
        objects: { ...level.objects, [key]: monsterId },
        activeMonstersThisWave // persist the Set
      }
    };
  });

  setMonsterTypes(p => ({ ...p, [monsterId]: type }));
  setGlobalMonsterHealths(p => ({ ...p, [monsterId]: MONSTER_DATA[type]?.hp ?? 100 }));
}, []);
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
      if (!isMonster(type)) return;

      // Respawn if missing or changed
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
     // -------------------------------------------------
// Check wave complete for Survival Mode
// -------------------------------------------------
const checkWaveComplete = useCallback(() => {
  setLevels(prevLevels => {
    const level = prevLevels.survival;
    if (!level || level.currentWave == null) return prevLevels;

    const active = level.activeMonstersThisWave;
    if (!active || active.size > 0) {
      console.log(`Wave ${level.currentWave} still has ${active?.size || 0} monsters alive`);
      return prevLevels;
    }

    console.log(`WAVE ${level.currentWave} FULLY CLEARED!`);

    const nextWaveNum = level.currentWave + 1;
    const nextWaveKey = `wave${nextWaveNum}`;
    const nextSpawns = level.survivalWaves?.[nextWaveKey];

    if (!nextSpawns) {
      return {
        ...prevLevels,
        survival: { ...level, name: 'Survival Mode - Victory!' }
      };
    }

    // Clear old set, prepare for new wave
    setTimeout(() => {
      setLevels(current => {
        const freshLevel = current.survival;
        if (!freshLevel) return current;

        const spawns = freshLevel.survivalWaves[`wave${nextWaveNum}`];
        if (!spawns) return current;

        console.log(`SPAWNING WAVE ${nextWaveNum}`);
        Object.entries(spawns).forEach(([key, type]) => {
          spawnMonsterAt('survival', key, type, nextWaveNum);
        });

        return {
          ...current,
          survival: {
            ...freshLevel,
            currentWave: nextWaveNum,
            name: `Survival Mode - Wave ${nextWaveNum}`,
            activeMonstersThisWave: new Set() // will be populated by spawnMonsterAt
          }
        };
      });
    }, 5000);

    return {
      ...prevLevels,
      survival: {
        ...level,
        currentWave: nextWaveNum,
        name: `Survival Mode - Wave ${nextWaveNum} (spawning...)`,
        activeMonstersThisWave: new Set() // clear for next wave
      }
    };
  });
}, [spawnMonsterAt]);
  // Monster health update
const onMonsterHealthChange = useCallback((monsterId, newHealth) => {
  // console.log('[useGameState] onMonsterHealthChange:', { monsterId, newHealth });

  if (newHealth > 0) {
    setGlobalMonsterHealths(prev => ({
      ...prev,
      [monsterId]: newHealth
    }));
    return;
  }

  // === MONSTER IS DEAD ===
  const type = monsterTypes[monsterId];
  if (!isMonster(type)) return;

  const parts = monsterId.split('_');
  // Format: type_level[_waveN]_x_y
  const levelName = parts[1];           // 'survival', 'story', etc.
  const hasWave = parts.length === 5;   // wave present → 5 parts
  const x = hasWave ? parts[3] : parts[2];
  const y = hasWave ? parts[4] : parts[3];
  const key = `${x},${y}`;

  console.log(`\n[DEATH] Monster ${monsterId} died at ${key} (${levelName})`);

  // 1. Global cleanup
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

  // 2. Remove from level.objects (clear tile)
  setLevels(prevLevels => {
    const level = prevLevels[levelName];
    if (!level) {
      console.warn(`Level ${levelName} not found!`);
      return prevLevels;
    }

    const newObjects = { ...level.objects };
    delete newObjects[key]; // or set to null / loot later

    console.log(`   Cleared tile ${key} (was: ${level.objects[key]})`);

    return {
      ...prevLevels,
      [levelName]: {
        ...level,
        objects: newObjects
      }
    };
  });

  // 3. Survival mode: remove from active wave tracking
  if (levelName === 'survival') {
    setLevels(prevLevels => {
      const level = prevLevels.survival;
      if (!level?.activeMonstersThisWave) return prevLevels;

      const updatedSet = new Set(level.activeMonstersThisWave);
      const removed = updatedSet.delete(monsterId);

      console.log(`   Removed ${monsterId} from active wave monsters (${removed ? 'success' : 'not found'})`);

      return {
        ...prevLevels,
        survival: {
          ...level,
          activeMonstersThisWave: updatedSet
        }
      };
    });
  }

  // 4. Respawn logic
  if (levelName !== 'survival') {
    console.log(`   Scheduling respawn in ${levelName}...`);
    scheduleRespawn(monsterId, RESPAWN_DELAYS[type] || 3000);
  } else {
    console.log(`   Survival mode → no respawn`);
  }

  // 5. Trigger wave complete check (only in survival)
  if (levelName === 'survival') {
    console.log(`   Triggering wave completion check...`);
    checkWaveComplete();
  }

  console.log('[DEATH END]\n');
}, [
  monsterTypes,
  scheduleRespawn,
  checkWaveComplete,
  // currentLevel not needed anymore — we get it from monsterId
]);
  /* --------------------------------------------------------------
     8. Load maps + initialise monster health
     -------------------------------------------------------------- */
     
// ──────────────────────────────────────────────────────────────
// 1. Level ID Constants (one source of truth)
// ──────────────────────────────────────────────────────────────
const LEVEL_IDS = {
  STORY: 'story',
  SURVIVAL: 'survival',
  TOWN: 'town',        // if you ever have separate town level
  DUNGEON: 'dungeon',
  BOSS: 'boss'
};

// ──────────────────────────────────────────────────────────────
// 2. Universal Monster ID Generator (fixed & predictable)
// ──────────────────────────────────────────────────────────────
const createMonsterId = (type, levelId, waveNumber, x, y) => {
  const wavePart = waveNumber ? `_wave${waveNumber}` : '';
  const monsterId = `${type}_${levelId}${wavePart}_${x}_${y}`;
  
  // console.log(`createMonsterId → ${monsterId}`, { type, levelId, waveNumber, x, y });
  
  return monsterId;
};

// ──────────────────────────────────────────────────────────────
// 3. Town Level Generator (clean component)
// ──────────────────────────────────────────────────────────────
const generateTownLevel = () => {
  const grid = Array(ROWS).fill().map(() => Array(COLS).fill('grass'));

  const staticObjects = {
    '7,7': 'treeobject',
    '6,7': 'treeobject',
    '5,7': 'treeobject',
    '5,5': 'treeobject',
    '5,6': 'treeobject',
    '8,8': 'boulder',
    '5,8': 'boulder',
  };

  const monsterSpawns = {
    '10,7': 'skeleton1',
    '10,10': 'cavespider'
  };

  return buildLevel({
    levelId: LEVEL_IDS.STORY,
    name: 'Town',
    gridType: 'grass',
    staticObjects,
    monsterSpawns,
    playerPos: PORTAL_ENTRY_POINTS[1],
    background: 'townbgreduced.webp'
  });
};

// ──────────────────────────────────────────────────────────────
// 4. Survival Level Generator (clean component)
// ──────────────────────────────────────────────────────────────
const generateSurvivalLevel = () => {
  // ← DO NOT read from any React state in here
  // ← Always return a completely new object

  const grid = Array(SURVIVAL_ROWS).fill().map(() => Array(SURVIVAL_COLS).fill('survivalfloor'));

const staticObjects = {
  // Boulders — natural obstacles & cover
  '5,14': 'boulder',
  '12,3': 'boulder',
  '9,7': 'boulder',
  '2,11': 'boulder',
  // '14,9': 'boulder',
  '18,4': 'boulder',
  '22,19': 'boulder',
  '3,21': 'boulder',
  '17,24': 'boulder',
  '25,10': 'boulder',

  // Dead trees — twisted forest remnants
  '3,4': 'deadtree1',
  '11,13': 'deadtree1',
  '7,2': 'deadtree1',
  '19,8': 'deadtree1',
  '4,17': 'deadtree1',
  '23,6': 'deadtree1',

  '1,8': 'deadtree2',
  '15,5': 'deadtree2',
  '6,15': 'deadtree2',
  '10,1': 'deadtree2',
  '21,22': 'deadtree2',
  '2,24': 'deadtree2',
  '13,25': 'deadtree2',
  '20,2': 'deadtree2',

  // Wall ruins — ancient crumbling walls (clusters feel intentional)
  // '10,6': 'wallruin',
  '14,8': 'wallruin',
  '18,8': 'wallruin',
  '14,14': 'wallruin',
  '18,14': 'wallruin',

  // Skull piles & bone decorations
  '5,5': 'skullobject',
  '8,18': 'skullobject',
  '14,20': 'skullobject',
  '24,14': 'skullobject',
  '10,22': 'skullobject',

  // Sacrificial altars
  '5,10': 'deadaltar',
  // '18,15': 'deadaltar',
  '9,3': 'deadaltar',

  // Ominous obelisks & monoliths
  // '12,12': 'obeliskstone',
  '3,13': 'obeliskstone',
  '22,11': 'obeliskstone',
  '16,23': 'obeliskstone'
};

const survivalWaves = {
  wave1: {
    '5,6': 'skeleton1',
    '5,11': 'skeleton1',
  },
  wave2: {
    '10,20': 'skeleton1',
    '12,15': 'skeleton1',
    '3,10': 'skeleton1',
    '1,5': 'skeleton1'
  },
  wave3: {
    '20,20': 'skeleton1',
    '8,7': 'skeleton1',
    '15,8': 'skeleton1',
    '5,9': 'skeleton1',
    '11,5': 'skeleton1',
    '17,10': 'skeleton1',
  },
  wave4: {
    '3,4': 'swamptroll',
    '8,20': 'swamptroll',
    '19,6': 'swamptroll',
    '22,12': 'swamptroll',
    '10,22': 'swamptroll',
    '9,16': 'skeleton1',
    '13,15': 'skeleton1',
    '6,13': 'skeleton1'
  },
  wave5: {
    '2,8': 'skeleton1',
    '7,3': 'skeleton1',
    '18,14': 'skeleton1',
    '24,18': 'swamptroll',
    '12,24': 'swamptroll',
    '5,16': 'skeleton1'
  },
  wave6: {
    '1,5': 'swamptroll',
    '9,2': 'skeleton1',
    '20,23': 'swamptroll',
    '15,3': 'skeleton1',
    '23,8': 'swamptroll',
    '4,18': 'skeleton1'
  },
  wave7: {
    '25,10': 'swamptroll',
    '3,22': 'skeleton1',
    '11,1': 'skeleton1',
    '19,25': 'swamptroll',
    '6,4': 'swamptroll',
    '21,3': 'skeleton1',
    '14,21': 'skeleton1'
  },
  wave8: {
    '2,14': 'swamptroll',
    '10,25': 'swamptroll',
    '24,5': 'swamptroll',
    '5,2': 'skeleton1',
    '18,20': 'swamptroll',
    '22,2': 'skeleton1',
    '8,23': 'swamptroll'
  },
  wave9: {
    '1,15': 'swamptroll',
    '13,3': 'swamptroll',
    '25,20': 'swamptroll',
    '4,25': 'skeleton1',
    '20,4': 'swamptroll',
    '9,19': 'skeleton1',
    '16,24': 'swamptroll',
    '7,1': 'skeleton1'
  },
  wave10: {
    '3,13': 'swamptroll',
    '11,23': 'swamptroll',
    '23,11': 'swamptroll',
    '5,7': 'swamptroll',
    '19,16': 'swamptroll',
    '14,25': 'swamptroll',
    '25,6': 'skeleton1',
    '2,19': 'swamptroll',
    '17,4': 'skeleton1',
    '8,17': 'swamptroll',
    '21,22': 'skeleton1'
  },
  wave11: {
    '5,6': 'deadshriek'
  },
    wave12: {
    '1,1': 'deadshriek',
    '5,20': 'deadshriek'
  }
};

  const initialWave = survivalWaves.wave1;

  const level = buildLevel({
    levelId: LEVEL_IDS.SURVIVAL,
    name: 'Survival Mode - Wave 1',
    gridType: 'survivalfloor',
    staticObjects,
    monsterSpawns: initialWave,
    playerPos: { x: 16, y: 16 },
    background: 'survivalmap.webp',
extraData: {
      survivalWaves,
      currentWave: 1,
      rows: SURVIVAL_ROWS,     // pass the real size
      cols: SURVIVAL_COLS,
      activeMonstersThisWave: new Set()
    }
  });

// Attach wave data
  level.survivalWaves = survivalWaves;
  level.currentWave = 1;

  // Override the grid size that buildLevel created (it used ROWS/COLS)
  level.grid = grid;                     // ← 30×30 grid
  level.rows = SURVIVAL_ROWS;
  level.cols = SURVIVAL_COLS;

  return level;
};

// ──────────────────────────────────────────────────────────────
// 5. Universal Level Builder (now PERFECT monsterIds)
// ──────────────────────────────────────────────────────────────
const buildLevel = ({
  levelId,
  name,
  gridType,
  staticObjects = {},
  monsterSpawns = {},
  playerPos,
  background,
  extraData = {},
  rows = ROWS,       // ← new optional params
  cols = COLS
}) => {
const grid = Array(rows).fill().map(() => Array(cols).fill(gridType));
  const objects = { ...staticObjects };

  Object.entries(monsterSpawns).forEach(([coord, type]) => {
    if (!isMonster(type)) return;

    const [x, y] = coord.split(',').map(Number);
    const waveNumber = extraData.currentWave || null;

    const monsterId = createMonsterId(type, levelId, waveNumber, x, y);
    
    objects[coord] = monsterId;

    setMonsterTypes(prev => ({ ...prev, [monsterId]: type }));
    setGlobalMonsterHealths(prev => ({
      ...prev,
      [monsterId]: MONSTER_DATA[type]?.hp ?? 100
    }));
  });

  return {
name,
    grid,
    objects,
    staticObjects,
    monsterSpawns,
    playerPos,
    objectTypes: OBJECT_DATA,
    background,
    rows,     // expose real dimensions
    cols,
    respawnQueue: [],
    ...extraData
  };
};

// ──────────────────────────────────────────────────────────────
// 6. Main useEffect – super clean now
// ──────────────────────────────────────────────────────────────
useEffect(() => {
  const storyLevel = generateTownLevel();
  const survivalLevel = generateSurvivalLevel();

  setLevels({
    [LEVEL_IDS.STORY]: storyLevel,
    [LEVEL_IDS.SURVIVAL]: survivalLevel
  });

  setRestrictedTilesByLevel({
    [LEVEL_IDS.STORY]: new Set(),
    [LEVEL_IDS.SURVIVAL]: new Set()
  });

  setCurrentLevel(LEVEL_IDS.STORY);
  setIsLoading(false);

}, []);

// **NEW: Camera state for CanvasGrid**
const [camera, setCamera] = useState({ x: 0, y: 0 });

  /* --------------------------------------------------------------
     9. Derived values
     -------------------------------------------------------------- */
  const currentLevelData = levels[currentLevel] || {};
  const restrictedTiles = restrictedTilesByLevel[currentLevel] || new Set();

  // **SYNC camera with playerPos**
useEffect(() => {
  if (currentLevelData?.playerPos) {
    setCamera({
      x: currentLevelData.playerPos.x,
      y: currentLevelData.playerPos.y,
    });
  }
}, [currentLevelData?.playerPos?.x, currentLevelData?.playerPos?.y]); // Re-run when player moves

// For survival mode timer
const getSurvivalTimeFormatted = useCallback(() => {
  if (currentLevel !== 'survival') return '00:00.00';

  const totalSeconds = Math.floor(elapsedTime / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  const centi = String(Math.floor((elapsedTime % 1000) / 10)).padStart(2, '0');
  return `${minutes}:${seconds}.${centi}`;
}, [currentLevel, elapsedTime]);

  /* --------------------------------------------------------------
     10. Return everything (including the NEW callback)
     -------------------------------------------------------------- */
  return {
    levels,
    currentLevel,
    currentLevelData,
    restrictedTiles,
    // We use 'currentLevelData.rows/cols' to let level decide amount of rows/cols (50x50 or 30x30)
rows: currentLevelData?.rows ?? ROWS,
  columns: currentLevelData?.cols ?? COLS,
    TILE_SIZE: TILE_SIZE,
    isLoading,
    globalPlayerHealth,
    globalInventory,
    isDead,
    setIsDead,
    globalMonsterHealths,
    monsterTypes,
    objectTypes,
    healPopup,
    onHealPopup,
    onHealPopupFinish,
    // lastDamageTime, NOTE THAT THIS IS COMMENTED OUT. It works at this level but blocks HealthRegen component for some reason
    setLastDamageTime,

    camera,

    monsterData: MONSTER_DATA, // For setting different healths on different monsters
    PORTAL_ENTRY_POINTS, // For artificially setting a spawn point for player, to only press Play button to start (without having to click tile and type 'Player' in edit mode)
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
    ),
    // Timer & Score for survival
// SURVIVAL-ONLY EXPORTS (safe to use anywhere — just render conditionally)
currentSurvivalWave: currentLevel === 'survival' ? (levels.survival?.currentWave ?? 1) : 1,
  survivalFinalScore: currentLevel === 'survival' ? finalScore : null,
  survivalHighScore: Number(localStorage.getItem('grokySurvivalHighscore') || 0),

  // THIS IS THE ONE THAT WORKS — no conditional functions!
  getSurvivalTimeFormatted,  // ← this is the real hero

  // Optional: raw elapsed time if you ever need it
  survivalElapsedTime: currentLevel === 'survival' ? elapsedTime : 0,
  };
};