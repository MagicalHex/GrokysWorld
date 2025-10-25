import React, { useState, useEffect, useCallback } from 'react';
import { OBJECTS } from './Objects';
import PlayerMovement from './PlayerMovement';
import MonsterMovement from './MonsterMovement';
import CombatSystem from './CombatSystem';
import HealthBar from './HealthBar';
import ProgressBar from './ProgressBar';
import InteractionSystem from './InteractionSystem';
import './PlayMode.css';

const PlayMode = ({
  grid, objects, playerPos, onExit, tileSize,
  rows, columns, onPlayerMove, onObjectsChange,
  restrictedTiles, level, onLevelChange
}) => {
  const [playerHealth, setPlayerHealth] = useState(100);
  const [monsterHealths, setMonsterHealths] = useState({});

  // ---- INTERACTION SYSTEM ----
  const interaction = InteractionSystem({
    playerPos,
    objects,
    onObjectsChange,
    onCancelInteraction: () => interaction.cancelInteraction()
  });

  const {
    handleStartInteraction,
    interaction: interactState,
    cancelInteraction,
    setInteraction
  } = interaction;

  // ---- DIALOGUE ACTIONS (injected into InteractionSystem) ----
  const closeDialogue = () => cancelInteraction();
  const openShop = (type) => { console.log('Shop:',type); closeDialogue(); };
  const say = (txt) => setInteraction(prev => ({
    ...prev,
    message: txt,
    choices: [{ key:'up', text:'Thanks!', action: closeDialogue }]
  }));

  // ---- ARROW-KEY DIALOGUE HANDLER ----
useEffect(() => {
  const handleChoice = (e) => {
    // LOG EVERY CALL
    console.log('[PlayMode] dialogue handler – key:', e.key,
                'active?', interactState.active,
                'type?', interactState.type);

    if (!interactState.active || interactState.type !== 'talk') return;

    const map = { ArrowUp:0, ArrowLeft:1, ArrowRight:2 };
    if (e.key === 'ArrowDown') {
      console.log('[PlayMode] ↓  cancelling dialogue');
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

  window.addEventListener('keydown', handleChoice, true); // capture phase
  return () => window.removeEventListener('keydown', handleChoice, true);
}, [
  interactState.active,
  interactState.type,
  interactState.choices,
  cancelInteraction
]);

  // ---- PLAYER MOVE (pickup, persistent objects, etc.) ----
  const handlePlayerMove = useCallback((newPos) => {
    const newKey = `${newPos.x},${newPos.y}`;
    const oldKey = playerPos ? `${playerPos.x},${playerPos.y}` : null;
    const targetObj = objects[newKey];
    const newObjs = { ...objects };

    if (oldKey && newObjs[oldKey] === 'player') delete newObjs[oldKey];

    const PICKUP = new Set(['spiderweb','timber','coin','potion']);
    if (targetObj && PICKUP.has(targetObj)) delete newObjs[newKey];

    const PERSIST = new Set([
      'unlockeddoorobject','portal-to-1','portal-to-2','portal-to-3','portal-to-4',
      'bridge','ladder','holeobject','ropeobject'
    ]);
    const isPersist = targetObj && PERSIST.has(targetObj);

    if (!isPersist && !targetObj?.startsWith('portal-to-')) {
      newObjs[newKey] = 'player';
    }

    onPlayerMove(newPos);
    onObjectsChange(newObjs);
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
        interactionType={interactState.type}   // chopping || talking
        onStartInteraction={handleStartInteraction}
        onCancelInteraction={cancelInteraction}
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

      {/* UI */}
      <p>Arrow keys to move | SPACE to edit</p>
      <div style={{display:'flex',gap:20,justifyContent:'center',marginBottom:10}}>
        <div>Player: <HealthBar health={playerHealth} color={playerHealth>50?'#4CAF50':'#f44336'}/></div>
      </div>
      <button onClick={onExit}>Edit Mode</button>

      {/* GRID */}
      <div className="play-grid" style={{gridTemplateColumns:`repeat(${columns},${tileSize}px)`}}>
        {grid.map((row,y)=>row.map((terrain,x)=>{
          const key=`${x},${y}`;
          const obj=objects[key];
          return (
            <div key={key} className={`tile ${terrain}`} style={{width:tileSize,height:tileSize,position:'relative'}}>
              {obj && (
                <div className={`object ${obj}`}>
                  {OBJECTS[obj]}
                  {(obj==='skeleton'||obj==='spider') && (
                    <HealthBar health={monsterHealths[key]||100} color="#FF9800"/>
                  )}
                </div>
              )}
              {playerPos?.x===x && playerPos?.y===y && (
                <div className="player">
                  <HealthBar health={playerHealth} color={playerHealth>50?'#4CAF50':'#f44336'}/>
                </div>
              )}
              {interactState.active && interactState.type==='chop' && interactState.key===key && <ProgressBar/>}
            </div>
          );
        }))}
      </div>

{/* SINGLE CHAT BUBBLE */}
{interactState.active && interactState.type === 'talk' && (
  <div
    className="chat-bubble"
    style={{
      left: `${(parseInt(interactState.key.split(',')[0]) * tileSize) + tileSize / 2}px`,
      top: `${(parseInt(interactState.key.split(',')[1]) * tileSize) + 60}px`, /* ← +60px */
    }}
  >
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