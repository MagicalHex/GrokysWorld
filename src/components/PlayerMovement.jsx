import React, { useState, useEffect } from 'react';

// EXCEPTION DICTIONARY — Objects you CAN walk on
const WALKABLE_OBJECTS = new Set([
  'spiderweb',
  'unlockeddoorobject'
  // Add more later: 'bridge', 'ladder', etc.
]);

// CHOPPABLE OBJECTS (check but don't walk on)
const CHOPPABLE_OBJECTS = new Set([
  'treeobject',
  'pinetreeobject'
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
  onLevelChange,
  onStartChop  // ← NEW: Callback for chopping
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

      console.log(`Attempting move to ${targetKey} (obj: ${targetObj || 'empty'})`);

      // PORTAL: always allowed
      const isPortal = targetObj && targetObj.startsWith('portal-to-');

      // WALKABLE OBJECTS: spiderweb, unlockeddoorobject, etc.
      const isWalkableObject = targetObj && WALKABLE_OBJECTS.has(targetObj);

      // EMPTY TILE
      const isEmpty = !targetObj;

      // CHOPPABLE: Start chopping instead of moving
      const isChoppable = targetObj && CHOPPABLE_OBJECTS.has(targetObj);

      if (restrictedTiles.has(targetKey)) {
        console.log(`Blocked by restrictedTiles: ${targetKey}`);
        return;
      }

      if (isChoppable) {
        console.log(`Starting chop on ${targetKey}`);
        if (onStartChop) onStartChop(targetKey); // ← Trigger chopping
        return; // ← Don't move!
      }

      // FINAL CHECK: Move if allowed
      if (isEmpty || isPortal || isWalkableObject) {
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
      } else {
        console.log(`Blocked: Not empty/walkable/portal: ${targetKey}`);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playerPos, onPlayerMove, onExit, objects, restrictedTiles, rows, columns, canMove, level, onLevelChange, onStartChop]);

  return null;
};

export default PlayerMovement;