// src/components/PlayMode.jsx
import React, { useState, useEffect, useCallback, useRef, useMemo, useReducer } from 'react';
import { OBJECTS } from './Objects';
import PlayerMovement from './PlayerMovement';
import MonsterMovement from './MonsterMovement';
import CombatSystem from './CombatSystem';
import HealthRegenSystem from './HealthRegenSystem';
import HealthBar from './HealthBar'; // Used by Monsters
import ActionBar from './ActionBar'; // Used by Players, holds both progress and health
import CooldownBar from './CooldownBar';
import InteractionSystem from './InteractionSystem/InteractionSystem';
import { CHOPPABLE_OBJECTS, TALKABLE_OBJECTS, OPENABLE_OBJECTS, getQuestMarker } from './InteractionSystem/InteractionConstants';
import PlayerInventory from './PlayerInventory';
import './PlayMode.css';
import { PickupPopup } from './PickupPopup'; // Pickup popup  on player (when moving on item tile)
import { DamagePopup } from './DamagePopup'; // Damage popups on monster or player
import { useEquipment } from './hooks/useEquipment'; // For using equipment
import { isMonster, getMonsterData } from '../utils/monsterRegistry'; // To render Monster health bars

import PlayerLayer from './PlayerLayer'; // Player layer
import CanvasGrid from './CanvasGrid'; // Player layer
import MonsterLayer from './MonsterLayer'; // Player layer
import ZIndexManager from './ZIndexManager'; // Z index manager
import FlatEntityLayer from './FlatEntityLayer'; // Z index manager

import { useIsoProjection } from '../hooks/useIsoProjection';

// Add these imports
import nipplejs from 'nipplejs';
import { isMobile } from '../utils/isMobile';
import MobileControls from './MobileControls';

// For cool downs (CombatSystem and CooldownBar)
const COOLDOWNS = { MELEE: 1500, RANGED: 3500, MONSTER: 3000 };
// Add this near your other constants (e.g. in Objects.js or a new file)
const NPC_NAMES = {
  farmer001: 'Sam',
  mechanic001: 'Gomli',
  oldandwise: 'Mandal',
  // Add more later...
};

