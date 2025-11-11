import React, { useRef, useEffect, memo } from 'react';
import { useIsoProjection } from '../hooks/useIsoProjection';

const CanvasGrid = memo(
  ({
    grid,
    objects,
    playerPos,
    tileSize,
    columns,
    rows,
    camera
  }) => {
    const canvasRef = useRef(null);
    const ctxRef = useRef(null);
    const { worldToScreen, worldToScreen3D, isoW, isoH } =
      useIsoProjection(tileSize);

    // ---- canvas resize (run once) ----
    // Gets the canvas DOM element from the ref.
    // Early return if canvas isn't available (e.g., component not mounted yet).
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      // Gets the 2D rendering context (ctx) for drawing.
      // Disables image smoothing for pixel-art style (sharp edges, no blurring).
      // Stores ctx in the ref for use in other effects.
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctxRef.current = ctx;
    }, []);

    // Another useEffect, but with dependencies (listed at the end). Runs when any dep changes.
    // Declares raf to hold the requestAnimationFrame ID.
    // Gets ctx from ref.
    useEffect(() => {
      let raf;
      const ctx = ctxRef.current;
      if (!ctx || !grid) return;

      // Defines a render function for the animation loop.
      // Clears the entire canvas before each frame to erase previous drawings.
      const render = () => {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

        // Calculates the canvas center. Used for translating the context to center the view on the player.
        const centerX = canvasRef.current.width / 2;
        const centerY = canvasRef.current.height / 2;

                // isoW and isoH are from the projection hook (width/height steps in iso view).
        // This is for culling: Only draw visible tiles to optimize performance.
        // Calculate viewport size FIRST
const tilesAcross = Math.ceil(canvasRef.current.width / tileSize) + 2;
  const tilesDown = Math.ceil(canvasRef.current.height / tileSize) + 2;

        // ctx.save(): Saves the current context state (transformations, styles) to restore later.
        // Translates the origin to the canvas center.
        ctx.save();
        ctx.translate(centerX, centerY);

        // Translate opposite player/camera (world moves)**
        const camScreen = worldToScreen(camera.x, camera.y);
        ctx.translate(-camScreen.x, -camScreen.y);  // Offset: player renders at screen center


        // Gets player position, defaulting to grid center if playerPos is null/undefined
        //  (using optional chaining ?. and nullish coalescing ??).
        // const playerX = playerPos?.x ?? columns / 2;
        // const playerY = playerPos?.y ?? rows / 2;
const playerX = camera.x;  // Use camera.x/y
const playerY = camera.y;

        // Computes the visible grid bounds centered on the player.
        // Clamps to grid edges (0 to columns-1, etc.) to avoid out-of-bounds.
        // Uses Math.floor for integer coords.
        const startX = Math.max(0, Math.floor(playerX - tilesAcross / 2));
        const endX = Math.min(columns - 1, Math.floor(playerX + tilesAcross / 2));
        const startY = Math.max(0, Math.floor(playerY - tilesDown / 2));
        const endY = Math.min(rows - 1, Math.floor(playerY + tilesDown / 2));

        // **DIAGNOSTIC LOGS - REMOVE LATER**
console.log('=== RENDER FRAME ===');
console.log('playerPos:', playerPos);
console.log('camera:', camera);
console.log('camScreen:', camScreen);
console.log('canvas size:', canvasRef.current.width, 'x', canvasRef.current.height);
console.log('isoW/isoH:', isoW, isoH);
console.log('tilesAcross/Down:', tilesAcross, tilesDown);
console.log('cull bounds:', {startX, endX, startY, endY});
console.log('===================');

        // Collects visible tiles into an array.
        // For each (x,y), computes screen position with worldToScreen.
        // Adds a depth: x + y for sorting (in isometric, draw back-to-front based on depth).
        // Sorts the array by depth (ascending) to ensure correct draw order (farthest first).
        const groundTiles = [];
        for (let y = startY; y <= endY; y++) {
          for (let x = startX; x <= endX; x++) {
            const screen = worldToScreen(x, y);
            groundTiles.push({ x, y, screen, depth: x + y });
          }
        }
        groundTiles.sort((a, b) => a.depth - b.depth);

        // ---- draw grass
        // Loops over sorted tiles.
        // Gets terrain type from grid (defaults to 'grass' if missing).
        // Skips if not 'grass'
        groundTiles.forEach(({ screen, x, y }) => {
          const terrain = grid[y]?.[x] || 'grass';
          if (terrain !== 'grass') return;

          // Saves context.
          // Translates to the tile's screen position, plus tileSize vertically 
          // (likely to align the diamond shape properly; the grass is drawn as a diamond/iso tile).
          ctx.save();
          ctx.translate(screen.x, screen.y + tileSize);

          // Draws a path for the base layer of the grass tile (a diamond-like shape).
          ctx.fillStyle = '#2E8B57';
          ctx.beginPath();
          ctx.moveTo(0, tileSize * 0.3);
          ctx.lineTo(tileSize * 0.5, 0);
          ctx.lineTo(tileSize, tileSize * 0.3);
          ctx.lineTo(tileSize * 0.5, tileSize * 0.6);
          ctx.closePath();
          ctx.fill();

          // Draws a more complex path (octagon-like) for the top layer, adding texture/detail to the grass.
          ctx.fillStyle = '#32CD32';
          ctx.beginPath();
          ctx.moveTo(0, tileSize * 0.3);
          ctx.lineTo(tileSize * 0.25, tileSize * 0.15);
          ctx.lineTo(tileSize * 0.5, 0);
          ctx.lineTo(tileSize * 0.75, tileSize * 0.15);
          ctx.lineTo(tileSize, tileSize * 0.3);
          ctx.lineTo(tileSize * 0.75, tileSize * 0.45);
          ctx.lineTo(tileSize * 0.5, tileSize * 0.6);
          ctx.lineTo(tileSize * 0.25, tileSize * 0.45);
          ctx.closePath();
          ctx.fill();

          // Restores the context (undoes the translate for this tile).
          ctx.restore();
        });

//         Restores the main context (undoes the center translate).
// Schedules the next frame with requestAnimationFrame, creating a loop (~60 FPS).
        ctx.restore();
        raf = requestAnimationFrame(render);
      };
// Starts the loop immediately.
// Cleanup: Cancels the animation frame on unmount or deps change.
      render();
      return () => cancelAnimationFrame(raf);
    }, [
      grid,
      objects,
      playerPos,
      tileSize,
      columns,
      rows,
      worldToScreen,
      worldToScreen3D,
      isoW,
      isoH,
    ]);

    return (
      <canvas
        ref={canvasRef}
        className="play-canvas"
        style={{
          width: '100%',
          height: '85vh',
          maxWidth: '1200px',
          display: 'block',
          margin: '0 auto',
          background:
            'linear-gradient(180deg, #87CEEB 0%, #E0F6FF 50%, #98FB98 100%)',
        }}
      />
    );
  }
);

