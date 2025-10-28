// src/components/PlayMode.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { OBJECTS } from './Objects';
import PlayerMovement from './PlayerMovement';
import MonsterMovement from './MonsterMovement';
import CombatSystem from './CombatSystem';
import HealthBar from './HealthBar';
import InteractionSystem from './InteractionSystem';
import { CHOPPABLE_OBJECTS, TALKABLE_OBJECTS } from './InteractionConstants';
import PlayerInventory from './PlayerInventory';
import './PlayMode.css';

const PlayMode = ({
  grid,
  objects,
  playerPos,
  onExit,
  tileSize,
  rows,
  columns,
  onPlayerMoveAttempt,
  onObjectsChange,
  restrictedTiles,
  level,
  onLevelChange,
  onQueueRespawn,
  originalSpawns,
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
  pendingPickup,    
  clearPendingPickup,
  monsterTypes
}) => {
  /* --------------------------------------------------------------
     DEBUG AREA
     -------------------------------------------------------------- */
useEffect(() => {
  console.log('[PlayMode] monsterHealths updated:', level);
}, [monsterHealths]);
useEffect(() => {
    console.log('[PlayMode] globalMonsterHealths updated:', globalMonsterHealths);
  }, [globalMonsterHealths]);
  /* --------------------------------------------------------------
     UI-only animation state (pickup flash)
     -------------------------------------------------------------- */
  const [pickedItem, setPickedItem] = useState(null);
  const [pickingUpTile, setPickingUpTile] = useState(null);
  const interactionRef = useRef();
  const [interaction, setInteraction] = useState({
    type: null,
    active: false,
    key: null,
    timer: null,
    message: null,
    npc: null,
    choices: null
  });

/* --------------------------------------------------------------
     1. React to a pickup that the hook just queued
     -------------------------------------------------------------- */
  useEffect(() => {
    if (!pendingPickup) return;

    // Find the tile that contains the item
    const key = Object.keys(objects).find(k => objects[k] === pendingPickup);
    if (!key) return;

    setPickingUpTile(key);                 // start animation

    const timer = setTimeout(() => {
      // 1. Remove the item from the world
      onObjectsChange(prev => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });

      // 2. Add to inventory
      onInventoryChange(prev => ({
        ...prev,
        [pendingPickup]: (prev[pendingPickup] ?? 0) + 1
      }));

      // 3. Clean the flag
      clearPendingPickup();
      setPickingUpTile(null);
    }, 500); // matches CSS animation

    return () => clearTimeout(timer);
  }, [
    pendingPickup,
    objects,
    onObjectsChange,
    onInventoryChange,
    clearPendingPickup
  ]);

  /* --------------------------------------------------------------
     2. Dropped-item shine detection
     -------------------------------------------------------------- */
  const [droppedItems, setDroppedItems] = useState(new Set());
  useEffect(() => {
    const newDropped = new Set();
    Object.keys(objects).forEach(k => {
      if (objects[k] === 'woodobject' || objects[k] === 'rockobject') newDropped.add(k);
    });
    setDroppedItems(newDropped);
  }, [objects]);

  /* --------------------------------------------------------------
     3. Render
     -------------------------------------------------------------- */
  return (
    <div className="play-mode">
      {/* ---------- INPUT ---------- */}
      <PlayerMovement
        playerPos={playerPos}
        onPlayerMove={onPlayerMoveAttempt}   // <-- now the hook does the heavy lifting
        onExit={onExit}
        objects={objects}
        restrictedTiles={restrictedTiles}
        rows={rows}
        columns={columns}
        level={level}
        onLevelChange={onLevelChange}
        onStartInteraction={key => interactionRef.current?.handleStartInteraction(key)}
        onCancelInteraction={() => interactionRef.current?.cancelInteraction()}
        interactionActive={interaction.active}
        interactionType={interaction.type}
        CHOPPABLE_OBJECTS={CHOPPABLE_OBJECTS}
        TALKABLE_OBJECTS={TALKABLE_OBJECTS}
      />

      {/* ---------- AI / COMBAT ---------- */}
      <MonsterMovement
        objects={objects}
        playerPos={playerPos}
        onObjectsChange={onObjectsChange}
        restrictedTiles={restrictedTiles}
        rows={rows}
        columns={columns}
        monsterHealths={monsterHealths}
        onMonsterHealthChange={onMonsterHealthChange}
        globalMonsterHealths={globalMonsterHealths}
        monsterTypes={monsterTypes}
      />
      <CombatSystem
        playerPos={playerPos}
        playerHealth={globalPlayerHealth}
        onPlayerHealthChange={onPlayerHealthChange}
        objects={objects}
        monsterHealths={monsterHealths}
        onMonsterHealthChange={onMonsterHealthChange}
        onObjectsChange={onObjectsChange}
        onQueueRespawn={onQueueRespawn}
        originalSpawns={originalSpawns}
        isDead={isDead}
        setIsDead={setIsDead}
        globalMonsterHealths={globalMonsterHealths}
        monsterTypes={monsterTypes}
      />

      {/* ---------- INVENTORY ---------- */}
      <PlayerInventory
        interactionActive={interaction.active}
        inventory={globalInventory}
        onInventoryChange={onInventoryChange}
      />

      {/* ---------- DEATH SCREEN ---------- */}
      {isDead && (
        <div className="death-screen">
          <div className="death-message">
            <h1>You Died</h1>
            <p>Your adventure ends here...</p>
            <button onClick={respawnPlayer}>Respawn</button>
          </div>
        </div>
      )}

      {/* ---------- GRID ---------- */}
      <div
        className="play-grid"
        style={{ gridTemplateColumns: `repeat(${columns}, ${tileSize}px)` }}
      >
        {grid.map((row, y) =>
          row.map((terrain, x) => {
            const key = `${x},${y}`;
            const obj = objects[key];

            return (
              <div
                key={key}
                className={`tile ${terrain} ${pickingUpTile === key ? 'picking-up' : ''}`}
                style={{ width: tileSize, height: tileSize, position: 'relative' }}
              >
                {/* OBJECTS */}
            {obj && (
            <div className={`object ${monsterTypes[obj] || obj} ${droppedItems.has(key) ? 'dropped-item' : ''}`}>
              {OBJECTS[monsterTypes[obj] || obj]}
              {(monsterTypes[obj] === 'skeleton' || monsterTypes[obj] === 'spider') && (
                <HealthBar
                  key={`${key}-${globalMonsterHealths[obj] ?? 100}`}
                  health={globalMonsterHealths[obj] ?? 100}
                  color="#FF9800"
                />
              )}
            </div>
          )}
          {playerPos?.x === x && playerPos?.y === y && (
            <div className="player" style={{ fontSize: '38px' }}>
              🧙
              <HealthBar
                health={globalPlayerHealth}
                color={globalPlayerHealth > 50 ? '#4CAF50' : '#f44336'}
              />
            </div>
          )}
              </div>
            );
          })
        )}
      </div>

      {/* ---------- INTERACTION UI ---------- */}
      <InteractionSystem
        ref={interactionRef}
        playerPos={playerPos}
        objects={objects}
        onObjectsChange={onObjectsChange}
        rows={rows}
        columns={columns}
        inventory={globalInventory}
        onInventoryChange={onInventoryChange}
        interaction={interaction}
        setInteraction={setInteraction}
        tileSize={tileSize}
        onQueueRespawn={onQueueRespawn}
        originalSpawns={originalSpawns}
        level={level}
      />

      <button onClick={onExit}>Edit Mode</button>
    </div>
  );
};

export default PlayMode;