const PlayMode = ({
  grid,
  objects,
  levelName,
  playerPos,
  onExit,
  tileSize,
  rows,
  columns,
  onPlayerMoveAttempt,
  onObjectsChange,
  restrictedTiles,
  currentLevel, // e.g. "3"
  onLevelChange,
  onQueueRespawn,
  originalSpawns,
  spawnMonster,
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
  pendingPickup,    
  clearPendingPickup,
  monsterTypes,
  objectTypes,
  healPopup,
  onHealPopup,
  onHealPopupFinish,
  lastDamageTime,
  setLastDamageTime,
  camera
}) => {
  /* --------------------------------------------------------------
     DEBUG AREA
     -------------------------------------------------------------- */
     // TEMP - Add to PlayMode
const renderCount = useRef(0);
renderCount.current++;
console.log(`[RENDERS] ${renderCount.current}`); // Put at top of component

// useEffect(() => {
//   console.log('[PlayMode] current level updated:', currentLevel);
// }, [currentLevel]);
// useEffect(() => {
//     console.log('[PlayMode] globalMonsterHealths updated:', globalMonsterHealths);
//   }, [globalMonsterHealths]);

  // ── Display Name ─────────────────────────────────────────────────────
  // e.g. "Town Mines level 2"
  const displayName = levelName || 'Unknown Level';
  // ── Health & Progressbar ─────────────────────────────────────────────────────
  // Switch been health and progressbar depending on what Player is doing
  const [currentAction, setCurrentAction] = useState('health');
  const [choppingProgress, setChoppingProgress] = useState(0);
  
  // ── Combat Popups ─────────────────────────────────────────────────────
  // Set popup to display e.g. damagePopup (holds healing popup as well)
  const [popups, setPopups] = useState([]);

  // Create universal addPopup
const addPopup = useCallback((popup) => {
  const id = `popup_${Date.now()}_${Math.random()}`;
  setPopups(prev => [...prev, { ...popup, id, isCrit: popup.isCrit ?? false }]);
}, []);
  // ── Quests ─────────────────────────────────────────────────────
  // Tell .player class which direction class to render 
  const [activeQuests, setActiveQuests] = useState({});
  // ── Movement ─────────────────────────────────────────────────────
  // Tell .player class which direction class to render 
  // const [moveDirection, setMoveDirection] = useState(null);
  const moveDirectionRef = useRef(null);
  const moveTriggerRef = useRef(0); // count amounts of triggers (to trigger direction image)
const [, forcePlayerUpdate] = useReducer(x => x + 1, 0); // Only for PlayerLayer
// Update in PlayerMovement and joystick:
const setMoveDirection = (dir) => {
  moveDirectionRef.current = dir;
  moveTriggerRef.current += 1; // Increment on every move!
  forcePlayerUpdate(); // Re-renders PlayerLayer
};
  // console.log('[PlayMode] current moveDirection →', moveDirection);
    // ── Inventory ─────────────────────────────────────────────────────
  const [showInventory, setShowInventory] = useState(false);
  const openInventory = useCallback(() => {
    setShowInventory(true);
  }, []);

  // -- Equipment ------------------------
  // ---- ONE place that knows what is equipped ----
  const { equipment, inventory } = useEquipment(globalInventory);
  // Equip useffect
  // useEffect(() => {
  //   console.log('EQUIPPED:', equipment);
  // }, [equipment]);
  // ── Battle System ─────────────────────────────────────────────────────
  // Stand still in same area as monsters to start loading range combat
const [cooldownSignal, setCooldownSignal] = useState({ active: false, type: null });

// useEffect(() => {
//   console.log('[STATE] cooldownSignal changed:', cooldownSignal);
// }, [cooldownSignal]);

// === TIMER: Auto-reset. Helper for CooldownBar to reset. ===
useEffect(() => {
  if (!cooldownSignal.active || !cooldownSignal.type) return;

  const duration = cooldownSignal.type === 'ranged' 
    ? COOLDOWNS.RANGED 
    : COOLDOWNS.MELEE;

  // console.log(`[TIMER] Set timeout ${duration}ms for ${cooldownSignal.type}`);
  const timer = setTimeout(() => {
    // console.log(`[TIMER] Reset ${cooldownSignal.type} cooldown`);
    setCooldownSignal({ active: false, type: null });
  }, duration);

  return () => clearTimeout(timer);
}, [cooldownSignal]);

/* --- For Z Index Manager ----- */
// 🔥 ADD THIS HOOK CALL (near your other hooks)
const { worldToScreen } = useIsoProjection(tileSize);
/* ------------------------ */
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
      if (objects[k] === 'woodobject' || objects[k] === 'rockobject' || objects[k] === 'spiderweb' || objects[k] === 'knights-armor' 
        || objects[k] === 'short-sword' || objects[k] === 'wing-armor'
      ) newDropped.add(k);
    });
    setDroppedItems(newDropped);
  }, [objects]);

  // Add this useEffect
const [, forceTileUpdate] = useReducer(x => x + 1, 0);

useEffect(() => {
  forceTileUpdate(); // Rebuild memoizedTiles when these change
}, [grid, objects, activeQuests, globalInventory]);

  /* --------------------------------------------------------------
   MOBILE JOYSTICK — CLEAN, SAFE, NO FREEZE
   -------------------------------------------------------------- */
/* --------------------------------------------------------------
   MOBILE JOYSTICK — DRAGGABLE + REPEAT MOVES!
   -------------------------------------------------------------- */
const isMobileDevice = isMobile();
const joystickRef = useRef(null);
const lastMoveTime = useRef(0);
const moveDelay = 150; // ← FASTER: 150ms (feels responsive)
const repeatTimer = useRef(null); // NEW: Auto-repeat
const currentDirRef = useRef(null); // NEW: Track active direction

