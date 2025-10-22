import React, { useState } from 'react';
import EditWorld from './components/EditWorld';
import PlayMode from './components/PlayMode';
import './App.css';

// LEVEL CREATOR FUNCTIONS
const createLevel1Grid = () => 
  Array(16).fill().map(() => Array(24).fill('grass'));

const createLevel2Grid = () => {
  const grid = Array(16).fill().map(() => Array(24).fill('sand'));
  return grid;
};

const createLevel3Grid = () => createLevel2Grid();
const createLevel4Grid = () => createLevel2Grid();
const createLevel5Grid = () => createLevel2Grid();

function App() {
  const [rows, setRows] = useState(16);
  const [columns, setColumns] = useState(24);
  
  // LEVELS STATE - REPLACES OLD grid/objects/playerPos
  const [levels, setLevels] = useState({
    1: { 
      grid: createLevel1Grid(), 
      objects: {}, 
    },
    2: { 
      grid: createLevel2Grid(), 
      objects: {}, 
    },
    3: { 
      grid: createLevel3Grid(), 
      objects: {}, 
    },
    4: { 
      grid: createLevel4Grid(), 
      objects: {}, 
    },
    5: { 
      grid: createLevel5Grid(), 
      objects: {}, 
    },
  });

  const [currentLevel, setCurrentLevel] = useState(1);
  const [mode, setMode] = useState('free');
  const [playMode, setPlayMode] = useState(false);
  const [selectedTile, setSelectedTile] = useState(null);
  const [restrictedTiles, setRestrictedTiles] = useState(new Set());

  // GET CURRENT LEVEL DATA
  const currentLevelData = levels[currentLevel];
  
  // UPDATE CURRENT LEVEL
  const updateLevel = (updates) => {
    setLevels(prev => ({
      ...prev,
      [currentLevel]: { ...prev[currentLevel], ...updates }
    }));
  };

  // PORTAL ENTRY POINTS - Customize these!
  const PORTAL_ENTRY_POINTS = {
    1: { x: 1, y: 1 },
    2: { x: 2, y: 2 },
    3: { x: 3, y: 3 },
    4: { x: 4, y: 4 },
    5: { x: 5, y: 5 },
  };

  // FIXED: PROPER onLevelChange FUNCTION
const onLevelChange = (newLevel) => {
  const entryPos = PORTAL_ENTRY_POINTS[newLevel];
  console.log(`🌀 PORTAL! Going to Level ${newLevel} at ${entryPos.x},${entryPos.y}`);
  
  // 1. SET PLAYER POSITION in NEW LEVEL
  setLevels(prev => ({
    ...prev,
    [newLevel]: {
      ...prev[newLevel],
      playerPos: entryPos  // Player spawns at entry point
    }
  }));
  
  // 2. INSTANTLY SWITCH VIEW TO NEW LEVEL
  setCurrentLevel(newLevel);  // ← THIS MAKES VIEW FOLLOW!
};

  // OLD handleGridChange - NOW WORKS WITH LEVELS
  const handleGridChange = (newGrid) => {
    const newRestricted = new Set();
    newGrid.forEach((row, y) => {
      row.forEach((terrain, x) => {
        if (['stone', 'darkstone', 'stonepillar'].includes(terrain)) {
          newRestricted.add(`${x},${y}`);
        }
      });
    });
    setRestrictedTiles(newRestricted);
    updateLevel({ grid: newGrid });
  };

  // PLAY MODE - NOW USES CURRENT LEVEL DATA
  if (playMode && currentLevelData.playerPos) {
    return (
      <PlayMode 
        grid={currentLevelData.grid} 
        objects={currentLevelData.objects}
        playerPos={currentLevelData.playerPos}
        onExit={() => setPlayMode(false)}
        tileSize={40}
        rows={rows}
        columns={columns}

onPlayerMove={(newPos) => {
  if (restrictedTiles.has(`${newPos.x},${newPos.y}`)) {
    console.log(`Player cannot move to (${newPos.x}, ${newPos.y}): restricted tile`);
    return;
  }
  
  const oldKey = currentLevelData.playerPos ? `${currentLevelData.playerPos.x},${currentLevelData.playerPos.y}` : null;
  const newKey = `${newPos.x},${newPos.y}`;
  
  // FIXED: DON'T REMOVE PORTALS!
  const newObjects = { ...currentLevelData.objects };
  if (oldKey && newObjects[oldKey] === 'player') {
    delete newObjects[oldKey];  // Remove OLD player position
  }
  // DON'T set newObjects[newKey] = 'player' for PORTALS!
  if (!newObjects[newKey]?.startsWith('portal-to-')) {
    newObjects[newKey] = 'player';
  }
  
  updateLevel({
    objects: newObjects,
    playerPos: newPos
  });
}}
        onObjectsChange={(newObjects) => updateLevel({ objects: newObjects })}
        restrictedTiles={restrictedTiles}
        level={currentLevel}
        onLevelChange={onLevelChange}  // ← FIXED! Now a proper function
      />
    );
  }

  return (
    <div className="App">
      <header>
        <h1 className="grokysworld">🚀 Grokys World</h1>
        <div>
          <label>Level: </label>
          <select 
            value={currentLevel} 
            onChange={(e) => onLevelChange(Number(e.target.value))}  // ← Use onLevelChange!
          >
            {Array.from({ length: 5 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                Level {i + 1}
              </option>
            ))}
          </select>
          <button onClick={() => setMode('rpg')}>RPG</button>
          <button onClick={() => setMode('sports')}>Sports</button>
          <button onClick={() => setMode('shooter')}>Shooter</button>
          <button onClick={() => setPlayMode(true)}>PLAY 🎮</button>
          <span>Mode: {mode}</span>
        </div>
      </header>

      <EditWorld
        grid={currentLevelData.grid}
        objects={currentLevelData.objects}
        playerPos={currentLevelData.playerPos}
        onGridChange={handleGridChange}
        onObjectsChange={(newObjects) => updateLevel({ objects: newObjects })}
        onPlayerPosChange={(newPos) => updateLevel({ playerPos: newPos })}
        tileSize={40}
        mode={mode}
        rows={rows}
        columns={columns}
        onPlayMode={() => setPlayMode(true)}
      />
    </div>
  );
}

export default App;