export default CanvasGrid;

//
// const objList = [];
// Object.entries(objects).forEach(([key, objData]) => {
//   const [yStr, xStr] = key.split(',');
//   const x = Number(xStr);
//   const y = Number(yStr);
//   if (x < startX || x > endX || y < startY || y > endY) return;

//   const baseScreen = worldToScreen(x, y);

//   // Normalize objType: string or obj.type
//   const objType = typeof objData === 'string' ? objData : objData.type;

//   // Old height logic: tree = 2.2, else 1.2
//   const height = objType === 'treeobject' ? 2.2 : 1.2;

//   objList.push({ x, y, objType, height, baseScreen, depth: x + y + height });
// });
// objList.sort((a, b) => a.depth - b.depth);

// // ---- RENDER EMOJIS (EXACTLY like your old working version) ----
// objList.forEach(({ baseScreen, objType, height }) => {
//   const emojiMap = {
//     bricks: '🧱',
//     treeobject: '🌲',
//     spider: '🕷️',
//     farmer001: '👨‍🌾'
//   };
//   const emoji = emojiMap[objType] || 'unknown';

//   ctx.save();
//   ctx.translate(
//     baseScreen.x + tileSize / 2,
//     baseScreen.y + tileSize / 2 - height * tileSize * 0.3
//   );

//   ctx.font = `${tileSize}px 'Segoe UI Emoji', Arial, sans-serif`;
//   ctx.textAlign = 'center';
//   ctx.textBaseline = 'middle';

//   ctx.fillText(emoji, 0, 0);
//   ctx.restore();
// });

      // Objects
          // Collect + depth sort ONLY visible tiles
    // const tiles = [];
    // for (let y = startY; y <= endY; y++) {
    //   for (let x = startX; x <= endX; x++) {
    //     const screen = worldToScreen(x, y);
    //     tiles.push({ x, y, screen, depth: x + y });
    //   }
    // }
    // tiles.sort((a, b) => a.depth - b.depth);

    // // === RENDER TILES ===
    // tiles.forEach(({ screen, x, y }) => {
    //   const terrain = grid[y]?.[x] || 'grass';
      // const objKey = `${x},${y}`;
      // const obj = objects?.[objKey];
      // if (obj) {
      //   ctx.save();
      //   const height = obj === 'treeobject' ? 2.2 : 1.2;
      //   // Objects positioning
      //   ctx.translate(screen.x + tileSize/2, screen.y + tileSize/2 - (height * tileSize * 0.3));
        
      //   ctx.font = `${tileSize}px 'Segoe UI Emoji', Arial, sans-serif`;
      //   ctx.textAlign = 'center';
      //   ctx.textBaseline = 'middle';
        
      //   const emojiMap = {
      //     bricks: '🧱',
      //     treeobject: '🌲',
      //     spider: '🕷️',
      //     farmer001: '👨‍🌾'
      //   };
      //   ctx.fillText(emojiMap[obj] || '❓', 0, 0);
      //   ctx.restore();
      // }
      // });

    // Player (always centered, top layer)
    // if (playerPos) {
    //   const pScreen = worldToScreen(playerPos.x, playerPos.y);
    //   ctx.save();
    //   ctx.translate(centerX + pScreen.x + tileSize/2, 
    //                 centerY + pScreen.y + tileSize/2 - tileSize * 0.6 - canvasRef.current.height * 0.25);
      
    //   ctx.font = `${tileSize * 1.2}px 'Segoe UI Emoji', Arial, sans-serif`;
    //   ctx.shadowColor = '#FF69B4';
    //   ctx.shadowBlur = 15;
    //   ctx.shadowOffsetY = 0;
    //   ctx.fillText('🧑', 0, 0);
    //   ctx.shadowBlur = 0;
    //   ctx.restore();
    // }