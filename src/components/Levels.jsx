// src/components/Levels.jsx
import React, { useState, useEffect, useRef } from 'react';

// FALLBACK GRIDS
const createLevel1Grid = () => Array(16).fill().map(() => Array(24).fill('grass'));
const createLevel2Grid = () => Array(16).fill().map(() => Array(24).fill('sand'));
const createLevel3Grid = () => createLevel2Grid();
const createLevel4Grid = () => createLevel2Grid();
// Dungeon
const createLevel5Grid = () => Array(16).fill().map(() => Array(24).fill('darkstone'));

// LOAD JSON MAPS ON STARTUP
const loadMaps = async () => {
  try {
    const maps = await Promise.all([
      fetch('/maps/town.json').then(r => r.json()),        // 1
      fetch('/maps/wilderness.json').then(r => r.json()),  // 2
      fetch('/maps/desert.json').then(r => r.json()),      // 3
      fetch('/maps/beach.json').then(r => r.json()),       // 4
      fetch('/maps/dungeon.json').then(r => r.json()),     // 5 ← DUNGEON!
    ]);

    return {
      1: { name: maps[0].name, grid: maps[0].grid, objects: maps[0].objects || {} },
      2: { name: maps[1].name, grid: maps[1].grid, objects: maps[1].objects || {} },
      3: { name: maps[2].name, grid: maps[2].grid, objects: maps[2].objects || {} },
      4: { name: maps[3].name, grid: maps[3].grid, objects: maps[3].objects || {} },
      5: { name: maps[4].name || 'Dungeon', grid: maps[4].grid, objects: maps[4].objects || {} },
    };
  } catch (error) {
    console.warn('JSON failed, using fallback');
    return null;
  }
};

