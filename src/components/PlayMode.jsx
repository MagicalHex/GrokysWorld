// PlayMode.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { OBJECTS } from './Objects';
import PlayerMovement from './PlayerMovement';
import MonsterMovement from './MonsterMovement';
import CombatSystem from './CombatSystem';
import HealthBar from './HealthBar';
import ProgressBar from './ProgressBar';
import InteractionSystem from './InteractionSystem';
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
  const [droppedItems, setDroppedItems] = useState(new Set()); // Track dropped items
  const [pickingUpTile, setPickingUpTile] = useState(null); // Track pickup animation

  // ---- INTERACTION SYSTEM ----
  const [inventory, setInventory] = useState({}); // New: Track inventory here

  // ---- INTERACTION SYSTEM ----
  const interaction = InteractionSystem({
    playerPos,
    objects,
    onObjectsChange,
    onCancelInteraction: () => interaction.cancelInteraction(),
    rows,
    columns,
    onItemPickup: (item) => setPickedItem(item),
    inventory, // New: Pass inventory
    setInventory // New: Pass setInventory
  });


  const {
    handleStartInteraction,
    interaction: interactState,
    cancelInteraction,
    setInteraction,
    CHOPPABLE_OBJECTS,
    TALKABLE_OBJECTS
  } = interaction;

  // ---- DIALOGUE ACTIONS ----
  const closeDialogue = () => cancelInteraction();
  const openShop = (type) => { console.log('Shop:', type); closeDialogue(); };
  const say = (txt) => setInteraction(prev => ({
    ...prev,
    message: txt,
    choices: [{ key: 'up', text: 'Thanks!', action: closeDialogue }]
  }));

  // ---- ARROW-KEY DIALOGUE HANDLER ----
  useEffect(() => {
    const handleChoice = (e) => {
      console.log('[PlayMode] dialogue handler – key:', e.key,
                  'active?', interactState.active,
                  'type?', interactState.type);

      if (!interactState.active || interactState.type !== 'talk') return;

      const map = { ArrowUp: 0, ArrowLeft: 1, ArrowRight: 2 };
      if (e.key === 'ArrowDown') {
        console.log('[PlayMode] ↓ cancelling dialogue');
        cancelInteraction();
        return;
      }

      const idx = map[e.key];
      if (idx !== undefined && interactState.choices?.[idx]) {
        console.log('[PlayMode] selecting choice', idx, interactState.choices[idx].text);
        interactState.choices[idx].action();
      } else {
        console.log('[PlayMode] no choice for key', e.key);
      }
    };

    window.addEventListener('keydown', handleChoice, true);
    return () => window.removeEventListener('keydown', handleChoice, true);
  }, [
    interactState.active,
    interactState.type,
    interactState.choices,
    cancelInteraction
  ]);

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

    const PICKUP = new Set(['spiderweb', 'timber', 'coin', 'potion', 'woodobject', 'rockobject']);
    if (targetObj && PICKUP.has(targetObj)) {
      console.log('[PlayMode] Setting picked item:', targetObj);
      setPickedItem(targetObj); // Triggers inventory
      setPickingUpTile(newKey); // Trigger pickup animation

      setTimeout(() => {
        setPickingUpTile(null); // Clear animation after 0.5s
        const updatedObjs = { ...newObjs };
        delete updatedObjs[newKey]; // Remove item after animation
        onObjectsChange(updatedObjs);
        // setPickedItem(null); // CRITICAL: Clear immediately after animation - NEEDED? Supposed to help to only pick up one dropped
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
        interactionActive={interactState.active}
        interactionType={interactState.type}
        onStartInteraction={handleStartInteraction}
        onCancelInteraction={cancelInteraction}
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
        interactionActive={interactState.active}
        onItemPickup={pickedItem}
        onInventoryChange={setInventory} // New: Receive updates
        inventory={inventory} // Optional: Pass down if needed for display
      />


      {/* UI */}
      <button onClick={onExit}>Edit Mode</button>

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
              {obj && (
                <div className={`object ${obj} ${droppedItems.has(key) ? 'dropped-item' : ''}`}>
                  {OBJECTS[obj]}
                  {(obj === 'skeleton' || obj === 'spider') && (
                    <HealthBar health={monsterHealths[key] || 100} color="#FF9800" />
                  )}
                </div>
              )}
              {playerPos?.x === x && playerPos?.y === y && (
                <div className="player">
                  <HealthBar health={playerHealth} color={playerHealth > 50 ? '#4CAF50' : '#f44336'} />
                </div>
              )}
              {interactState.active && interactState.type === 'chop' && interactState.key === key && <ProgressBar />}
            </div>
          );
        }))}
      </div>

      {/* CHAT BUBBLE */}
      {interactState.active && interactState.type === 'talk' && (
        <div className="chat-bubble">
          <div style={{ fontSize: '40px' }}
          >
          🛠️
          </div>
          <div className="chat-bubble__message">{interactState.message}</div>
          {interactState.choices && (
            <div className="chat-bubble__choices">
              {interactState.choices.map((c, i) => {
                const icons = ['Up', 'Left', 'Right'];
                return (
                  <div key={i} className="chat-bubble__choice">
                    <span className="chat-bubble__icon">[{icons[i]}]</span>
                    {c.text}
                  </div>
                );
              })}
            </div>
          )}
          <div className="chat-bubble__hint">Press Down to walk away</div>
        </div>
      )}
    </div>
  );
};

export default PlayMode;