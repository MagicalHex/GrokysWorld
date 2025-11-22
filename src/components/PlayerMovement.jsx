import React, { useState, useEffect, useRef } from 'react';

const WALKABLE_OBJECTS = new Set([
  'spiderweb','unlockeddoorobject','woodobject','rockobject','gold','angel','dove',
  'campfirebenchobject_right','campfirebenchobject_left','campfirebenchobject_bottom','campfirebenchobject_top',
  'knights-armor','dark-armor','short-sword','bow','crossbow','fireball','windball','iceball'
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
  interactionActive,
  interactionType,
  CHOPPABLE_OBJECTS,
  TALKABLE_OBJECTS,
  OPENABLE_OBJECTS,
  isDead,
  setMoveDirection,
  // tileSize = 64
}) => {
  const [canMove, setCanMove] = useState(true);
  const moveDelay = 160;

  // Shared animation state (read this from CanvasGrid via ref)
  const moveAnim = useRef({ progress: 0, direction: 'down' }).current;

  // Simple 160ms slide animation
  useEffect(() => {
    if (moveAnim.progress <= 0) return;
    const start = Date.now();
    const duration = 160;

    const tick = () => {
      const elapsed = Date.now() - start;
      moveAnim.progress = Math.max(0, 1 - elapsed / duration);
      if (moveAnim.progress > 0) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [moveAnim.progress]);

  useEffect(() => {
    const handleKey = (e) => {
      if (!canMove || !playerPos || isDead) return;

      if (interactionActive && interactionType === 'talk') {
        if (e.key === ' ') { e.preventDefault(); onExit(); }
        return;
      }

      if (onCancelInteraction) onCancelInteraction();

      let newPos = { ...playerPos };
      let dir = null;

      if (e.key === 'ArrowUp' && playerPos.y > 0)           { newPos.y -= 1; dir = 'up'; }
      else if (e.key === 'ArrowDown' && playerPos.y < rows - 1) { newPos.y += 1; dir = 'down'; }
      else if (e.key === 'ArrowLeft' && playerPos.x > 0)       { newPos.x -= 1; dir = 'left'; }
      else if (e.key === 'ArrowRight' && playerPos.x < columns - 1) { newPos.x += 1; dir = 'right'; }
      else if (e.key === ' ') { e.preventDefault(); onExit(); return; }
      else return;

      const targetKey = `${newPos.x},${newPos.y}`;
      const targetObj = objects[targetKey];

      if (restrictedTiles.has(targetKey)) return;

      const isChoppable = targetObj && CHOPPABLE_OBJECTS.has(targetObj);
      const isTalkable  = targetObj && TALKABLE_OBJECTS.has(targetObj);
      const isOpenable  = targetObj && OPENABLE_OBJECTS.has(targetObj);
      if (isChoppable || isTalkable || isOpenable) {
        onStartInteraction(targetKey);
        return;
      }

      const isWalkable = !targetObj || WALKABLE_OBJECTS.has(targetObj);
      const teleportMatch = targetObj?.match(/^(portal|rope|hole)-to-(\d+)$/);
      const isLegacyRope = targetObj === 'ropeobject';
      const isLegacyHole = targetObj === 'holeobject';

      if (!isWalkable && !teleportMatch && !isLegacyRope && !isLegacyHole) return;

      e.preventDefault();
      setCanMove(false);
      moveAnim.progress = 1;                    // start slide
      moveAnim.direction = dir || 'down';
      setMoveDirection(dir || 'down');
      onPlayerMove(newPos);

      // TELEPORT LOGIC — FULLY BACK
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
            'rope-5':   { x: 21, y: 4 },
            'rope-7':   { x: 7, y: 5 },
            'rope-8':   { x: 21, y: 14 },
          };

          const key = `${type}-${level}`;
          customSpawn = CUSTOM_SPAWNS[key] || null;
        } 
        else if (isLegacyRope) {
          level = 1;
          customSpawn = { x: 21, y: 14 };
        } 
        else if (isLegacyHole) {
          level = 5;
          customSpawn = null;
        }

        setTimeout(() => onLevelChange(level, customSpawn), 100);
      }

      setTimeout(() => setCanMove(true), moveDelay);
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [
    playerPos, canMove, isDead, interactionActive, interactionType,
    objects, restrictedTiles, rows, columns,
    onPlayerMove, onExit, onStartInteraction, onCancelInteraction, onLevelChange, setMoveDirection,
    CHOPPABLE_OBJECTS, TALKABLE_OBJECTS, OPENABLE_OBJECTS
  ]);

  return null;
};

export default PlayerMovement;