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
  'pinetreeobject',
  'lightstoneobject'
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
  onStartChop,  //Callback for chopping
  onCancelChop
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

      const isHole = targetObj === 'holeobject';
      const isRope = targetObj === 'ropeobject';
      
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

      // Inside handleKeyDown, BEFORE any move
      if (isChoppable) {
        console.log(`Starting chop on ${targetKey}`);
        if (onStartChop) onStartChop(targetKey);
        return; // ← Don't move!
      }

      // === Cancel chopping if player tries to move ===
      if (onCancelChop) {
        onCancelChop(); // ← Cancel immediately
      }

// === FINAL MOVE CHECK ===
  if (isEmpty || isPortal || isWalkableObject || isHole || isRope) {
    setCanMove(false);
    onPlayerMove(newPos);
    console.log(`Player moved to (${newPos.x}, ${newPos.y})${isPortal ? ' (PORTAL!)' : ''}${isHole ? ' (HOLE!)' : ''}`);

// === PORTAL TELEPORT (SPECIAL: portal-to-1 → (22,8)) ===
if (isPortal) {
  setTimeout(() => {
    const toLevel = parseInt(targetObj.split('-to-')[1], 10);
    if (toLevel && toLevel !== level) {
      console.log(`AUTO-PORTAL! Entering Level ${toLevel}!`);

      // SPECIAL CASE: portal-to-1 → spawn at (22, 8)
      if (toLevel === 1) {
        onLevelChange(toLevel, { x: 22, y: 8 });
      } else {
        onLevelChange(toLevel); // uses PORTAL_ENTRY_POINTS or default
      }
    }
  }, 100);
}

  // === HOLE TELEPORT ===
  if (isHole) {
    setTimeout(() => {
      console.log('FELL INTO HOLE! Entering Dungeon (Level 5)!');
      onLevelChange(5);  // ← CLEAN!
    }, 100);
  }
// === ROPE TELEPORT (Fixed spawn) ===
if (isRope) {
  setTimeout(() => {
    console.log('ROPING UP! Returning to Town (Level 1) at (21,14)');
    onLevelChange(1, { x: 21, y: 14 }); // ← FIXED SPAWN
  }, 100);
}

    // === RE-ENABLE MOVEMENT ===
    setTimeout(() => setCanMove(true), moveDelay);
  } else {
    console.log(`Blocked: Not empty/walkable/portal/hole: ${targetKey}`);
  }
};

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playerPos, onPlayerMove, onExit, objects, restrictedTiles, rows, columns, canMove, level, onLevelChange, onStartChop, onCancelChop]);

  return null;
};

export default PlayerMovement;