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
import InteractionSystem from './InteractionSystem';

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

  // === CHOPPING LOGIC MOVED TO InteractionSystem ===
const interaction = InteractionSystem({
  playerPos,
  objects,
  onObjectsChange,
  onCancelChop: () => interaction.cancelChop()  // ← self-call
});

const { handleStartChop, chopping, cancelChop } = interaction;

  // === PICKUP & PERSISTENT DICTIONARIES ===
  const PICKUP_OBJECTS = new Set(['spiderweb', 'timber', 'coin', 'potion']);
  const PERSISTENT_WALKABLE = new Set([
    'unlockeddoorobject',
    'portal-to-1',
    'portal-to-2',
    'portal-to-3',
    'portal-to-4',
    'bridge',
    'ladder',
    'holeobject',
    'ropeobject'
  ]);

  // === HANDLE PLAYER MOVE ===
const handlePlayerMove = (newPos) => {
  const newKey = `${newPos.x},${newPos.y}`;
  const oldKey = playerPos ? `${playerPos.x},${playerPos.y}` : null;
  const targetObj = objects[newKey];

  const newObjects = { ...objects };

  // 1. Remove player from old position
  if (oldKey && newObjects[oldKey] === 'player') {
    delete newObjects[oldKey];
  }

  // 2. PICKUP: Delete collectibles
  if (targetObj && PICKUP_OBJECTS.has(targetObj)) {
    delete newObjects[newKey];
    console.log(`Picked up ${targetObj}!`);
  }

  // 3. PERSISTENT: DO NOT overwrite!
  const isPersistent = targetObj && PERSISTENT_WALKABLE.has(targetObj);

  // 4. PLACE PLAYER:
  // - Only if NOT on a persistent object
  // - OR if it's a portal (we'll handle teleport separately)
  if (!isPersistent && !targetObj?.startsWith('portal-to-')) {
    newObjects[newKey] = 'player';
  }
  // → If on door/portal → player goes UNDER it (object stays)

  // 5. Update state
  onPlayerMove(newPos);
  onObjectsChange(newObjects);
};

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
        onStartChop={handleStartChop}
        onCancelChop={cancelChop}
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