import React, { useState } from 'react';
import EditWorld from './components/EditWorld';
import PlayMode from './components/PlayMode';
import { Levels } from './components/Levels';
import './App.css';

function App() {
  const [mode, setMode] = useState('free');
  const [playMode, setPlayMode] = useState(false);

  // Get levels data
  const levelsData = Levels();

  const {
    currentLevelData,
    handleGridChange,
    onObjectsChange,
    onPlayerPosChange,
    onLevelChange,
    restrictedTiles,
    rows,
    columns,
    renderSelector,
    onQueueRespawn,
    getOriginalSpawns
  } = levelsData;

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
        onPlayerMove={onPlayerPosChange}
        onObjectsChange={onObjectsChange}
        restrictedTiles={restrictedTiles}
        level={levelsData.currentLevel}
        onLevelChange={onLevelChange}
        onQueueRespawn={onQueueRespawn}
        originalSpawns={getOriginalSpawns()} // ← Call it when passing to PlayMode
      />
    );
  }

  return (
    <div className="App">
      <header>
        {/* <h1 className="grokysworld">🚀 Grokys World</h1> */}
        <div>
          {renderSelector()}
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
        onObjectsChange={onObjectsChange}
        onPlayerPosChange={onPlayerPosChange}
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