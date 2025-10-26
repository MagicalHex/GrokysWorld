// PlayMode.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { OBJECTS } from './Objects';
import PlayerMovement from './PlayerMovement';
import MonsterMovement from './MonsterMovement';
import CombatSystem from './CombatSystem';
import HealthBar from './HealthBar';
import InteractionSystem from './InteractionSystem';
import {
  CHOPPABLE_OBJECTS,
  TALKABLE_OBJECTS
} from './InteractionConstants';
import PlayerInventory from './PlayerInventory';
import './PlayMode.css';


const PlayMode = ({
  grid, objects, playerPos, onExit, tileSize,
  rows, columns, onPlayerMove, onObjectsChange,
  restrictedTiles, level, onLevelChange
}) => {
  const [playerHealth, setPlayerHealth] = useState(100);
  const [monsterHealths, setMonsterHealths] = useState({});
  const [pickedItem, setPickedItem] = useState(null);
  const [droppedItems, setDroppedItems] = useState(new Set());
  const [pickingUpTile, setPickingUpTile] = useState(null);
  const [inventory, setInventory] = useState({});

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
const [isDead, setIsDead] = useState(false);

// Watch player health
useEffect(() => {
  if (playerHealth <= 0 && !isDead) {
    setIsDead(true);
    console.log('PLAYER DIED');
  }
}, [playerHealth, isDead]);

    // ---- DETECT DROPPED ITEMS (TO MAKE THEM SHINY) ----
  useEffect(() => {
    const newDropped = new Set();
    Object.keys(objects).forEach(key => {
      if (objects[key] === 'woodobject' || objects[key] === 'rockobject') {
        newDropped.add(key);
      }
    });
    setDroppedItems(newDropped);
  }, [objects]);

  // ---- PLAYER MOVE (pickup, persistent objects, etc.) ----
  const handlePlayerMove = useCallback((newPos) => {
    const newKey = `${newPos.x},${newPos.y}`;
    const oldKey = playerPos ? `${playerPos.x},${playerPos.y}` : null;
    const targetObj = objects[newKey];
    const newObjs = { ...objects };

    if (oldKey && newObjs[oldKey] === 'player') delete newObjs[oldKey];

    const PICKUP = new Set(['spiderweb', 'timber', 'coin', 'gold', 'potion', 'woodobject', 'rockobject']);
    if (targetObj && PICKUP.has(targetObj)) {
      console.log('[PlayMode] Setting picked item:', targetObj);
      setPickedItem(targetObj); // Triggers inventory
      setPickingUpTile(newKey); // Trigger pickup animation

      setTimeout(() => {
        setPickingUpTile(null); // Clear animation after 0.5s
        const updatedObjs = { ...newObjs };
        delete updatedObjs[newKey]; // Remove item after animation
        onObjectsChange(updatedObjs);
         setPickedItem(null); // CRITICAL: Clear immediately after animation - Supposed to help to only pick up one dropped
      }, 500); // Match pickupCircle duration
    } else {
      setPickedItem(null);
      onObjectsChange(newObjs);
    }

    const PERSIST = new Set([
      'unlockeddoorobject', 'portal-to-1', 'portal-to-2', 'portal-to-3', 'portal-to-4',
      'bridge', 'ladder', 'holeobject', 'ropeobject'
    ]);
    const isPersist = targetObj && PERSIST.has(targetObj);

    if (!isPersist && !targetObj?.startsWith('portal-to-')) {
      newObjs[newKey] = 'player';
    }

    onPlayerMove(newPos);
  }, [playerPos, objects, onPlayerMove, onObjectsChange]);

  // ---- RENDER ----
  return (
    <div className="play-mode">
      <PlayerMovement
        playerPos={playerPos}
        onPlayerMove={handlePlayerMove}
        onExit={onExit}
        objects={objects}
        restrictedTiles={restrictedTiles}
        rows={rows}
        columns={columns}
        level={level}
        onLevelChange={onLevelChange}
        onStartInteraction={(key) => interactionRef.current?.handleStartInteraction(key)}
        onCancelInteraction={() => interactionRef.current?.cancelInteraction()}
        interactionActive={interaction.active}
        interactionType={interaction.type}
        CHOPPABLE_OBJECTS={CHOPPABLE_OBJECTS}
        TALKABLE_OBJECTS={TALKABLE_OBJECTS}
      />
      <MonsterMovement
        objects={objects}
        playerPos={playerPos}
        onObjectsChange={onObjectsChange}
        restrictedTiles={restrictedTiles}
        rows={rows}
        columns={columns}
        monsterHealths={monsterHealths}
        setMonsterHealths={setMonsterHealths}
      />
      <CombatSystem
        playerPos={playerPos}
        playerHealth={playerHealth}
        setPlayerHealth={setPlayerHealth}
        objects={objects}
        monsterHealths={monsterHealths}
        setMonsterHealths={setMonsterHealths}
        onObjectsChange={onObjectsChange}
      />
      <PlayerInventory
        interactionActive={interactionRef.current?.interaction?.active}
        onItemPickup={pickedItem}
        onInventoryChange={setInventory} // New: Receive updates
        inventory={inventory} // Optional: Pass down if needed for display
        setInventory={setInventory}
      />

      {/* PLAYER DEATH */}
      {isDead && (
        <div className="death-screen">
          <div className="death-message">
            <h1>You Died</h1>
            <p>Your adventure ends here...</p>
            <button onClick={() => {
              setIsDead(false);
              setPlayerHealth(100);
              
              // OPTIONAL: Reset inventory/monsters if you want a "hard reset"
              // setInventory({});
              // setMonsterHealths({});

              // RESPAWN: Level 1 at (2,14) — similar to portal/hole/rope syntax
              onLevelChange(1, { x: 2, y: 14 });
            }}>
              Respawn
            </button>
          </div>
        </div>
      )}

      {/* GRID */}
      <div className="play-grid" style={{ gridTemplateColumns: `repeat(${columns}, ${tileSize}px)` }}>
        {grid.map((row, y) => row.map((terrain, x) => {
          const key = `${x},${y}`;
          const obj = objects[key];

          return (
            <div
              key={key}
              className={`tile ${terrain} ${pickingUpTile === key ? 'picking-up' : ''}`}
              style={{ width: tileSize, height: tileSize, position: 'relative' }}
            >
            {/* OBJECTS  */}
              {obj && (
                <div className={`object ${obj} ${droppedItems.has(key) ? 'dropped-item' : ''}`}>
                  {OBJECTS[obj]}
                  {(obj === 'skeleton' || obj === 'spider') && (
                    <HealthBar health={monsterHealths[key] || 100} color="#FF9800" />
                  )}
                </div>
              )}
              {/* PLAYER  */}
              {playerPos?.x === x && playerPos?.y === y && (
                <div className="player"
                style={{ fontSize: '38px' }}
                >🧙
                  <HealthBar health={playerHealth} color={playerHealth > 50 ? '#4CAF50' : '#f44336'} />
                </div>
              )}

            </div>
          );
        }))}
      </div>

      {/* Interaction UI is now inside InteractionSystem */}
      <InteractionSystem
        ref={interactionRef}
        playerPos={playerPos}
        objects={objects}
        onObjectsChange={onObjectsChange}
        onCancelInteraction={() => {}}
        rows={rows}
        columns={columns}
        inventory={inventory}
        setInventory={setInventory}
        interaction={interaction}
        setInteraction={setInteraction}
        tileSize={tileSize}
      />

      <button onClick={onExit}>Edit Mode</button>
    </div>
  );
};

export default PlayMode;