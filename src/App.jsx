// App.jsx - Updated to pass new props to PlayMode
import React, { useState, useEffect } from 'react';
import { useGameState } from './hooks/useGameState';
import EditWorld from './components/EditWorld';
import PlayMode from './components/PlayMode';
import LevelSelector from './components/LevelSelector';
import './App.css';
import { startGameLoop } from './utils/gameLoop';

function App() {
  const [mode, setMode] = useState('free');
  const [playMode, setPlayMode] = useState(false);

  // App.jsx
useEffect(() => {
  startGameLoop();
}, []);

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
    getOriginalSpawns,
    spawnMonster,
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
    monsterTypes,
    healPopup,
    onHealPopup,
    onHealPopupFinish,
    lastDamageTime,
    setLastDamageTime
  } = game;

  if (isLoading) {
    return (
      <div className="loading-screen">
        <h2>Loading Groky's World... 🚀</h2>
        <p>Fetching maps and spawning spiders...</p>
      </div>
    );
  }
  // -------- DEBUG AREA
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
        spawnMonster={spawnMonster}
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
        healPopup={healPopup}
        onHealPopup={onHealPopup}
        onHealPopupFinish={onHealPopupFinish}
        lastDamageTime={lastDamageTime}
        setLastDamageTime={setLastDamageTime}
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