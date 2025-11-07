// App.jsx
import React, { useState, useEffect } from 'react';
import { useGameState } from './hooks/useGameState';
import EditWorld from './components/EditWorld';
import PlayMode from './components/PlayMode';
import LevelSelector from './components/LevelSelector';
import Stats from './components/Stats';
import './App.css';
import { startGameLoop } from './utils/gameLoop';
import { v4 as uuidv4 } from 'uuid';

function App() {
  // ------------------------------------------------------------------ //
  // 1. DEV / PROD detection
  // ------------------------------------------------------------------ //
  const isDev = process.env.NODE_ENV === 'development';

  // ------------------------------------------------------------------ //
  // State
  // ------------------------------------------------------------------ //
  const [mode, setMode] = useState('free');
  const [playMode, setPlayMode] = useState(false);
  const [sessionId] = useState(uuidv4());

  // ------------------------------------------------------------------ //
  // Game loop (unchanged)
  // ------------------------------------------------------------------ //
  useEffect(() => {
    startGameLoop();
  }, []);

  // ------------------------------------------------------------------ //
  // 2. Log connection – **only in production**
  // ------------------------------------------------------------------ //
  useEffect(() => {
    if (playMode && !isDev) {
      const logConnection = async () => {
        try {
          await fetch('/api/connect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId,
              userId: 'player',
              ip: null,
              userAgent: navigator.userAgent,
            }),
          });
        } catch (err) {
          console.error('Failed to log connection', err);
        }
      };
      logConnection();
    }
  }, [playMode, sessionId, isDev]);

  // ------------------------------------------------------------------ //
  // Game state hook
  // ------------------------------------------------------------------ //
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
    setLastDamageTime,
    PORTAL_ENTRY_POINTS
  } = game;

// ------------------------------------------------------------------ //
// AUTO-SET PLAYER SPAWN POSITION after load
// ------------------------------------------------------------------ //
useEffect(() => {
  if (!isLoading && currentLevelData && !playMode) {
    const level = currentLevel || 1;
    const spawn = PORTAL_ENTRY_POINTS[level] || { x: 11, y: 8 };
    
    // Only set if no playerPos exists OR it's the default (0,0)
    if (
      !currentLevelData.playerPos || 
      (currentLevelData.playerPos.x === 0 && currentLevelData.playerPos.y === 0)
    ) {
      console.log(`[AUTO-SPAWN] Setting player to level ${level} spawn: (${spawn.x}, ${spawn.y})`);
      
      // Use the same logic as EditWorld's player placement
      const key = `${spawn.x},${spawn.y}`;
      const newObjects = { ...currentLevelData.objects };
      
      // Remove any existing player object
      Object.keys(newObjects).forEach(objKey => {
        if (newObjects[objKey] === 'player') {
          delete newObjects[objKey];
        }
      });
      
      // Set new player position
      newObjects[key] = 'player';
      onPlayerPosChange({ x: spawn.x, y: spawn.y });
      onObjectsChange(newObjects);
    }
  }
}, [isLoading, currentLevelData, currentLevel, playMode, onPlayerPosChange, onObjectsChange]);

  // ------------------------------------------------------------------ //
  // Loading screen
  // ------------------------------------------------------------------ //
  if (isLoading) {
    return (
      <div className="loading-screen">
        <h2>Loading Groky's World... 🚀</h2>
        <p>Fetching maps and spawning spiders...</p>
      </div>
    );
  }

  // ------------------------------------------------------------------ //
  // PlayMode (unchanged props)
  // ------------------------------------------------------------------ //
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
        globalMonsterHealths={globalMonsterHealths}
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

  // ------------------------------------------------------------------ //
  // 3. PRODUCTION-ONLY WELCOME OVERLAY
  // ------------------------------------------------------------------ //
  if (!isDev && !playMode) {
    return (
      <div className="welcome-overlay">
        <div className="welcome-modal">
          <h1>Welcome to Groky's World! 🌟</h1>
          <p>
            <kbd>↑↓←→</kbd> to move around<br/><br/>
            <strong>Interact</strong> with NPCs (talk), trees (chop), stones (mine) by walking into them<br/><br/>
            Find a <strong>crossbow</strong> or <strong>bow</strong> to attack from range<br/><br/>
            Talk to the <strong>mushroom in town</strong> for quests
          </p>
          <button className="play-button" onClick={() => setPlayMode(true)}>
            PLAY 🎮
          </button>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------ //
  // Normal editor UI (dev or after dismissing overlay)
  // ------------------------------------------------------------------ //
  return (
    <div className="App">
      <header>
        <div>
          <LevelSelector renderSelector={renderSelector} />
          <button onClick={() => setMode('rpg')}>RPG</button>
          <button onClick={() => setMode('sports')}>Sports</button>
          <button onClick={() => setMode('shooter')}>Shooter</button>
          {/* PLAY button is now inside the overlay in prod */}
          {isDev && (
            <button onClick={() => setPlayMode(true)}>PLAY 🎮</button>
          )}
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