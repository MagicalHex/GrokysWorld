import React, { useState, useEffect } from 'react';

const WALKABLE_OBJECTS = new Set(['spiderweb','unlockeddoorobject', 'woodobject', 'rockobject', 'gold', 'angel', 'dove']);

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
  isDead
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
      if (e.key === 'ArrowUp'    && playerPos.y > 0)          newPos.y -= 1;
      else if (e.key === 'ArrowDown'  && playerPos.y < rows-1) newPos.y += 1;
      else if (e.key === 'ArrowLeft'  && playerPos.x > 0)       newPos.x -= 1;
      else if (e.key === 'ArrowRight' && playerPos.x < columns-1) newPos.x += 1;
      else if (e.key === ' ') { e.preventDefault(); onExit(); return; }
      else return;

      const targetKey = `${newPos.x},${newPos.y}`;
      const targetObj = objects[targetKey];

      // ---- BLOCKED? ----
      if (restrictedTiles.has(targetKey)) return;

      // ---- INTERACT (chop / talk) ----
      const isChoppable = targetObj && CHOPPABLE_OBJECTS.has(targetObj);
      const isTalkable  = targetObj && TALKABLE_OBJECTS.has(targetObj);
      if (isChoppable || isTalkable) {
        onStartInteraction(targetKey);
        return;
      }

      // ---- WALKABLE ----
      const isPortal = targetObj?.startsWith('portal-to-');
      const isHole   = targetObj === 'holeobject';
      const isRope   = targetObj === 'ropeobject';
      const isWalkable = !targetObj || WALKABLE_OBJECTS.has(targetObj);

      if (!isWalkable && !isPortal && !isHole && !isRope) return;

      setCanMove(false);
      onPlayerMove(newPos);

      // ---- PORTAL / HOLE / ROPE ----
      if (isPortal) {
        setTimeout(() => {
          const to = parseInt(targetObj.split('-to-')[1],10);
          if (to === 1) onLevelChange(to, {x:22,y:8});
          else onLevelChange(to);
        },100);
      } else if (isHole) {
        setTimeout(() => onLevelChange(5),100);
      } else if (isRope) {
        setTimeout(() => onLevelChange(1,{x:21,y:14}),100);
      }

      setTimeout(() => setCanMove(true), moveDelay);
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [
    playerPos, onPlayerMove, onExit, objects, restrictedTiles,
    rows, columns, level, onLevelChange, onStartInteraction,
    onCancelInteraction, interactionActive, canMove, CHOPPABLE_OBJECTS, TALKABLE_OBJECTS
  ]);

  return null;
};

export default PlayerMovement;