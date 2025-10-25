// src/components/Levels.jsx
import React, { useState, useEffect } from 'react';

// FALLBACK GRIDS (like before)
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
  
  // ✅ START WITH FALLBACK GRIDS (no null!)
const [levels, setLevels] = useState({
  1: { grid: createLevel1Grid(), objects: {} },
  2: { grid: createLevel2Grid(), objects: {} },
  3: { grid: createLevel3Grid(), objects: {} },
  4: { grid: createLevel4Grid(), objects: {} },
  5: { name: 'Dungeon', grid: createLevel5Grid(), objects: {} }, // ← darkstone
});
  
  const [currentLevel, setCurrentLevel] = useState(1);
  const [selectedTile] = useState(null);
  // const [restrictedTiles, setRestrictedTiles] = useState(new Set()); Old, clashes levels
  const [restrictedTilesByLevel, setRestrictedTilesByLevel] = useState({});

  // LOAD JSON & REPLACE (async, after mount)
useEffect(() => {
  loadMaps().then(loadedLevels => {
    if (loadedLevels) {
      // MERGE loaded maps with fallbacks (preserve -1!)
      setLevels(prev => ({
        ...prev,        // ← keep -1, 1, 2...
        ...loadedLevels // ← override 1-5 only
      }));

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
  const currentLevelData = levels[currentLevel];
  
  // UPDATE CURRENT LEVEL
  const updateLevel = (updates) => {
    setLevels(prev => ({
      ...prev,
      [currentLevel]: { ...prev[currentLevel], ...updates }
    }));
  };

  // PORTAL ENTRY POINTS
const PORTAL_ENTRY_POINTS = {
  1: { x: 1, y: 1 },
  2: { x: 1, y: 2 },
  3: { x: 3, y: 3 },
  4: { x: 4, y: 4 },
  5: { x: 1, y: 1 }, // Dungeon spawn
};

  // PROPER onLevelChange FUNCTION
const onLevelChange = (newLevel, customSpawn = null) => {
  const levelKey = String(newLevel);
  if (!levels[levelKey]) {
    console.error(`Level ${levelKey} not found!`);
    return;
  }

  const entryPos = customSpawn || PORTAL_ENTRY_POINTS[levelKey] || { x: 1, y: 1 };
  const levelName = levels[levelKey]?.name || `Level ${levelKey}`;

  console.log(`Going to ${levelName} at ${entryPos.x},${entryPos.y}`);

  setLevels(prev => ({
    ...prev,
    [levelKey]: {
      ...prev[levelKey],
      playerPos: entryPos
    }
  }));

  setCurrentLevel(Number(levelKey));
};

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

  return {
    currentLevelData,
    currentLevel,
    setCurrentLevel,
    // restrictedTiles,
    // Pass current level's restricted tiles
  get restrictedTiles() {
    return restrictedTilesByLevel[currentLevel] || new Set();
  },
    handleGridChange,
    onObjectsChange: (newObjects) => updateLevel({ objects: newObjects }),
    onPlayerPosChange: (newPos) => updateLevel({ playerPos: newPos }),
    onLevelChange,
    rows,
    columns,
    renderSelector: () => (
      <div>
        <label>Level: </label>
        <select 
          value={currentLevel} 
          onChange={(e) => onLevelChange(Number(e.target.value))}
        >
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