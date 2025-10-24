import React, { useState, useEffect } from 'react';
import { OBJECTS } from './Objects';
import PlayerMovement from './PlayerMovement';
import MonsterMovement from './MonsterMovement';
import CombatSystem from './CombatSystem';
import { useMonsterHealths } from './hooks/useMonsterHealths';
import HealthBar from './HealthBar';
import ProgressBar from './ProgressBar';
import './EditWorld.css';
import './Terrains.css';
import './PlayMode.css';
import './Objects.css';

const PlayMode = ({ 
  grid, 
  objects, 
  playerPos, 
  onExit, 
  tileSize,
  rows,
  columns,
  onPlayerMove,
  onObjectsChange,
  restrictedTiles,
  level,
  onLevelChange
}) => {
  // HEALTH
  const [playerHealth, setPlayerHealth] = useState(100);
  const [monsterHealths, setMonsterHealths] = useState({});

  const CHOP_DURATION = 3000; // 3 seconds

  // CHOPPING STATE
const [chopping, setChopping] = useState({
  active: false,
  key: null,
  progress: 0,
  timer: null,
  interval: null,
  startX: null,
  startY: null
});

  // === PICKUP & PERSISTENT DICTIONARIES ===
  const PICKUP_OBJECTS = new Set(['spiderweb', 'timber', 'coin', 'potion']);
  const PERSISTENT_WALKABLE = new Set([
    'unlockeddoorobject',
    'portal-to-1',
    'portal-to-2',
    'portal-to-3',
    'portal-to-4',
    'bridge',
    'ladder'
  ]);

  // === HANDLE PLAYER MOVE ===
  const handlePlayerMove = (newPos) => {
    const newKey = `${newPos.x},${newPos.y}`;
    const oldKey = playerPos ? `${playerPos.x},${playerPos.y}` : null;
    const targetObj = objects[newKey];

    console.log(`handlePlayerMove: from ${oldKey} to ${newKey} (obj: ${targetObj || 'empty'})`);

    const newObjects = { ...objects };

    if (oldKey && newObjects[oldKey] === 'player') {
      delete newObjects[oldKey];
    }

    if (targetObj && PICKUP_OBJECTS.has(targetObj)) {
      delete newObjects[newKey];
      console.log(`Picked up ${targetObj}!`);
      newObjects[newKey] = 'player';
    } else if (targetObj && PERSISTENT_WALKABLE.has(targetObj)) {
      // Player goes under
      newObjects[newKey] = 'player'; // Or don't overwrite if needed
    } else if (!targetObj?.startsWith('portal-to-')) {
      newObjects[newKey] = 'player';
    }

    onPlayerMove(newPos);
    onObjectsChange(newObjects);
  };

  // === HANDLE START CHOP ===

const handleStartChop = (targetKey) => {
  if (chopping.active) return;

  console.log(`Chopping started on ${targetKey}`);

  const timer = setTimeout(() => {
    const updated = { ...objects };
    delete updated[targetKey];
    updated[targetKey] = 'timberwoodchoppedobject';

    setChopping({ active: false, key: null, timer: null });
    onObjectsChange(updated);
    console.log('TREE CHOPPED! timberwoodchoppedobject placed.');
  }, CHOP_DURATION);

  setChopping({
    active: true,
    key: targetKey,
    timer
  });
};

  // === CANCEL CHOP ON MOVE ===
useEffect(() => {
  if (!chopping.active) return;

  return () => {
    if (chopping.timer) {
      clearTimeout(chopping.timer);
      setChopping({ active: false, key: null, timer: null });
      console.log('Chopping canceled — player moved!');
    }
  };
}, [playerPos, chopping.active, chopping.key, chopping.timer]);

  // RETURN
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
        onStartChop={handleStartChop}  // ← NEW PROP
      />
      <MonsterMovement
        objects={objects}
        playerPos={playerPos}
        onObjectsChange={onObjectsChange}
        restrictedTiles={restrictedTiles}
        rows={rows}
        columns={columns}
        monsterHealths={monsterHealths}  // ✅ PASS SHARED STATE!
        setMonsterHealths={setMonsterHealths}  // ✅ PASS SETTER!
      />
      {/* ✅ NEW COMBAT SYSTEM */}
      <CombatSystem
        playerPos={playerPos}
        playerHealth={playerHealth}
        setPlayerHealth={setPlayerHealth}
        objects={objects}
        monsterHealths={monsterHealths}
        setMonsterHealths={setMonsterHealths}
        onObjectsChange={onObjectsChange}
      />

      {/* UI - ✅ PLAYER HEALTH BAR RESTORED */}
      <p>Arrow keys to move | SPACE to edit</p>
      <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginBottom: 10 }}>
        <div>
          Player: <HealthBar health={playerHealth} color={playerHealth > 50 ? '#4CAF50' : '#f44336'} />
        </div>
      </div>
      <button onClick={onExit}>Edit Mode</button>
      
<div className="play-grid" style={{ gridTemplateColumns: `repeat(${columns}, ${tileSize}px)` }}>
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
                {obj && (
                  <div className={`object ${obj}`}>
                    {OBJECTS[obj]}
                    {obj === 'skeleton' && (
                      <HealthBar health={monsterHealths[key] || 100} color="#FF9800" />
                    )}
                    {obj === 'spider' && (
                      <HealthBar health={monsterHealths[key] || 100} color="#FF9800" />
                    )}
                  </div>
                )}
                {playerPos && playerPos.x === x && playerPos.y === y && (
                  <div className="player">
                    🧙
                    <HealthBar health={playerHealth} color={playerHealth > 50 ? '#4CAF50' : '#f44336'} />
                  </div>
                )}
                {/* CHOPPING TREES PROGRESSBAR */}
                {chopping.active && chopping.key === key && (
                  <ProgressBar />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default PlayMode;