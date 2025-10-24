import React, { useState, useEffect } from 'react';

// EXCEPTION DICTIONARY — Objects you CAN walk on
const WALKABLE_OBJECTS = new Set([
  'spiderweb',
  'unlockeddoorobject'
  // Add more later: 'bridge', 'ladder', etc.
]);

const PlayerMovement = ({
  playerPos,
  onPlayerMove,
  onExit,
  objects,
  restrictedTiles,
  rows,
  columns,
  level,
  onLevelChange
}) => {
  const [canMove, setCanMove] = useState(true);
  const moveDelay = 300;

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!canMove || !playerPos) return;

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

      const targetKey = `${newPos.x},${newPos.y}`;
      const targetObj = objects[targetKey];

      // PORTAL: always allowed
      const isPortal = targetObj && targetObj.startsWith('portal-to-');

      // WALKABLE OBJECTS: spiderweb, unlockeddoorobject, etc.
      const isWalkableObject = targetObj && WALKABLE_OBJECTS.has(targetObj);

      // EMPTY TILE
      const isEmpty = !targetObj;

      // FINAL CHECK: Can move if:
      // - Not restricted
      // - AND (empty OR portal OR walkable object)
      if (
        !restrictedTiles.has(targetKey) &&
        (isEmpty || isPortal || isWalkableObject)
      ) {
        setCanMove(false);
        onPlayerMove(newPos);
        console.log(`Player moved to (${newPos.x}, ${newPos.y})${isPortal ? ' (PORTAL!)' : ''}`);

        // AUTO-TELEPORT
        if (isPortal) {
          setTimeout(() => {
            const toLevel = parseInt(targetObj.split('-to-')[1], 10);
            if (toLevel && toLevel !== level) {
              console.log(`AUTO-PORTAL! Entering Level ${toLevel}!`);
              onLevelChange(toLevel);
            }
          }, 100);
        }

        setTimeout(() => setCanMove(true), moveDelay);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playerPos, onPlayerMove, onExit, objects, restrictedTiles, rows, columns, canMove, level, onLevelChange]);

  return null;
};

export default PlayerMovement;