export const Levels = () => {
  const [rows] = useState(16);
  const [columns] = useState(24);
  
// LEVEL DATA WITH ORIGINAL SPAWNS + RESPAWN QUEUE
  const [levels, setLevels] = useState({
    1: { grid: createLevel1Grid(), objects: {}, originalSpawns: {}, respawnQueue: [] },
    2: { grid: createLevel2Grid(), objects: {}, originalSpawns: {}, respawnQueue: [] },
    3: { grid: createLevel3Grid(), objects: {}, originalSpawns: {}, respawnQueue: [] },
    4: { grid: createLevel4Grid(), objects: {}, originalSpawns: {}, respawnQueue: [] },
    5: { grid: createLevel5Grid(), objects: {}, originalSpawns: {}, respawnQueue: [] },
  });
  
  const [currentLevel, setCurrentLevel] = useState(1);
  const [selectedTile] = useState(null);
  // const [restrictedTiles, setRestrictedTiles] = useState(new Set()); Old, clashes levels
  const [restrictedTilesByLevel, setRestrictedTilesByLevel] = useState({});

  // LOAD JSON & REPLACE (async, after mount)
useEffect(() => {
    loadMaps().then(loadedLevels => {
      if (loadedLevels) {
        setLevels(prev => {
          const updated = { ...prev };
          Object.entries(loadedLevels).forEach(([id, data]) => {
            if (updated[id]) {
              const originalSpawns = {};
              Object.entries(data.objects || {}).forEach(([key, type]) => {
                if (type === 'spider' || type === 'treeobject') {
                  originalSpawns[key] = type;
                }
              });

              updated[id] = {
                ...updated[id],
                ...data,
                originalSpawns,
                respawnQueue: updated[id].respawnQueue || []
              };
            }
          });
          return updated;
        });

      // Compute restrictedTiles for ALL levels (including -1)
      const restrictedByLevel = {};
      Object.keys(prev).forEach(levelId => {
        const levelData = prev[levelId];
        const grid = levelData.grid;
        const restricted = new Set();
        grid.forEach((row, y) => {
          row.forEach((terrain, x) => {
            if (['stone', 'darkstone', 'stonepillar', 'grassnowalk', 
                 'timberwallup', 'timberwallside', 'timberwallcornerright', 'timberwallcornerleft'].includes(terrain)) {
              restricted.add(`${x},${y}`);
            }
          });
        });
        restrictedByLevel[levelId] = restricted;
      });

      setRestrictedTilesByLevel(restrictedByLevel);

      // Init current level
      const initialGrid = prev[1].grid; // use fallback or loaded
      handleGridChange(initialGrid, 1);

      console.log('Loaded maps + preserved Level -1 + restrictedTiles!');
    }
  });
}, []);


  // GET CURRENT LEVEL DATA (NEVER NULL!)
  // const currentLevelData = levels[currentLevel];
  
  // UPDATE CURRENT LEVEL
  // const updateLevel = (updates) => {
  //   setLevels(prev => ({
  //     ...prev,
  //     [currentLevel]: { ...prev[currentLevel], ...updates }
  //   }));
  // };

  // PORTAL ENTRY POINTS
const PORTAL_ENTRY_POINTS = {
  1: { x: 1, y: 1 },
  2: { x: 1, y: 2 },
  3: { x: 3, y: 3 },
  4: { x: 4, y: 4 },
  5: { x: 1, y: 1 }, // Dungeon spawn
};

  // PROPER onLevelChange FUNCTION
// const onLevelChange = (newLevel, customSpawn = null) => {
//   const levelKey = String(newLevel);
//   if (!levels[levelKey]) {
//     console.error(`Level ${levelKey} not found!`);
//     return;
//   }

//   const entryPos = customSpawn || PORTAL_ENTRY_POINTS[levelKey] || { x: 1, y: 1 };
//   const levelName = levels[levelKey]?.name || `Level ${levelKey}`;

//   console.log(`Going to ${levelName} at ${entryPos.x},${entryPos.y}`);

//   setLevels(prev => ({
//     ...prev,
//     [levelKey]: {
//       ...prev[levelKey],
//       playerPos: entryPos
//     }
//   }));

//   setCurrentLevel(Number(levelKey));
// };

  // handleGridChange FOR BLOCKING TILES AND UPDATING PER LEVEL
const handleGridChange = (newGrid, levelId = currentLevel) => {
  const newRestricted = new Set();
  newGrid.forEach((row, y) => {
    row.forEach((terrain, x) => {
      if (['stone', 'darkstone', 'stonepillar', 'grassnowalk', 
           'timberwallup', 'timberwallside', 'timberwallcornerright', 'timberwallcornerleft'].includes(terrain)) {
        newRestricted.add(`${x},${y}`);
      }
    });
  });

  // Save per level
  setRestrictedTilesByLevel(prev => ({
    ...prev,
    [levelId]: newRestricted
  }));

  updateLevel({ grid: newGrid }, levelId);
};

// --- GLOBAL RESPAWN TICKER (runs forever) ---
  const respawnIntervalRef = useRef(null);

  useEffect(() => {
    respawnIntervalRef.current = setInterval(() => {
      const now = Date.now();
      setLevels(prev => {
        const updated = { ...prev };
        let changed = false;

        Object.keys(updated).forEach(levelId => {
          const level = updated[levelId];
          if (!level.respawnQueue || level.respawnQueue.length === 0) return;

          const newQueue = [];
          level.respawnQueue.forEach(item => {
            if (now >= item.timestamp) {
              // TIME TO RESPAWN
              const { key, type } = item;
              const currentObj = level.objects[key];

              // Only respawn if tile is empty or has stump/coin
              const canRespawn =
                !currentObj ||
                currentObj === 'timberwoodchoppedobject' ||
                currentObj === 'coin';

              if (canRespawn) {
                level.objects = { ...level.objects, [key]: type };
                if (type === 'spider') {
                  // Optional: reset health if you track per-level
                }
                console.log(`Respawned ${type} at ${key} (Level ${levelId})`);
                changed = true;
              } else {
                // Still blocked → re-queue in 5s
                newQueue.push({ ...item, timestamp: now + 5000 });
              }
            } else {
              newQueue.push(item);
            }
          });

          level.respawnQueue = newQueue;
        });

        return changed ? updated : prev;
      });
    }, 1000);

    return () => clearInterval(respawnIntervalRef.current);
  }, []);

  // --- QUEUE RESPAWN FROM ANY LEVEL ---
  const onQueueRespawn = (levelId, { key, type }) => {
    const timestamp = Date.now() + 3000; // 30s
    setLevels(prev => ({
      ...prev,
      [levelId]: {
        ...prev[levelId],
        respawnQueue: [...(prev[levelId].respawnQueue || []), { key, type, timestamp }]
      }
    }));
    console.log(`Queued ${type} respawn at ${key} in 30s (Level ${levelId})`);
  };

  // --- CURRENT LEVEL DATA ---
  const currentLevelData = levels[currentLevel] || levels[1];

  const updateLevel = (updates, levelId = currentLevel) => {
    setLevels(prev => ({
      ...prev,
      [levelId]: { ...prev[levelId], ...updates }
    }));
  };

  const onLevelChange = (newLevel, customSpawn = null) => {
    const levelKey = String(newLevel);
    if (!levels[levelKey]) return;

    const entryPos = customSpawn || PORTAL_ENTRY_POINTS[levelKey] || { x: 1, y: 1 };
    updateLevel({ playerPos: entryPos }, levelKey);
    setCurrentLevel(Number(levelKey));
  };

return {
    currentLevelData,
    currentLevel,
    setCurrentLevel,
    get restrictedTiles() {
      return restrictedTilesByLevel[currentLevel] || new Set();
    },
    handleGridChange,
    onObjectsChange: (newObjects, levelId = currentLevel) => 
      updateLevel({ objects: newObjects }, levelId),
    onPlayerPosChange: (newPos, levelId = currentLevel) => 
      updateLevel({ playerPos: newPos }, levelId),
    onLevelChange,
    onQueueRespawn: (payload) => onQueueRespawn(currentLevel, payload),
    getOriginalSpawns: (levelId = currentLevel) => levels[levelId]?.originalSpawns || {},
    rows,
    columns,
    renderSelector: () => (
      <div>
        <label>Level: </label>
        <select value={currentLevel} onChange={e => onLevelChange(Number(e.target.value))}>
          {Object.entries(levels).map(([id, data]) => (
            <option key={id} value={id}>
              {data.name ? `${data.name} (Level ${id})` : `Level ${id}`}
            </option>
          ))}
        </select>
      </div>
    )
  };
};