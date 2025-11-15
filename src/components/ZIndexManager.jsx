// ZIndexManager.jsx — CLEAN PRODUCTION VERSION
import React, { memo, useRef, useEffect } from 'react';
import { isMonster } from '../utils/monsterRegistry';

const ZIndexManager = memo(({ 
  playerPos, objects, monsterTypes, camera, tileSize, columns, rows, 
  children, objectTypes
}) => {
  const containerRef = useRef(null);

  useEffect(() => {
    let raf;

    const update = () => {
      const container = containerRef.current;
      if (!container || !playerPos) {
        raf = requestAnimationFrame(update);
        return;
      }

      // CULLING
      const tilesAcross = Math.ceil(window.innerWidth / tileSize) + 4;
      const tilesDown = Math.ceil(window.innerHeight / tileSize) + 4;
      const startX = Math.max(0, Math.floor(camera.x - tilesAcross / 2));
      const endX = Math.min(columns - 1, Math.floor(camera.x + tilesAcross / 2));
      const startY = Math.max(0, Math.floor(camera.y - tilesDown / 2));
      const endY = Math.min(rows - 1, Math.floor(camera.y + tilesDown / 2));

      const entities = [];

      // PLAYER
      let playerEl = container.querySelector('.player-layer') || container.querySelector('.player-container');
      if (playerEl) {
        const depth = playerPos.x + playerPos.y;
        entities.push({ el: playerEl, depth, id: 'PLAYER' });
      }

      // MONSTERS
      Object.entries(objects).forEach(([key, objId]) => {
        const [xStr, yStr] = key.split(',');
        const x = Number(xStr), y = Number(yStr);
        if (x < startX || x > endX || y < startY || y > endY) return;

        const type = monsterTypes[objId];
        if (!type || !isMonster(type)) return;

        const el = container.querySelector(`[data-monster="${objId}"]`);
        if (el) {
          const depth = x + y;
          entities.push({ el, depth, id: objId });
        }
      });

      // 🔥 STATIC OBJECTS (trees, walls, houses)
      Object.entries(objects).forEach(([key, objId]) => {
        const [xStr, yStr] = key.split(',');
        const x = Number(xStr), y = Number(yStr);

        if (x < startX || x > endX || y < startY || y > endY) return;

        // 🔥 ANY NON-MONSTER = Static object (tree/wall)
        const type = objectTypes[objId];  // NEW: objectTypes prop
        if (!isMonster(monsterTypes[objId])) {  // Tree/wall
          const el = container.querySelector(`[data-object="${key}"]`);  // 'x,y' key
          if (el) {
            const depth = x + y;  // + height offset if needed
            entities.push({ el, depth, id: `OBJ_${key}` });
          }
        }
      });

      // SORT & APPLY Z-INDEX (60fps butter)
      entities.sort((a, b) => a.depth - b.depth);
      entities.forEach((ent, i) => {
        ent.el.style.zIndex = String(Math.floor(ent.depth * 100) + i);
      });

      raf = requestAnimationFrame(update);
    };

    update();
    return () => cancelAnimationFrame(raf);
  }, [playerPos, objects, monsterTypes, camera, tileSize, columns, rows]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        // outline: '2px solid red', // ← REMOVE DEBUG
      }}
    >
      {children}
    </div>
  );
});

export default ZIndexManager;