useEffect(() => {
  if (!isMobileDevice || !joystickRef.current) return;

  const manager = nipplejs.create({
    zone: joystickRef.current,
    mode: 'static',
    position: { left: '50%', top: '50%' },
    color: 'rgba(255, 255, 255, 0.7)',
    size: 120, // ← BIGGER: easier thumb drag
    restOpacity: 0.6,
  });

  // === DIRECTION MAPPING ===
  const getDirection = (data) => {
    if (!data.direction) return null;
    const angle = data.direction.angle;
    return angle; // 'up', 'down', 'left', 'right'
  };

  // === REPEAT MOVE FUNCTION ===
  const repeatMove = () => {
    if (!currentDirRef.current || !playerPos) return;

    const dir = currentDirRef.current;
    let dx = 0, dy = 0;
    if (dir === 'up')    dy = -1;
    if (dir === 'down')  dy = 1;
    if (dir === 'left')  dx = -1;
    if (dir === 'right') dx = 1;

    const now = Date.now();
    if (now - lastMoveTime.current < moveDelay) return;
    lastMoveTime.current = now;

    const newPos = { x: playerPos.x + dx, y: playerPos.y + dy };
    onPlayerMoveAttempt(newPos);
  };

  // === START DRAG: Begin repeating ===
  manager.on('start', () => {
    console.log('🎮 Joystick START');
  });

  // === MOVE: Update direction + start repeat ===
  manager.on('move', (evt, data) => {
    const dir = getDirection(data);
    if (!dir || !playerPos) return;

    // IMMEDIATE ANIMATION
    setMoveDirection(dir);

    // UPDATE DIR + START REPEAT
    currentDirRef.current = dir;
    if (!repeatTimer.current) {
      repeatTimer.current = setInterval(repeatMove, moveDelay);
    }
  });

  // === END DRAG: Stop repeat ===
  manager.on('end', () => {
    console.log('🎮 Joystick END');
    currentDirRef.current = null;
    if (repeatTimer.current) {
      clearInterval(repeatTimer.current);
      repeatTimer.current = null;
    }
    setMoveDirection(null); // Reset animation
  });

  // === CLEANUP ===
  return () => {
    manager.destroy();
    if (repeatTimer.current) {
      clearInterval(repeatTimer.current);
    }
  };
}, [isMobileDevice, onPlayerMoveAttempt, playerPos, moveDelay, setMoveDirection]);

  // ── Memorize the grid ─────────────────────────────────────────────────────
// Memoize the ENTIRE tile computation
const memoizedTiles = useMemo(() => {
  return grid.map((row, y) =>
    row.map((terrain, x) => {
      const key = `${x},${y}`;
      const obj = objects[key];

      // Compute marker for campfireshaman
      const isShaman = obj === 'campfireshaman';
      const marker = isShaman ? getQuestMarker(activeQuests, globalInventory) : null;

      return { key, x, y, terrain, obj, isShaman, marker };
    })
  );
  }, []);  // ← NEVER RE-COMPUTE
// }, [grid, objects, activeQuests, globalInventory]);  // Only re-compute when THESE change

     // TOP OF PlayMode
