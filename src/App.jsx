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
  } = game;

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
          <h1>Welcome to Groky's World!</h1>
          <p>
            Use <kbd>WASD</kbd> or <kbd>↑←↓→</kbd> to move.<br />
            Pick up items, fight monsters, and explore the levels.
          </p>
          <button className="play-button" onClick={() => setPlayMode(true)}>
            PLAY 🎮
          </button>
        </div>

        {/* Inline CSS – you can move this to App.css if you prefer */}
        <style jsx>{`
          .welcome-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.75);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            font-family: system-ui, sans-serif;
          }
          .welcome-modal {
            background: #fff;
            padding: 2rem 3rem;
            border-radius: 12px;
            text-align: center;
            max-width: 90%;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          }
          .welcome-modal h1 {
            margin: 0 0 1rem;
            font-size: 2rem;
          }
          .welcome-modal p {
            margin-bottom: 1.5rem;
            line-height: 1.5;
          }
          .play-button {
            background: #28a745;
            color: #fff;
            border: none;
            padding: 0.75rem 2rem;
            font-size: 1.2rem;
            border-radius: 8px;
            cursor: pointer;
            transition: background 0.2s;
          }
          .play-button:hover {
            background: #218838;
          }
          kbd {
            background: #eee;
            padding: 0.2em 0.4em;
            border-radius: 4px;
            font-family: monospace;
          }
        `}</style>
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