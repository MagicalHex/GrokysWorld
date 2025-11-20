import React, { useState, useRef, useEffect, memo, useMemo } from 'react';
import { useIsoProjection } from '../hooks/useIsoProjection';
import { isMonster, getMonsterData } from '../utils/monsterRegistry'; // ← ADD THIS

const CanvasGrid = memo(
  ({
    grid,
    objects,
    currentLevel,
    background,
    playerPos,
    tileSize,
    columns,
    rows,
    monsterTypes,
    monsterData,
    globalMonsterHealths,
    pickupPopups,
    popups,
    removePickupPopup,
    setPopups,
    droppedItems,
    activeQuests,
    globalInventory,
    NPC_NAMES,
    getQuestMarker,
    camera,
  }) => {
    const canvasRef = useRef(null);
    const ctxRef = useRef(null);
          // const cameraRef = useRef(camera);
const cameraRef = useRef({ x: 0, y: 0 }); // ← FIXED: empty initial
    const { worldToScreen, worldToScreen3D, isoW, isoH } =
      useIsoProjection(tileSize);

// Sync ref with latest camera
useEffect(() => {
  cameraRef.current = camera;
}, [camera]);

useEffect(() => {
  if (!camera) return;

  console.log('CAMERA CHANGED:', {
    x: camera.x,
    y: camera.y,
    source: 'useEffect'
  });
}, [camera]);

// At top with other refs
const aoeRef = useRef({
  active: false,
  x: 0,
  y: 0,
  frame: 0,
  radius: 0
});

// Expose trigger via ref so CombatSystem can call it
useEffect(() => {
  if (typeof window !== 'undefined') {
    window.triggerPlayerAOE = () => {
      aoeRef.current = {
        active: true,
        x: playerPos.x,  // or smoothCam.x
        y: playerPos.y,
        frame: 0,
        radius: 20
      };
    };
  }
}, [playerPos]);

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
      let lastLog = 0; // For log
      let raf;
      const ctx = ctxRef.current;
      if (!ctx || !grid) return;

      // SMOOTH CAMERA STATE
  let smoothCam = { x: cameraRef.current.x, y: cameraRef.current.y };
  const lerpFactor = 0.1; // 0.1 = smooth, 1.0 = instant

      // Defines a render function for the animation loop.
      // Clears the entire canvas before each frame to erase previous drawings.
      const render = () => {
        // Update smooth camera
    const target = cameraRef.current;
    smoothCam.x += (target.x - smoothCam.x) * lerpFactor;
    smoothCam.y += (target.y - smoothCam.y) * lerpFactor;

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
// USE SMOOTHED CAMERA
    const camScreen = worldToScreen(smoothCam.x, smoothCam.y);
    ctx.translate(-camScreen.x, -camScreen.y);  // Offset: player renders at screen center


        // Gets player position, defaulting to grid center if playerPos is null/undefined
        //  (using optional chaining ?. and nullish coalescing ??).
        // const playerX = playerPos?.x ?? columns / 2;
        // const playerY = playerPos?.y ?? rows / 2;
const playerX = smoothCam.x;
    const playerY = smoothCam.y;

        // Computes the visible grid bounds centered on the player.
        // Clamps to grid edges (0 to columns-1, etc.) to avoid out-of-bounds.
        // Uses Math.floor for integer coords.
        const startX = Math.max(0, Math.floor(playerX - tilesAcross / 2));
        const endX = Math.min(columns - 1, Math.floor(playerX + tilesAcross / 2));
        const startY = Math.max(0, Math.floor(playerY - tilesDown / 2));
        const endY = Math.min(rows - 1, Math.floor(playerY + tilesDown / 2));

// THROTTLED LOGS
    // const now = performance.now();
    // if (now - lastLog > 5000) {
    //   console.log('=== RENDER FRAME ===');
    //   console.log('playerPos:', playerPos);
    //   console.log('camera (target):', target);
    //   console.log('smoothCam:', { x: smoothCam.x.toFixed(2), y: smoothCam.y.toFixed(2) });
    //   console.log('camScreen:', camScreen);
    //   console.log('canvas size:', canvasRef.current.width, 'x', canvasRef.current.height);
    //   console.log('tilesAcross/Down:', tilesAcross, tilesDown);
    //   console.log('cull bounds:', { startX, endX, startY, endY });
    //   console.log('===================');
    //   lastLog = now;
    // }
    

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
// 🔥 OPTIMIZED: SINGLE LOOP - Grass OR Stone (no duplicates!)
groundTiles.forEach(({ screen, x, y }) => {
  const terrain = grid[y]?.[x] || 'grass';

  ctx.save();
  ctx.translate(screen.x, screen.y + tileSize);

  // ────── VIGNETTE (shared) ──────
  const distFromCenterX = Math.abs(x - playerX);
  const distFromCenterY = Math.abs(y - playerY);
  const distFromCenter = Math.sqrt(distFromCenterX ** 2 + distFromCenterY ** 2);
  const maxDist = tilesAcross / 2 * 0.98;
  let t = Math.max(0, 1 - distFromCenter / maxDist);
  const fade = t * t * (3 - 2 * t);

  // ────── GRASS ──────
  if (terrain === 'grass') {
    // Base layer
    ctx.fillStyle = `rgba(46, 139, 87, ${fade * 0.8})`;
    ctx.beginPath();
    ctx.moveTo(0, tileSize * 0.3);
    ctx.lineTo(tileSize * 0.5, 0);
    ctx.lineTo(tileSize, tileSize * 0.3);
    ctx.lineTo(tileSize * 0.5, tileSize * 0.6);
    ctx.closePath();
    ctx.fill();

    // Top layer
    const topAlpha = Math.min(1, fade * 1.1);
    ctx.fillStyle = `rgba(50, 205, 50, ${topAlpha})`;
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
  }
  // ────── SIMPLIFIED STONE (2 layers → PERFECT!) ──────
  else if (terrain === 'stonefloor') {
    // Base layer (dark gray)
    ctx.fillStyle = `rgba(64, 64, 68, ${fade * 0.9})`;
    ctx.beginPath();
    ctx.moveTo(0, tileSize * 0.3);
    ctx.lineTo(tileSize * 0.5, 0);
    ctx.lineTo(tileSize, tileSize * 0.3);
    ctx.lineTo(tileSize * 0.5, tileSize * 0.6);
    ctx.closePath();
    ctx.fill();

    // SINGLE highlight layer (no cracks - 60% faster!)
    const topAlpha = Math.min(1, fade * 1.1);
    ctx.fillStyle = `rgba(105, 105, 110, ${topAlpha * 0.7})`;  // Lighter gray
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
  }

  ctx.restore();
});
// ——— ISOMETRIC AOE RING (PLAYER) ———
// ——— EPIC ISOMETRIC AOE RING (PLAYER) ———
// ——— FLATTER ISOMETRIC AOE RING (PLAYER) ——— v2: Laying Down Edition
if (aoeRef.current.active) {
  const aoe = aoeRef.current;
  const screen = worldToScreen(aoe.x, aoe.y);

  aoe.radius += 11;  // ← Slightly slower for tighter fit
  aoe.frame++;

  if (aoe.frame < 42) {  // ← +2 frames for smoother fade
    const progress = aoe.frame / 42;
    const alpha = 1 - progress;
    const pulse = 1 + Math.sin(progress * Math.PI * 3.5) * 0.15;  // Subtle pulse

    ctx.save();
    
    // 🔥 KEY FIX #1: Match EXACT tile Y-offset for "ground level"
    ctx.translate(screen.x, screen.y + tileSize * 0.85);  // ← 0.85 = lays flatter (tune 0.8-1.0)
    
    // 🔥 KEY FIX #2: Gentler isometric shear (less diagonal raise)
ctx.transform(1, 0.1, -0.5, 2.0, 0, 0);  // ← positive X-skew = correct orientation  // ← Reduced skewY/skewX for flatter angle

    // 🌟 GLOW LAYERS: 3 rings (thinner for flat look)
    for (let i = 0; i < 3; i++) {
      const glowAlpha = alpha * (0.25 + i * 0.18);
      const glowOffset = i * 2.5;
      const glowWidth = 16 - i * 3.5;

      ctx.strokeStyle = `rgba(255, 120, 20, ${glowAlpha})`;  // Warmer orange
      ctx.lineWidth = glowWidth;
      ctx.shadowBlur = 35 + i * 18;  // Softer glow
      ctx.shadowColor = `rgba(255, 100, 0, ${glowAlpha * 0.7})`;

      ctx.beginPath();
      // 🔥 KEY FIX #3: Much flatter ellipse (0.28 height = hugs ground)
      ctx.ellipse(0, 0, (aoe.radius + glowOffset) * 1.05 * pulse, (aoe.radius + glowOffset) * 0.28 * pulse, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 💫 FLAT INNER GLOW (no raise)
    ctx.globalAlpha = alpha * 0.35;
    ctx.fillStyle = `rgba(255, 160, 40, 0.5)`;
    ctx.shadowBlur = 25;
    ctx.shadowColor = '#ff8800';
    ctx.beginPath();
    ctx.ellipse(0, 0, aoe.radius * 0.55 * pulse, aoe.radius * 0.22 * pulse, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // ✨ MICRO-SPARKLES (flat orbit)
    ctx.fillStyle = `rgba(255, 255, 150, ${alpha * 0.9})`;
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#ffff77';
    for (let s = 0; s < 6; s++) {
      const sparkleAngle = (progress * 8 + s * 1.1) % (Math.PI * 2);
      const sparkleDist = aoe.radius * 0.65;
      const sx = Math.cos(sparkleAngle) * sparkleDist;
      const sy = Math.sin(sparkleAngle) * sparkleDist * 0.5;  // ← Flatter orbit
      ctx.beginPath();
      ctx.arc(sx, sy, 1.5 + Math.sin(aoe.frame * 0.25 + s) * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  } else {
    aoeRef.current.active = false;
  }
}

    ctx.restore();
    raf = requestAnimationFrame(render);
  };

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
      // camera
      globalMonsterHealths,  // ← ADDED: HP updates NOW
  monsterData,           // ← ADDED: images/data
  monsterTypes
    ]);

    return (
      <div style={{ position: 'relative', width: '100%', height: '85vh' }}>
        {/* ---------- CANVAS ---------- */}
  <canvas
    ref={canvasRef}
    className="play-canvas"
    style={{
      width: '100%',
      height: '85vh',
      maxWidth: '1200px',
      display: 'block',
      margin: '0 auto',
      // dynamic background
background: `
          linear-gradient(to top, black 0%, rgba(0,0,0,0.8) 30%, rgba(0,0,0,0.4) 50%, transparent 70%),
          url('/ownemojis/${background}') center / cover no-repeat
        `.trim()
    }}
  />

  </div>
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