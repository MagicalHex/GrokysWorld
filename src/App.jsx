// App.jsx - Updated to pass new props to PlayMode
import React, { useState } from 'react';
import { useGameState } from './hooks/useGameState';
import EditWorld from './components/EditWorld';
import PlayMode from './components/PlayMode';
import LevelSelector from './components/LevelSelector';
import './App.css';

function App() {
  const [mode, setMode] = useState('free');
  const [playMode, setPlayMode] = useState(false);

  const game = useGameState();
  const {
    isLoading,
    currentLevelData,
    renderSelector,
    rows,
    columns,
    restrictedTiles,
    onPlayerPosChange,
    onObjectsChange,
    onLevelChange,
    onQueueRespawn,
    scheduleRespawn,
    getOriginalSpawns,
    currentLevel,
    globalPlayerHealth,
    onPlayerHealthChange, 
    monsterHealths,
    globalMonsterHealths,
    onMonsterHealthChange,
    globalInventory,
    onInventoryChange, 
    isDead,
    setIsDead,
    respawnPlayer,
    monsterTypes
  } = game;

  if (isLoading) {
    return (
      <div className="loading-screen">
        <h2>Loading Groky's World... 🚀</h2>
        <p>Fetching maps and spawning spiders...</p>
      </div>
    );
  }
console.log('[App] globalMonsterHealths passed to PlayMode:', globalMonsterHealths);
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
        onObjectsChange={onObjectsChange}
        restrictedTiles={restrictedTiles}
        level={currentLevel}
        onLevelChange={onLevelChange}
        onQueueRespawn={onQueueRespawn}
        originalSpawns={getOriginalSpawns()}
        globalPlayerHealth={globalPlayerHealth}
        onPlayerHealthChange={onPlayerHealthChange}
        monsterHealths={monsterHealths}
        globalMonsterHealths={globalMonsterHealths} // Updated
        onMonsterHealthChange={onMonsterHealthChange}
        globalInventory={globalInventory}
        onInventoryChange={onInventoryChange}
        isDead={isDead}
        setIsDead={game.setIsDead}
        respawnPlayer={respawnPlayer}
        onPlayerMoveAttempt={game.onPlayerMoveAttempt}
  pendingPickup={game.pendingPickup}
  clearPendingPickup={game.clearPendingPickup}
  monsterTypes={monsterTypes}
      />
    );
  }

  return (
    <div className="App">
      <header>
        <div>
          <LevelSelector renderSelector={renderSelector} />
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
        onGridChange={game.handleGridChange}
        onObjectsChange={game.onObjectsChange}
        onPlayerPosChange={game.onPlayerPosChange}
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