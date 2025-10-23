import React, { useState, useEffect } from 'react';
import { OBJECTS } from './Objects';
import PlayerMovement from './PlayerMovement';
import MonsterMovement from './MonsterMovement';
import CombatSystem from './CombatSystem';
import { useMonsterHealths } from './hooks/useMonsterHealths';
import HealthBar from './HealthBar';
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
  // ✅ FIXED: Make playerHealth mutable again
  const [playerHealth, setPlayerHealth] = useState(100);
// ✅ NEW: Initialize monster health from initial objects (no hook!)
  const initialMonsterHealths = {};
  Object.keys(objects).forEach(key => {
    const type = objects[key];
    if (type === 'skeleton' || type === 'spider') {
      initialMonsterHealths[key] = 100;
    }
  });
  const [monsterHealths, setMonsterHealths] = useState(initialMonsterHealths);

  useEffect(() => {
    console.log(`*** LEVEL CHANGED! PlayMode Level ${level} | Player at (${playerPos?.x || '?'}, ${playerPos?.y || '?'}) | Grid: ${grid[0][0]} terrain`);
  }, [grid, objects, playerPos, level]);

  return (
    <div className="play-mode">
      {/* MOVEMENT COMPONENTS - Invisible but functional */}
      <PlayerMovement
        playerPos={playerPos}
        onPlayerMove={onPlayerMove}
        onExit={onExit}
        objects={objects}
        restrictedTiles={restrictedTiles}
        rows={rows}
        columns={columns}
        level={level}
        onLevelChange={onLevelChange}
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
                {/* Render objects */}
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
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default PlayMode;