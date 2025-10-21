import React, { useState, useEffect, useCallback } from 'react';
import { OBJECTS } from './Objects';
import './EditWorld.css';
import './Terrains.css';

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
  restrictedTiles
}) => {
  const [playerHealth, setPlayerHealth] = useState(100);
  const [monsterHealths, setMonsterHealths] = useState({});
  const [canMove, setCanMove] = useState(true); // Track if player can move

  useEffect(() => {
    console.log(`PlayMode grid size: ${grid.length} rows x ${grid[0].length} columns`);
  }, [grid]);

  useEffect(() => {
    const healths = {};
    Object.keys(objects).forEach(key => {
      if (objects[key] === 'skeleton') {
        healths[key] = 100;
      }
    });
    setMonsterHealths(healths);
  }, [objects]);

  const distance = (pos1, pos2) => {
    return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
  };

  const moveMonster = useCallback((monsterKey) => {
    const [mx, my] = monsterKey.split(',').map(Number);
    const distToPlayer = distance({ x: mx, y: my }, playerPos);
    if (distToPlayer > 7) {
      console.log(`Skeleton at (${mx}, ${my}) too far from player (${playerPos.x}, ${playerPos.y}): ${distToPlayer} tiles`);
      return;
    }
    console.log(`Skeleton at (${mx}, ${my}) chasing player at (${playerPos.x}, ${playerPos.y}): ${distToPlayer} tiles`);

    const newObjects = { ...objects };
    delete newObjects[monsterKey];

    const directions = [
      { x: mx, y: my - 1 },
      { x: mx, y: my + 1 },
      { x: mx - 1, y: my },
      { x: mx + 1, y: my }
    ];

    let bestMove = null;
    let bestDist = Infinity;
    directions.forEach(dir => {
      if (
        dir.x >= 0 && dir.x < columns &&
        dir.y >= 0 && dir.y < rows &&
        !objects[`${dir.x},${dir.y}`] &&
        !restrictedTiles.has(`${dir.x},${dir.y}`) &&
        !(dir.x === playerPos.x && dir.y === playerPos.y)
      ) {
        const distToPlayer = distance(dir, playerPos);
        if (distToPlayer < bestDist) {
          bestDist = distToPlayer;
          bestMove = dir;
        }
      }
    });

    if (bestMove) {
      const newKey = `${bestMove.x},${bestMove.y}`;
      newObjects[newKey] = 'skeleton';
      onObjectsChange(newObjects);
      setMonsterHealths(prev => ({ ...prev, [newKey]: prev[monsterKey] }));
      console.log(`Skeleton moved from (${mx}, ${my}) to (${bestMove.x}, ${bestMove.y})`);
    } else {
      console.log(`Skeleton at (${mx}, ${my}) cannot move: no valid path`);
    }
  }, [playerPos, objects, onObjectsChange, restrictedTiles, rows, columns]);

  useEffect(() => {
    const interval = setInterval(() => {
      Object.keys(objects).forEach(key => {
        if (objects[key] === 'skeleton') {
          moveMonster(key);
        }
      });
    }, 500);
    return () => clearInterval(interval);
  }, [moveMonster, objects]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!canMove) {
        console.log(`Player movement blocked: waiting for ${moveDelay}ms cooldown`);
        return;
      }

      let newPos = { ...playerPos };
      if (e.key === 'ArrowUp' && playerPos.y > 0) {
        newPos = { ...playerPos, y: playerPos.y - 1 };
      } else if (e.key === 'ArrowDown' && playerPos.y < rows - 1) {
        newPos = { ...playerPos, y: playerPos.y + 1 };
      } else if (e.key === 'ArrowLeft' && playerPos.x > 0) {
        newPos = { ...playerPos, x: playerPos.x - 1 };
      } else if (e.key === 'ArrowRight' && playerPos.x < columns - 1) {
        newPos = { ...playerPos, x: playerPos.x + 1 };
      } else if (e.key === ' ') {
        e.preventDefault();
        onExit();
        return;
      }

      if (
        !objects[`${newPos.x},${newPos.y}`] &&
        !restrictedTiles.has(`${newPos.x},${newPos.y}`)
      ) {
        setCanMove(false); // Disable movement
        onPlayerMove(newPos);
        console.log(`Player moved to (${newPos.x}, ${newPos.y})`);
        setTimeout(() => {
          setCanMove(true); // Re-enable after delay
          console.log('Player movement cooldown ended');
        }, moveDelay);
      } else {
        console.log(`Player cannot move to (${newPos.x}, ${newPos.y}): ${objects[`${newPos.x},${newPos.y}`] ? 'occupied by object' : 'restricted tile'}`);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playerPos, onPlayerMove, onExit, objects, restrictedTiles, rows, columns, canMove]);

  const moveDelay = 300; // Movement delay in ms

  const HealthBar = ({ health, max = 100 }) => (
    <div style={{ 
      position: 'absolute', 
      top: -8, 
      left: '50%', 
      transform: 'translateX(-50%)',
      width: 24, 
      height: 4, 
      background: '#333',
      borderRadius: 2
    }}>
      <div style={{ 
        width: `${(health / max) * 100}%`, 
        height: '100%', 
        background: health > 50 ? '#4CAF50' : '#f44336',
        borderRadius: 2 
      }} />
    </div>
  );

  return (
    <div className="play-mode">
      <h1>🎮 PLAY MODE!</h1>
      <p>Arrow keys to move | SPACE to edit</p>
      <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginBottom: 10 }}>
        <div>
          Player: <HealthBar health={playerHealth} />
        </div>
      </div>
      <button onClick={onExit}>Edit Mode</button>
      
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
                {obj && (
                  <div className="object">
                    {OBJECTS[obj]}
                    {obj === 'skeleton' && (
                      <HealthBar health={monsterHealths[key] || 100} />
                    )}
                    {obj === 'player' && (
                      <HealthBar health={playerHealth} />
                    )}
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