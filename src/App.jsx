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
  const [hasSeenIntro, setHasSeenIntro] = useState(false); // Show intro once

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
    TILE_SIZE,
    onPlayerPosChange,
    onObjectsChange,
    onLevelChange,
    onQueueRespawn,
    getOriginalSpawns,
    spawnMonster,
    currentLevel,
    setCurrentLevel,
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
    objectTypes,
    healPopup,
    onHealPopup,
    onHealPopupFinish,
    lastDamageTime,
    setLastDamageTime,
    PORTAL_ENTRY_POINTS,
    camera,
    // for survival scores
currentSurvivalWave,
  survivalFinalScore,
  survivalHighScore,
  getSurvivalTimeFormatted,  // ← renamed for clarity
  survivalElapsedTime
  } = game;

useEffect(() => {
    if (isLoading) return; // still loading → do nothing

    if (localStorage.getItem('autoStartSurvival') === 'true') {
      localStorage.removeItem('autoStartSurvival');
      setCurrentLevel('survival');
      setPlayMode(true);
      setHasSeenIntro(true);
    }
  }, [isLoading]); // ← this runs once when isLoading becomes false

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
        currentLevel={currentLevel}
        background={currentLevelData.background}
        onExit={() => setPlayMode(false)}
        tileSize={TILE_SIZE}
        rows={rows}
        columns={columns}
        onObjectsChange={onObjectsChange}
        restrictedTiles={restrictedTiles}
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
        objectTypes={objectTypes}
        healPopup={healPopup}
        onHealPopup={onHealPopup}
        onHealPopupFinish={onHealPopupFinish}
        lastDamageTime={lastDamageTime}
        setLastDamageTime={setLastDamageTime}
        camera={camera}
// for survival
currentSurvivalWave={currentSurvivalWave}
  survivalFinalScore={survivalFinalScore}
  survivalHighScore={survivalHighScore}
  getSurvivalTimeFormatted={getSurvivalTimeFormatted}  // ← correct name
  survivalElapsedTime={survivalElapsedTime}
      />
    );
  }

// ------------------------------------------------------------------ //
// 3. PRODUCTION-ONLY WELCOME OVERLAY
// ------------------------------------------------------------------ //
if (!isDev && !playMode && !hasSeenIntro) {
  return (
    <div className="welcome-overlay">
      <div className="welcome-modal">
        <h1>Welcome to Groky's World!</h1>
        <p>
          <kbd>↑↓←→</kbd> to move around. You will only use the key arrows for everything.<br/><br/>
          <strong>Interact</strong> with NPCs (talk), trees (chop), stones (mine) by walking into them<br/><br/>
          Find a <strong>crossbow</strong> or <strong>bow</strong> to attack from range<br/><br/>
          Talk to the <strong>mushroom in town</strong> for quests
        </p>
        <div className="mode-buttons">
          <button 
            className="mode-button story" 
            onClick={() => {
              setCurrentLevel('story');
              setPlayMode(true);
              setHasSeenIntro(true);
            }}
          >
            🎭 STORY MODE
          </button>
          <button 
            className="mode-button survival" 
            onClick={() => {
              setCurrentLevel('survival');
              setPlayMode(true);
              setHasSeenIntro(true);
            }}
          >
            ⚔️ SURVIVAL MODE
          </button>
        </div>
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
    <button 
      className="mode-button story" 
      onClick={() => {
        setCurrentLevel('story');
        setPlayMode(true);
      }}
    >
      🎭 STORY
    </button>
    <button 
      className="mode-button survival" 
      onClick={() => {
        setCurrentLevel('survival');
        setPlayMode(true);
      }}
    >
      ⚔️ SURVIVAL
    </button>
    <span>Mode: {mode} | Level: {currentLevel}</span>
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