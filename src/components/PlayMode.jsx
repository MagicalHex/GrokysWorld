// src/components/PlayMode.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
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

// Mobile play
import nipplejs from 'nipplejs';
import { isMobile } from '../utils/isMobile';

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
tileSize: baseTileSize,
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
  healPopup,
  onHealPopup,
  onHealPopupFinish,
  lastDamageTime,
  setLastDamageTime
}) => {
  /* --------------------------------------------------------------
     MOBILE AREA
     -------------------------------------------------------------- */
  const isMobileDevice = isMobile();
  const joystickRef = useRef(null);
  const moveAttemptRef = useRef(onPlayerMoveAttempt);

  useEffect(() => {
    moveAttemptRef.current = onPlayerMoveAttempt;
  }, [onPlayerMoveAttempt]);

  const tileSize = isMobileDevice ? Math.floor(baseTileSize * 0.6) : baseTileSize;
  /* --------------------------------------------------------------
     DEBUG AREA
     -------------------------------------------------------------- */
useEffect(() => {
  console.log('[PlayMode] current level updated:', currentLevel);
}, [currentLevel]);
useEffect(() => {
    console.log('[PlayMode] globalMonsterHealths updated:', globalMonsterHealths);
  }, [globalMonsterHealths]);

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
  const [moveDirection, setMoveDirection] = useState(null);
  // console.log('[PlayMode] current moveDirection →', moveDirection);
  // ── Inventory ─────────────────────────────────────────────────────
  const [showInventory, setShowInventory] = useState(false);

  const openInventory = useCallback(() => {
    setShowInventory(true);
  }, []);

  // ── Equipment ─────────────────────────────────────────────────────
  // ---- ONE place that knows what is equipped ----
  const { equipment, inventory } = useEquipment(globalInventory);
  // ← PUT IT HERE
  useEffect(() => {
    console.log('EQUIPPED:', equipment);
  }, [equipment]); // ← Re-run when equipment changes
  // ── Battle System ─────────────────────────────────────────────────────
  // Stand still in same area as monsters to start loading range combat
const [cooldownSignal, setCooldownSignal] = useState({ active: false, type: null });

useEffect(() => {
  console.log('[STATE] cooldownSignal changed:', cooldownSignal);
}, [cooldownSignal]);

// === TIMER: Auto-reset. Helper for CooldownBar to reset. ===
useEffect(() => {
  if (!cooldownSignal.active || !cooldownSignal.type) return;

  const duration = cooldownSignal.type === 'ranged' 
    ? COOLDOWNS.RANGED 
    : COOLDOWNS.MELEE;

  console.log(`[TIMER] Set timeout ${duration}ms for ${cooldownSignal.type}`);

  const timer = setTimeout(() => {
    console.log(`[TIMER] Reset ${cooldownSignal.type} cooldown`);
    setCooldownSignal({ active: false, type: null });
  }, duration);

  return () => clearTimeout(timer);
}, [cooldownSignal]);
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

  /* --------------------------------------------------------------
     MOBILE JOYSTICK
     -------------------------------------------------------------- */
useEffect(() => {
  if (!isMobileDevice || !joystickRef.current) return;

  const manager = nipplejs.create({
    zone: joystickRef.current,
    mode: 'static',
    position: { left: '50%', top: '50%' },  // Center of its zone
    color: 'rgba(255,255,255,0.7)',
    size: 90,
    threshold: 0.1,
    restOpacity: 0.6,
  });

  let moveInterval = null;

  manager.on('move', (evt, data) => {
    if (!data.direction) return;
    if (moveInterval) clearInterval(moveInterval);

    moveInterval = setInterval(() => {
      const dir = data.direction.angle;
      let dx = 0, dy = 0;
      if (dir === 'up') dy = -1;
      if (dir === 'down') dy = 1;
      if (dir === 'left') dx = -1;
      if (dir === 'right') dx = 1;

      if (dx || dy) {
        moveAttemptRef.current({ dx, dy });
      }
    }, 150);
  });

  manager.on('end', () => {
    if (moveInterval) clearInterval(moveInterval);
  });

  return () => manager.destroy();
}, [isMobileDevice]);

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
        showInventory={showInventory}           // ← ADD
        setShowInventory={setShowInventory}
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
  style={{
    gridTemplateColumns: `repeat(${columns}, ${tileSize}px)`,
    '--tile-size': `${tileSize}px`,   // ← 03-11-2025 Remove this if problems
  }}
>
{grid.map((row, y) =>
  row.map((terrain, x) => {
    const key = `${x},${y}`;
    const obj = objects[key];

    // Compute marker for campfireshaman
    const isShaman = obj === 'campfireshaman';
    const marker = isShaman ? getQuestMarker(activeQuests, globalInventory) : null;

    return (
      <div
        key={key}
        className={`tile ${terrain}`}
        // style={{ width: tileSize, height: tileSize, position: 'relative' }} 03-11-2025 Add this again if problems
      >
{obj && (
  <div
    className={`
      object ${monsterTypes[obj] || obj}
      ${droppedItems.has(key) ? 'dropped-item' : ''}
      ${isShaman && marker ? 'has-quest-marker' : ''}
    `.trim()}
    data-marker={marker}
  >
    {OBJECTS[monsterTypes[obj] || obj]}

{/* Health Bar for monsters */}
{isMonster(monsterTypes[obj]) && (
  <div className="monster-health-container">
    <div className="monster-name">
      {getMonsterData(monsterTypes[obj])?.name}
    </div>
    <HealthBar
      key={`${key}-${globalMonsterHealths[obj]}`}
      health={globalMonsterHealths[obj] ?? 0}
      max={getMonsterData(monsterTypes[obj])?.hp}
      color="#FF9800"
    />
  </div>
)}

    {/* NPC Name Label (const NPC_NAMES) */}
    {NPC_NAMES[obj] && (
      <div className="npc-name-label">
        {obj === 'farmer001' && 'Farmer '}
        {NPC_NAMES[obj]}
        {obj === 'mechanic001' && ' the Blacksmith'}
        {obj === 'oldandwise' && ' the Wise'}
      </div>
    )}
      </div>
    )}
          
{playerPos?.x === x && playerPos?.y === y && (
  <div
    key={`player-${playerPos.x}-${playerPos.y}`}
    className={`object player ${
      moveDirection 
        ? `enter-from-${moveDirection}`      // moving
        : 'standing'                         // standing (NEW!)
    }`}
    onAnimationStart={() => console.log('[ANIM] Starting:', moveDirection)}
    onAnimationEnd={() => console.log('[ANIM] Ended:', moveDirection)}
  >
    
    <ActionBar
      type={currentAction}
      value={currentAction === 'health' ? globalPlayerHealth : choppingProgress}
      color={globalPlayerHealth > 50 ? '#169b1fff' : '#f44336'}
    />

  </div>
)}

              {/* PICKUP POPUP — NOW INSIDE TILE */}
                {pickupPopups
                  .filter(p => p.x === x && p.y === y)
                  .map(p => (
                    <PickupPopup
                      key={p.id}
                      item={p.item}
                      onFinish={() => removePickupPopup(p.id)}
                    />
                  ))}

                  {/* DAMAGE POPUPS — NOW INSIDE TILE */}
                {popups
                  .filter(p => p.x === x && p.y === y)
                  .map(p => (
                    <DamagePopup
                      key={p.id}
                      damage={p.dmg}
                      isPlayer={p.isPlayer}
                      isHeal={p.isHeal}
                      isXP={p.isXP}
                      isCrit={p.isCrit}
                      onFinish={() => setPopups(prev => prev.filter(x => x.id !== p.id))}
                    />
                  ))}

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

{/* MOBILE CONTROLS BAR */}
{isMobileDevice && (
  <div
    style={{
      position: 'absolute',
      bottom: 20,
      left: 0,
      right: 0,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '40px',
      zIndex: 1000,
      pointerEvents: 'none', // Allow clicks through
    }}
  >
    {/* EDIT BUTTON */}
    <button
      onClick={onExit}
      style={{
        width: 60,
        height: 60,
        borderRadius: '50%',
        background: '#333',
        color: 'white',
        fontSize: '18px',
        fontWeight: 'bold',
        border: '3px solid #666',
        pointerEvents: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      E
    </button>

    {/* JOYSTICK ZONE - CENTERED */}
    <div
      ref={joystickRef}
      style={{
        width: '120px',
        height: '120px',
        pointerEvents: 'auto',
      }}
    />

    {/* INVENTORY BUTTON */}
    <button
      onClick={openInventory}
      style={{
        width: 60,
        height: 60,
        borderRadius: '50%',
        background: '#333',
        color: 'white',
        fontSize: '18px',
        fontWeight: 'bold',
        border: '3px solid #666',
        pointerEvents: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      I
    </button>
  </div>
)}

      {/* Desktop Edit Button - Hidden on Mobile */}
{!isMobileDevice && (
  <button onClick={onExit}>Edit Mode</button>
)}
    </div>
  );
};

export default PlayMode;