useEffect(() => {
  console.log('[RENDER TRIGGERS]', {
    playerPos: playerPos?.x + ',' + playerPos?.y,
    moveDirection: moveDirectionRef.current,
    objectsChanged: !!objects,
    gridChanged: !!grid,
    popups: popups.length,
    pickupPopups: pickupPopups.length,
  });
}, [playerPos, objects, grid, popups, pickupPopups]);
  /* --------------------------------------------------------------
     3. Render
     -------------------------------------------------------------- */


  return (
    <div className="play-mode">

      <div className="level-label">
        {displayName}
      </div>

      {/* ---------- INPUT ---------- */}
      <PlayerMovement
        playerPos={playerPos}
        onPlayerMove={onPlayerMoveAttempt}   // <-- now the hook does the heavy lifting
        onExit={onExit}
        objects={objects}
        restrictedTiles={restrictedTiles}
        rows={rows}
        columns={columns}
        level={currentLevel}
        onLevelChange={onLevelChange}
        onStartInteraction={key => interactionRef.current?.handleStartInteraction(key)}
        onCancelInteraction={() => interactionRef.current?.cancelInteraction()}
        interactionActive={interaction.active}
        interactionType={interaction.type}
        CHOPPABLE_OBJECTS={CHOPPABLE_OBJECTS}
        TALKABLE_OBJECTS={TALKABLE_OBJECTS}
        OPENABLE_OBJECTS={OPENABLE_OBJECTS}
        isDead={isDead}
        setMoveDirection={setMoveDirection}
      />

      {/* ---------- AI / COMBAT ---------- */}
      <MonsterMovement
        objects={objects}
        playerPos={playerPos}
        onObjectsChange={onObjectsChange}
        restrictedTiles={restrictedTiles}
        rows={rows}
        columns={columns}
        // monsterHealths={monsterHealths}
        globalMonsterHealths={globalMonsterHealths}
        monsterTypes={monsterTypes}
      />
      <CombatSystem
        playerPos={playerPos}
        playerHealth={globalPlayerHealth}
        onPlayerHealthChange={onPlayerHealthChange}
        objects={objects}
        // monsterHealths={monsterHealths}
        onMonsterHealthChange={onMonsterHealthChange}
        onObjectsChange={onObjectsChange}
        onQueueRespawn={onQueueRespawn}
        originalSpawns={originalSpawns}
        isDead={isDead}
        setIsDead={setIsDead}
        globalMonsterHealths={globalMonsterHealths}
        monsterTypes={monsterTypes}
        inventory={globalInventory}
        // Popups
        addPopup={addPopup} 
        healPopup={healPopup}
        onHealPopupFinish={onHealPopupFinish}
        setLastDamageTime={setLastDamageTime}
        popups={popups}
        setPopups={setPopups}
        // Attacks cooldown
        setCooldownSignal={setCooldownSignal}
        currentLevel={currentLevel}
        cooldowns={COOLDOWNS}
        monsterData={monsterData}
        // playerXp={player.xp}
        // setPlayerXp={setPlayerXp}
        equipment={equipment}
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
        activeQuests={activeQuests}
        equipment={equipment}
        setShowInventory={setShowInventory}
        showInventory={showInventory}
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
<CanvasGrid
  grid={grid}
  objects={objects}
  currentLevel={currentLevel}
  playerPos={playerPos}
  tileSize={tileSize}
  columns={columns}
  rows={rows}
  monsterTypes={monsterTypes}
  monsterData={monsterData}
  globalMonsterHealths={globalMonsterHealths}
  pickupPopups={pickupPopups}
  popups={popups}
  removePickupPopup={removePickupPopup}
  setPopups={setPopups}
  droppedItems={droppedItems}
  activeQuests={activeQuests}
  globalInventory={globalInventory}
  NPC_NAMES={NPC_NAMES}
  getQuestMarker={getQuestMarker}
  camera={camera}
/>
{/* 🔥 ONE CHILD: FlatEntityLayer */}
<ZIndexManager
  playerPos={playerPos}
  objects={objects}
  monsterTypes={monsterTypes}
  objectTypes={objectTypes}
  camera={camera}
  tileSize={tileSize}
  columns={columns}
  rows={rows}
>
  {/* 🔥 FLATENTITYLAYER INSIDE ZINDEXMANAGER ← THIS WAS MISSING!! */}
  <FlatEntityLayer
    playerPos={playerPos}
    moveDirectionRef={moveDirectionRef}
    moveTrigger={moveTriggerRef.current}
    globalPlayerHealth={globalPlayerHealth}
    currentAction={currentAction}
    choppingProgress={choppingProgress}
    tileSize={tileSize}
    popups={popups}
    addPopup={addPopup}
    setPopups={setPopups}
    pickupPopups={pickupPopups}
    removePickupPopup={removePickupPopup}
    objects={objects}
    globalMonsterHealths={globalMonsterHealths}
    monsterData={monsterData}
    monsterTypes={monsterTypes}
    camera={camera}
    worldToScreen={worldToScreen}
  objectTypes={objectTypes}  // ← NEW: tree/wall data
  />
</ZIndexManager>

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
        level={currentLevel}
        
        currentAction={currentAction}
  setCurrentAction={setCurrentAction}
  choppingProgress={choppingProgress}
  setChoppingProgress={setChoppingProgress}

  activeQuests={activeQuests}
  setActiveQuests={setActiveQuests}
      />

    {/* COOLDOWN / CHARGE BAR */}
<CooldownBar 
signal={cooldownSignal} 
setCooldownSignal={setCooldownSignal}
cooldowns={COOLDOWNS}
/>
{isMobileDevice && (
  <MobileControls
    joystickRef={joystickRef}
    onExit={onExit}
    openInventory={openInventory}
  />
)}

{!isMobileDevice && (
      <button onClick={onExit}>Edit Mode</button>
      )}
    </div>
  );
};

export default PlayMode;