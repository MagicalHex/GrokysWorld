// src/components/Levels.jsx
import React, { useState, useEffect } from 'react';

// FALLBACK GRIDS (like before)
const createLevel1Grid = () => Array(16).fill().map(() => Array(24).fill('grass'));
const createLevel2Grid = () => Array(16).fill().map(() => Array(24).fill('sand'));
const createLevel3Grid = () => createLevel2Grid();
const createLevel4Grid = () => createLevel2Grid();
const createLevel5Grid = () => createLevel2Grid();

// LOAD JSON MAPS ON STARTUP
const loadMaps = async () => {
  try {
    const maps = await Promise.all([
      fetch('/maps/town.json').then(r => r.json()),
      fetch('/maps/wilderness.json').then(r => r.json()),
      fetch('/maps/desert.json').then(r => r.json()),
      fetch('/maps/beach.json').then(r => r.json()),
      fetch('/maps/beach.json').then(r => r.json()), // Level 5 = Beach
    ]);

    return {
      1: { name: maps[0].name, grid: maps[0].grid, objects: maps[0].objects || {} },
      2: { name: maps[1].name, grid: maps[1].grid, objects: maps[1].objects || {} },
      3: { name: maps[2].name, grid: maps[2].grid, objects: maps[2].objects || {} },
      4: { name: maps[3].name, grid: maps[3].grid, objects: maps[3].objects || {} },
      5: { name: maps[4].name, grid: maps[4].grid, objects: maps[4].objects || {} },
    };
  } catch (error) {
    console.warn('❌ JSON failed, using fallback grids');
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
    5: { grid: createLevel5Grid(), objects: {} },
  });
  
  const [currentLevel, setCurrentLevel] = useState(1);
  const [selectedTile] = useState(null);
  // const [restrictedTiles, setRestrictedTiles] = useState(new Set()); Old, clashes levels
  const [restrictedTilesByLevel, setRestrictedTilesByLevel] = useState({});

  // LOAD JSON & REPLACE (async, after mount)
useEffect(() => {
  loadMaps().then(loadedLevels => {
    if (loadedLevels) {
      setLevels(loadedLevels);

      // Compute restrictedTiles for ALL levels
      const restrictedByLevel = {};
      Object.keys(loadedLevels).forEach(levelId => {
        const grid = loadedLevels[levelId].grid;
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
      const initialGrid = loadedLevels[1].grid;
      handleGridChange(initialGrid, 1);

      console.log('Loaded maps + PER-LEVEL restrictedTiles!');
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
    2: { x: 2, y: 2 },
    3: { x: 3, y: 3 },
    4: { x: 4, y: 4 },
    5: { x: 5, y: 5 },
  };

  // PROPER onLevelChange FUNCTION
  const onLevelChange = (newLevel) => {
    const entryPos = PORTAL_ENTRY_POINTS[newLevel];
    const levelName = levels[newLevel]?.name || `Level ${newLevel}`;
    console.log(`🌀 PORTAL! Going to ${levelName} at ${entryPos.x},${entryPos.y}`);
    
    setLevels(prev => ({
      ...prev,
      [newLevel]: {
        ...prev[newLevel],
        playerPos: entryPos
      }
    }));
    
    setCurrentLevel(newLevel);
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

  // SAME EXACT RETURN STRUCTURE!
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