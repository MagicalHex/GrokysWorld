import React, { useState } from 'react';
import EditWorld from './components/EditWorld';
import PlayMode from './components/PlayMode';
import './App.css';

function App() {
  const [rows, setRows] = useState(20); // Grid height
  const [columns, setColumns] = useState(24); // Grid width
  const [grid, setGrid] = useState(Array(rows).fill().map(() => Array(columns).fill('grass')));
  const [selectedTile, setSelectedTile] = useState(null);
  const [mode, setMode] = useState('free');
  const [playMode, setPlayMode] = useState(false);
  const [playerPos, setPlayerPos] = useState(null);
  const [objects, setObjects] = useState({});
  const [restrictedTiles, setRestrictedTiles] = useState(new Set());

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
    setGrid(newGrid);
  };

  if (playMode && playerPos) {
    return (
      <PlayMode 
        grid={grid} 
        objects={objects}
        playerPos={playerPos}
        onExit={() => setPlayMode(false)}
        tileSize={40}
        rows={rows} // Pass rows
        columns={columns} // Pass columns
        onPlayerMove={(newPos) => {
          if (restrictedTiles.has(`${newPos.x},${newPos.y}`)) {
            console.log(`Player cannot move to (${newPos.x}, ${newPos.y}): restricted tile`);
            return;
          }
          const oldKey = playerPos ? `${playerPos.x},${playerPos.y}` : null;
          const newKey = `${newPos.x},${newPos.y}`;
          setObjects(prev => {
            const newObjects = { ...prev };
            if (oldKey && newObjects[oldKey] === 'player') {
              delete newObjects[oldKey];
            }
            newObjects[newKey] = 'player';
            return newObjects;
          });
          setPlayerPos(newPos);
        }}
        onObjectsChange={setObjects}
        restrictedTiles={restrictedTiles}
      />
    );
  }

  return (
    <div className="App">
      <header>
        <h1>🚀 Groky Codex</h1>
        <div>
          <button onClick={() => setMode('rpg')}>RPG</button>
          <button onClick={() => setMode('sports')}>Sports</button>
          <button onClick={() => setMode('shooter')}>Shooter</button>
          <button onClick={() => setPlayMode(true)}>PLAY 🎮</button>
          <span>Mode: {mode}</span>
        </div>
      </header>

      <EditWorld
        grid={grid}
        objects={objects}
        playerPos={playerPos}
        onGridChange={handleGridChange}
        onObjectsChange={setObjects}
        onPlayerPosChange={setPlayerPos}
        tileSize={40}
        mode={mode}
        rows={rows} // Pass rows
        columns={columns} // Pass columns
        onPlayMode={() => setPlayMode(true)}
      />
    </div>
  );
}

export default App;