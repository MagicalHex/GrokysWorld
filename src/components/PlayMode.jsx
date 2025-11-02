// src/components/PlayMode.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { OBJECTS } from './Objects';
import PlayerMovement from './PlayerMovement';
import MonsterMovement from './MonsterMovement';
import CombatSystem from './CombatSystem';
import HealthRegenSystem from './HealthRegenSystem';
import HealthBar from './HealthBar'; // Old
import ActionBar from './ActionBar'; // new, holds both progress and health
import InteractionSystem from './InteractionSystem/InteractionSystem';
import { CHOPPABLE_OBJECTS, TALKABLE_OBJECTS, OPENABLE_OBJECTS } from './InteractionSystem/InteractionConstants';
import PlayerInventory from './PlayerInventory';
import './PlayMode.css';
import { PickupPopup } from './PickupPopup';

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
  spawnMonster,
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
  monsterTypes,
  healPopup,
  onHealPopup,
  onHealPopupFinish,
  lastDamageTime,
  setLastDamageTime
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
  // useEffect(() => {
  // console.log('[PlayMode] lastDamageTime prop:', lastDamageTime, typeof lastDamageTime);
  // }, [lastDamageTime]);

//   useEffect(() => {
//   console.trace('[PlayMode] rendered — why?');
// }, []);

// FAKE ADDING ITEMS (BUT IT DOESN'T RENDER ITEMS):
// useEffect(() => {
//     const starter = {
//       ...globalInventory,
//       'knights-armor': 1,          
//       'wood': 1,
//     };
//     onInventoryChange(starter);
//   }, []);

// States for healthbar:
const [currentAction, setCurrentAction] = useState('health');
const [choppingProgress, setChoppingProgress] = useState(0);
  /* --------------------------------------------------------------
     UI-only animation state (pickup flash)
     -------------------------------------------------------------- */
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

const [pickupPopups, setPickupPopups] = useState([]); // [{id, x, y, item}]
/* --------------------------------------------------------------
   1. React to a pickup that the hook just queued
   -------------------------------------------------------------- */
useEffect(() => {
  if (!pendingPickup) return;

  // Find the tile that contains the item
  const key = Object.keys(objects).find(k => objects[k] === pendingPickup);
  if (!key) {
    clearPendingPickup();
    return;
  }

  // ---- Parse coordinates -------------------------------------------------
  const [x, y] = key.split(',').map(Number);

  // ---- 1. Add floating popup ------------------------------------------------
  const popupId = `${Date.now()}-${key}`;
  setPickupPopups(prev => [...prev, { id: popupId, x, y, item: pendingPickup }]);

  // ---- 2. Remove the item from the world ---------------------------------
  onObjectsChange(prev => {
    const copy = { ...prev };
    delete copy[key];
    return copy;
  });

  // ---- 3. Add to inventory ------------------------------------------------
  onInventoryChange(prev => ({
    ...prev,
    [pendingPickup]: (prev[pendingPickup] ?? 0) + 1
  }));

  // ---- 4. Clean the flag --------------------------------------------------
  clearPendingPickup();

  // (optional) keep a tiny flash on the tile if you still want it
  // setPickingUpTile(key);
  // setTimeout(() => setPickingUpTile(null), 100);
}, [
  pendingPickup,
  objects,
  onObjectsChange,
  onInventoryChange,
  clearPendingPickup,
  // setPickingUpTile   // <-- comment out if you don’t need the flash
]);
const removePickupPopup = useCallback((id) => {
  setPickupPopups(prev => prev.filter(p => p.id !== id));
}, []);

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
        OPENABLE_OBJECTS={OPENABLE_OBJECTS}
        isDead={isDead}
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
        inventory={globalInventory}
        healPopup={healPopup}
        onHealPopupFinish={onHealPopupFinish}
        setLastDamageTime={setLastDamageTime}
      />
      <HealthRegenSystem
        playerHealth={globalPlayerHealth}
        onPlayerHealthChange={onPlayerHealthChange}
        isDead={isDead}
        onHealPopup={onHealPopup}
        playerPos={playerPos}
        lastDamageTime={lastDamageTime}
        setLastDamageTime={setLastDamageTime}
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
                className={`tile ${terrain}`}
                style={{ width: tileSize, height: tileSize, position: 'relative' }}
              >
                {/* OBJECTS */}
            {obj && (
            <div className={`object ${monsterTypes[obj] || obj} ${droppedItems.has(key) ? 'dropped-item' : ''}`}>
              {OBJECTS[monsterTypes[obj] || obj]}
              {(monsterTypes[obj] === 'skeleton' || monsterTypes[obj] === 'spider' || monsterTypes[obj] === 'littlespider' || monsterTypes[obj] === 'cavespider') && (
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
          <ActionBar
                type={currentAction} // 'health' | 'chop' | 'mine'
                value={currentAction === 'health' ? globalPlayerHealth : choppingProgress}
                color={globalPlayerHealth > 50 ? '#169b1fff' : '#f44336'}
              />
            </div>
          )}
              </div>
            );
          })
        )}
      </div>
      {/* ---------- PICKUP POPUPS (float above everything) ---------- */}
      {pickupPopups.map(p => (
        <PickupPopup
          key={p.id}
          x={p.x}
          y={p.y}
          item={p.item}
          onFinish={() => removePickupPopup(p.id)}
        />
      ))}

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
        spawnMonster={spawnMonster}
        level={level}
        
        currentAction={currentAction}
  setCurrentAction={setCurrentAction}
  choppingProgress={choppingProgress}
  setChoppingProgress={setChoppingProgress}
      />

      <button onClick={onExit}>Edit Mode</button>
    </div>
  );
};

export default PlayMode;