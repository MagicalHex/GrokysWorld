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

import EffectsLayer from './EffectsLayer'; // For effects (spells, etc.)

import { useIsoProjection } from '../hooks/useIsoProjection';

// Add these imports
import nipplejs from 'nipplejs';
import { isMobile } from '../utils/isMobile';
import MobileControls from './MobileControls';

// For cool downs (CombatSystem and CooldownBar)
const COOLDOWNS = { MELEE: 1500, RANGED: 3500, SPELL: 5000, MONSTER: 3000 };
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
  background,
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
  camera,
  // for survival
currentSurvivalWave,
  survivalFinalScore,
  survivalHighScore,
  getSurvivalTimeFormatted,
  onRestart
}) => {
  /* --------------------------------------------------------------
     DEBUG AREA
     -------------------------------------------------------------- */
     // TEMP - Add to PlayMode
const renderCount = useRef(0);
renderCount.current++;
// console.log(`[RENDERS] ${renderCount.current}`); // Put at top of component

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
  // ── Player Movement ─────────────────────────────────────────────────────
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

    // ── Monster Movement ─────────────────────────────────────────────────────
const monsterMoveDirectionRef = useRef({}); // { [monsterId]: 'up' | ... }
const monsterMoveTriggerRef = useRef(0);
const [, forceMonsterUpdate] = useReducer(x => x + 1, 0);
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

  const duration = cooldownSignal.type === 'melee' 
    ? COOLDOWNS.MELEE 
    : cooldownSignal.type === 'ranged' 
    ? COOLDOWNS.RANGED 
    : cooldownSignal.type === 'spell' 
    ? COOLDOWNS.SPELL 
    : COOLDOWNS.MELEE; // default

  const timer = setTimeout(() => {
    setCooldownSignal({ active: false, type: null });
  }, duration);

  return () => clearTimeout(timer);
}, [cooldownSignal]);

  // ── For Z Index Manager ─────────────────────────────────────────────────────
// 🔥 ADD THIS HOOK CALL (near your other hooks)
const { worldToScreen } = useIsoProjection(tileSize);
  // ── For shooting fireball graphics ─────────────────────────────────────────────────────
const [fireballCastTrigger, setFireballCastTrigger] = useState(0);

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
        || objects[k] === 'short-sword' || objects[k] === 'wing-armor' || objects[k] === 'fireball'
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
   MOBILE JOYSTICK — SIMPLE & WORKING (No restrictions!)
   -------------------------------------------------------------- */
const isMobileDevice = isMobile();
const joystickRef = useRef(null);

useEffect(() => {
  if (!isMobileDevice || !joystickRef.current) return;

  const manager = nipplejs.create({
    zone: joystickRef.current,
    mode: 'static',
    position: { left: '50%', top: '50%' },
    color: 'rgba(255, 255, 255, 0.7)',
    size: 120,
    restOpacity: 0.6,
  });

  // === SIMPLE: move = move! (worked before)
  manager.on('move', (evt, data) => {
    if (!data.direction || !playerPos) return;

    const dir = data.direction.angle;
    let dx = 0, dy = 0;
    if (dir === 'up')    { dy = -1; setMoveDirection('up'); }
    if (dir === 'down')  { dy = 1;  setMoveDirection('down'); }
    if (dir === 'left')  { dx = -1; setMoveDirection('left'); }
    if (dir === 'right') { dx = 1;  setMoveDirection('right'); }

    const newPos = { 
      x: playerPos.x + dx, 
      y: playerPos.y + dy 
    };
    
    onPlayerMoveAttempt(newPos); // ← PlayerMovement handles ALL limits
  });

  // Reset animation on end
  manager.on('end', () => {
    setMoveDirection(null);
  });

  return () => manager.destroy();
}, [isMobileDevice, playerPos, onPlayerMoveAttempt, setMoveDirection]);

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
// useEffect(() => {
//   console.log('[RENDER TRIGGERS]', {
//     playerPos: playerPos?.x + ',' + playerPos?.y,
//     moveDirection: moveDirectionRef.current,
//     objectsChanged: !!objects,
//     gridChanged: !!grid,
//     popups: popups.length,
//     pickupPopups: pickupPopups.length,
//   });
// }, [playerPos, objects, grid, popups, pickupPopups]);
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
        // For image switching
        monsterMoveDirectionRef={monsterMoveDirectionRef}
        monsterMoveTriggerRef={monsterMoveTriggerRef}
        forceMonsterUpdate={forceMonsterUpdate}
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
        // for fire ball
        onFireballCast={() => setFireballCastTrigger(prev => prev + 1)}
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


