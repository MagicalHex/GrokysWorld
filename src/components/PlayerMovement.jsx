import React, { useState, useEffect } from 'react';

const WALKABLE_OBJECTS = new Set(['spiderweb','unlockeddoorobject', 'woodobject', 'rockobject', 'gold', 'angel', 'dove',
  'campfirebenchobject_right', 'campfirebenchobject_left', 'campfirebenchobject_bottom', 'campfirebenchobject_top'
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
  onStartInteraction,
  onCancelInteraction,
  interactionActive,        // <-- lock flag
  interactionType,   // NEW: 'chop' | 'talk' | null
  CHOPPABLE_OBJECTS,
  TALKABLE_OBJECTS,
  OPENABLE_OBJECTS,
  isDead,
  setMoveDirection
}) => {
  const [canMove, setCanMove] = useState(true);
  const moveDelay = 300;

  useEffect(() => {
    const handleKey = (e) => {
      if (!canMove || !playerPos || isDead) return;

      // LOG LOCK STATE
      console.log('[PlayerMovement] active:', interactionActive, 'type:', interactionType);
      if (e.code === 'ControlRight') {
        // Allow Right Ctrl to pass through to PlayerInventory
        return;
      }
      // === TALKING: FULL LOCK (except SPACE) ===
      if (interactionActive && interactionType === 'talk') {
        if (e.key === ' ') {
          e.preventDefault();
          onExit();
        }
        return; // ← NO cancel, NO move
      }

      // ---- TRY TO MOVE → cancel any pending interaction first ----
      if (onCancelInteraction) onCancelInteraction();

let newPos = { ...playerPos };
let direction = null;  // ← track direction, pass it to PlayMode to render movement smoothly

if (e.key === 'ArrowUp'    && playerPos.y > 0)          { newPos.y -= 1; direction = 'up'; }
else if (e.key === 'ArrowDown'  && playerPos.y < rows-1) { newPos.y += 1; direction = 'down'; }
else if (e.key === 'ArrowLeft'  && playerPos.x > 0)       { newPos.x -= 1; direction = 'left'; }
else if (e.key === 'ArrowRight' && playerPos.x < columns-1) { newPos.x += 1; direction = 'right'; }
else if (e.key === ' ') { e.preventDefault(); onExit(); return; }
else return;

      const targetKey = `${newPos.x},${newPos.y}`;
      const targetObj = objects[targetKey];

      // ---- BLOCKED? ----
      if (restrictedTiles.has(targetKey)) return;

      // ---- INTERACT (chop / talk) ----
      const isChoppable = targetObj && CHOPPABLE_OBJECTS.has(targetObj);
      const isTalkable  = targetObj && TALKABLE_OBJECTS.has(targetObj);
      const isOpenable = targetObj && OPENABLE_OBJECTS.has(targetObj);
      if (isChoppable || isTalkable || isOpenable) {
        onStartInteraction(targetKey);
        return;
      }

      // ---- WALKABLE ----
      const isWalkable = !targetObj || WALKABLE_OBJECTS.has(targetObj);
      const teleportMatch = targetObj?.match(/^(portal|rope|hole)-to-(\d+)$/);
      const isLegacyRope = targetObj === 'ropeobject';
      const isLegacyHole = targetObj === 'holeobject';

      if (!isWalkable && !teleportMatch && !isLegacyRope && !isLegacyHole) return;

      setCanMove(false);
      onPlayerMove(newPos);

if (direction) {
  console.log('SETTING DIRECTION:', direction);  // ← ADD THIS
  setMoveDirection(direction);
}

      // === TELEPORT LOGIC ===
      if (teleportMatch || isLegacyRope || isLegacyHole) {
        let level;
        let customSpawn = null;

        if (teleportMatch) {
          const [, type, levelStr] = teleportMatch;
          level = parseInt(levelStr, 10);

          const CUSTOM_SPAWNS = {
            'portal-1': { x: 22, y: 8 },
            'rope-1':   { x: 22, y: 14 },
            'rope-2':   { x: 7, y: 13 },
            'rope-3':   { x: 22, y: 15 },
          };

          const key = `${type}-${level}`;
          customSpawn = CUSTOM_SPAWNS[key] || null;
        } 
        // FALLBACKS, SHOULD NOT BE USED
        else if (isLegacyRope) {
          level = 1;
          customSpawn = { x: 21, y: 14 };
        } 
        else if (isLegacyHole) {
          level = 5;
          customSpawn = null;  // use default
        }

        setTimeout(() => onLevelChange(level, customSpawn), 100);
      }

      setTimeout(() => setCanMove(true), moveDelay);
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [
    playerPos, onPlayerMove, onExit, objects, restrictedTiles,
    rows, columns, level, onLevelChange, onStartInteraction,
    onCancelInteraction, interactionActive, canMove, CHOPPABLE_OBJECTS, TALKABLE_OBJECTS, OPENABLE_OBJECTS, setMoveDirection
  ]);

  return null;
};

export default PlayerMovement;