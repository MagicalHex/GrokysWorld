import React, { useState, useEffect } from 'react';
import { OBJECTS } from './Objects';
import { TERRAINS } from './Terrains';
import './EditWorld.css';
import './Terrains.css';
import './Objects.css';

const EditWorld = ({
  grid,
  objects,
  playerPos,
  onGridChange,
  onObjectsChange,
  onPlayerPosChange,
  tileSize = 40,
  mode,
  rows,
  columns,
  onPlayMode,
}) => {
  const [selectedTile, setSelectedTile] = useState(null);

  useEffect(() => {
    console.log(`EditWorld grid size: ${grid.length} rows x ${grid[0].length} columns`);
  }, [grid]);

  const handleTileClick = (x, y) => {
    if (x >= columns || y >= rows) {
      console.log(`Invalid tile click at (${x}, ${y}): out of bounds`);
      return;
    }
    console.log(`Tile selected at position: (${x}, ${y})`);
    setSelectedTile({ x, y });
  };

const handleCommand = (cmd) => {
    if (!selectedTile) return;
    const { x, y } = selectedTile;
    const key = `${x},${y}`;
    const newObjects = { ...objects };

    // CSS-FRIENDLY KEY: Remove spaces
    const cssKey = cmd.replace(/\s+/g, '');

    // TERRAIN
    if (TERRAINS[cmd]) {
      const newGrid = [...grid];
      newGrid[y][x] = cssKey;
      onGridChange(newGrid); // Updates restrictedTiles
      delete newObjects[key];
      onObjectsChange(newObjects);

      // Remove playerPos if overwriting it
      if (playerPos?.x === x && playerPos?.y === y) {
        onPlayerPosChange(null);
      }
    }
      // OBJECTS
      else if (OBJECTS[cmd] !== undefined || ['darkstone', 'lightstone', 'stone', 'rock'].includes(cmd)) {

      // PLAYER SPECIAL CASE: ALWAYS REPLACE OLD POSITION
      if (cmd === 'player' || cmd === 'player start') {
        // Remove OLD player object
        const oldPlayerKey = playerPos ? `${playerPos.x},${playerPos.y}` : null;
        if (oldPlayerKey && newObjects[oldPlayerKey] === 'player') {
          delete newObjects[oldPlayerKey];
        }

        // Set NEW player position
        newObjects[key] = 'player';
        onPlayerPosChange({ x, y });
        console.log(`Player placed at position: (${x}, ${y})`);
        onObjectsChange(newObjects);
      }
      // OTHER OBJECTS (keep multiples)
      else {
        // Mode-specific object restrictions
        if (
          (mode === 'rpg' && ['ball'].includes(cmd)) ||
          (mode === 'sports' && ['skeleton', 'goblin', 'orc'].includes(cmd)) ||
          (mode === 'shooter' && ['ball', 'potion'].includes(cmd))
        ) {
          console.log(`Cannot place '${cmd}' in ${mode} mode`);
          setSelectedTile(null);
          return;
        }

        newObjects[key] = cmd;
        console.log(`Object '${cmd}' placed at position: (${x}, ${y})`);
        onObjectsChange(newObjects);
      }
    }

    setSelectedTile(null);
  };

  return (
    <div className="edit-mode">
      <div
        className="edit-grid"
        style={{
          gridTemplateColumns: `repeat(${columns}, ${tileSize}px)`, // Dynamic columns
        }}
      >
        {grid.map((row, y) =>
          row.map((terrain, x) => {
            const key = `${x},${y}`;
            const obj = objects[key];
            return (
              <div
                key={key}
                className={`tile ${terrain} ${
                  selectedTile?.x === x && selectedTile?.y === y ? 'selected' : ''
                }`}
                style={{ width: tileSize, height: tileSize, position: 'relative' }}
                onClick={() => handleTileClick(x, y)}
              >
                {obj && (
                  <div className={`object ${obj}`}>
                    {OBJECTS[obj]}
                  </div>
                )}
                {playerPos && playerPos.x === x && playerPos.y === y && !obj && (
                  <div className="player">
                    🔴
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {selectedTile && (
        <div className="modal">
          <input
            autoFocus
            placeholder="Type: sand, player start, skeleton, ball..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleCommand(e.target.value);
                e.target.value = '';
              }
            }}
          />
        </div>
      )}

      <div className="examples">
        Try: sand, water, mountain, stone, player start, skeleton, ball, goal
      </div>
    </div>
  );
};

export default EditWorld;