{/* UPGRADED DEATH SCREEN */}
{isDead && (
  <div className="death-screen">
    <div className="death-message">
      <h1 className="glitch" data-text="YOU DIED">YOU DIED</h1>

      {currentLevel === 'survival' ? (
        <div className="survival-death-stats">

          <div className="stat"><span className="label">Final Wave </span><span className="value">{currentSurvivalWave}</span></div>
          <div className="stat"><span className="label">Time Survived: </span><span className="value">{getSurvivalTimeFormatted()}</span></div>
          <div className="stat score"><span className="label">Final Score: </span><span className="value">{survivalFinalScore?.toLocaleString() || '0'}</span></div>

          {survivalFinalScore > survivalHighScore && (
            <div className="new-record animate-pulse">NEW PERSONAL BEST!</div>
          )}

          <div className="highscore-note">Personal Best: {survivalHighScore.toLocaleString()}</div>

          {/* === HALL OF FAME CLAIM — ONLY ONCE PER RUN === */}
          {!localStorage.getItem('lastSubmittedScore') || 
           Number(localStorage.getItem('lastSubmittedScore')) !== survivalFinalScore ? (
            <div className="claim-fame mt-8 p-6 bg-gradient-to-br from-purple-900 to-black border-4 border-yellow-500 rounded-xl">
              <h2 className="text-3xl font-bold text-yellow-400 mb-4">CLAIM YOUR PLACE</h2>

              <input
                type="text"
                id="player-name-input"
                maxLength={18}
                placeholder="Name for the leaderboard"
                defaultValue={[
                  'Groky Slayer', 'Wave God', 'Unkillable', '420 Survivor',
                  'Pixel Chad', 'Doom Groky', 'The Final Boss', 'No Scope Legend'
                ][Math.floor(Math.random() * 8)]}
                className="w-full px-4 py-3 text-center text-2xl bg-black/80 border-2 border-yellow-600 rounded-lg text-white mb-4"
              />

              <button
                onClick={async () => {
                  let name = document.getElementById('player-name-input').value.trim();
                  if (!name) name = 'Mystery Legend #' + Math.floor(Math.random() * 9999);

                  try {
                    await fetch('/api/submit-score', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        sessionId,
                        score: survivalFinalScore,
                        name: name.slice(0, 25)
                      })
                    });

                    localStorage.setItem('lastSubmittedScore', survivalFinalScore);
                    alert(`Score submitted! ${name} is now in the Hall of Fame!`);
                  } catch (err) {
                    alert('No connection? Your score is safe — try again later.');
                  }
                }}
                className="big-btn bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 transform hover:scale-105 transition"
              >
                SUBMIT TO LEADERBOARD
              </button>

              <p className="text-sm text-gray-400 mt-4">You can submit later if you close now</p>
            </div>
          ) : (
            <div className="text-green-400 text-2xl font-bold mt-6">
              SCORE ALREADY SUBMITTED
            </div>
          )}

        </div>
      ) : (
        <p>Your adventure ends here...</p>
      )}

      <div className="death-buttons">
        <button
          className="big-btn"
          onClick={() => {
            localStorage.setItem('autoStartSurvival', 'true');
            window.location.reload();
          }}
        >
          Play Again
        </button>
        <button onClick={() => { window.location.href = '/'; }}>
          Main Menu
        </button>
                            {/* <button onClick={respawnPlayer}>Respawn</button> Existing code in useGameState*/}
      </div>
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
  background={background}
/>
{/* 🔥 Z INDEX */}
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
  {/* 🔥 FLATENTITYLAYER */}
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
  objectTypes={objectTypes}  // ← tree/wall data
  // For monster image switching when moving
  monsterMoveDirectionRef={monsterMoveDirectionRef}
  monsterMoveTriggerRef={monsterMoveTriggerRef}
  forceMonsterUpdate={forceMonsterUpdate}
  fireballCastTrigger={fireballCastTrigger}
  />
</ZIndexManager>

{/* <EffectsLayer
      playerPos={playerPos}
      tileSize={tileSize}
      camera={camera}
      worldToScreen={worldToScreen}
fireballCastTrigger={fireballCastTrigger}
    /> */}

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
      {/* SURVIVAL HUD — STICKY BOTTOM CENTER, ON TOP OF EVERYTHING */}
      {currentLevel === 'survival' && !isDead && (
        <div className="survival-hud-overlay">
          <div className="hud-content">
            <div className="hud-item wave">
              <span className="label">WAVE</span>
              <span className="value">{currentSurvivalWave}</span>
            </div>
            <div className="hud-item timer">
              <span className="label">TIME</span>
              <span className="value">{getSurvivalTimeFormatted()}</span>
            </div>
          </div>
        </div>
      )}

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