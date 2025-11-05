// App.jsx - Updated to pass new props to PlayMode
import React, { useState, useEffect } from 'react';
import { useGameState } from './hooks/useGameState';
import EditWorld from './components/EditWorld';
import PlayMode from './components/PlayMode';
import LevelSelector from './components/LevelSelector';
import './App.css';
import { startGameLoop } from './utils/gameLoop';

import { v4 as uuidv4 } from 'uuid'; // statistics
// Add import
import Stats from './components/Stats';

function App() {
  const [mode, setMode] = useState('free');
  const [playMode, setPlayMode] = useState(false);
  const [sessionId] = useState(uuidv4()); // statistics

  // Start game loop (monster movement, combatstyle)
useEffect(() => {
  startGameLoop();
}, []);

// Add this useEffect to log connection when PLAY is clicked
useEffect(() => {
  if (playMode) {
    const logConnection = async () => {
      try {
        await fetch('/api/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            userId: 'player', // or get from auth later
            ip: null,
            userAgent: navigator.userAgent
          })
        });
      } catch (err) {
        console.error('Failed to log connection', err);
      }
    };
    logConnection();
  }
}, [playMode, sessionId]);

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
    monsterData,
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
        levelName={currentLevelData.name || `Level ${currentLevel}`}
        playerPos={currentLevelData.playerPos}
        onExit={() => setPlayMode(false)}
        tileSize={40}
        rows={rows}
        columns={columns}
        onObjectsChange={onObjectsChange}
        restrictedTiles={restrictedTiles}
        currentLevel={currentLevel}
        onLevelChange={onLevelChange}
        onQueueRespawn={onQueueRespawn}
        originalSpawns={getOriginalSpawns()}
        spawnMonster={spawnMonster}
        globalPlayerHealth={globalPlayerHealth}
        onPlayerHealthChange={onPlayerHealthChange}
        monsterData={monsterData}
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


      {window.location.pathname === '/stats' && <Stats />}

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