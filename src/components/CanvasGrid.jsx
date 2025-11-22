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

// 1. AT THE TOP — Replace your old aoeRef with this (supports multiple + type)
const aoesRef = useRef([]);  // ← NOW AN ARRAY! Supports multiple AOEs

// 2. REPLACE THE ENTIRE OLD window.triggerPlayerAOE WITH THIS:
useEffect(() => {
  if (typeof window !== 'undefined') {
    window.triggerPlayerAOE = (type = 'fire') => {
      aoesRef.current.push({
        x: playerPos.x,
        y: playerPos.y,
        type,               // 'fire' | 'ice' | 'wind'
        radius: 0,
        frame: 0,
        active: true,
        speed: type === 'wind' ? 12 : 10,
        pulseFreq: type === 'ice' ? 4 : type === 'wind' ? 6 : 3.5,
        pulseIntensity: type === 'ice' ? 0.12 : type === 'wind' ? 0.22 : 0.15,
      });
    };
  }
}, [playerPos]);

const drawElementalAOE = (ctx, aoe, progress, alpha, pulse) => {
  const screen = worldToScreen(aoe.x, aoe.y);

  const config = {
    fire: {
      rings: ["rgba(255,120,20,", "rgba(255,180,40,", "rgba(255,80,0,"],
      shadow: "rgba(255,80,0,",
      core: ["rgba(255,220,100,", "rgba(255,120,20,", "rgba(255,40,0,"],
      innerCore: "rgba(255,250,200,",
      sparkles: { count: 6, color: "rgba(255,255,150,", shadow: "#ffff77" }
    },
    ice: {
      rings: ["rgba(100,200,255,", "rgba(140,220,255,", "rgba(80,180,255,"],
      shadow: "rgba(120,220,255,",
      core: ["rgba(220,240,255,", "rgba(100,200,255,", "rgba(60,140,240,"],
      innerCore: "rgba(255,255,255,",
      sparkles: { count: 9, color: "#ccffff", shadow: "#ccffff", square: true }
    },
    wind: {
      rings: ["rgba(200,210,230,", "rgba(220,230,240,", "rgba(180,200,220,"],
      shadow: "rgba(200,220,240,",
      core: ["rgba(240,245,255,", "rgba(190,210,230,", "rgba(140,160,190,"],
      innerCore: "rgba(255,255,255,",
      sparkles: { count: 12, color: "rgba(230,240,255,", shadow: "#ffffff", lines: true }
    }
  }[aoe.type];

  ctx.save();
  ctx.translate(screen.x, screen.y + tileSize * 0.85);
  ctx.transform(1, 0.1, -0.5, 2.0, 0, 0);  // ← Still untouched!

  // Outer glow rings
  config.rings.forEach((colorBase, i) => {
    const glowAlpha = alpha * (0.25 + i * 0.18);
    ctx.strokeStyle = colorBase + glowAlpha + ")";
    ctx.lineWidth = 16 - i * 3.5;
    ctx.shadowBlur = 35 + i * 20;
    ctx.shadowColor = config.shadow + glowAlpha * 0.7 + ")";
    ctx.beginPath();
    ctx.ellipse(0, 0, (aoe.radius + i * 3) * 1.05 * pulse, (aoe.radius + i * 3) * 0.28 * pulse, 0, 0, Math.PI * 2);
    ctx.stroke();
  });

  // Filled core gradient
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, aoe.radius * pulse);
  config.core.forEach((c, i) => grad.addColorStop(i * 0.5, c + alpha * (1 - i * 0.3) + ")"));
  grad.addColorStop(1, config.core[2] + "0)");
  ctx.fillStyle = grad;
  ctx.globalAlpha = alpha * 0.6;
  ctx.shadowBlur = 50;
  ctx.shadowColor = config.shadow + alpha + ")";
  ctx.beginPath();
  ctx.ellipse(0, 0, aoe.radius * 1.05 * pulse, aoe.radius * 0.28 * pulse, 0, 0, Math.PI * 2);
  ctx.fill();

  // Inner bright core
  ctx.globalAlpha = alpha;
  ctx.fillStyle = config.innerCore + alpha + ")";
  ctx.shadowBlur = 30;
  ctx.shadowColor = "#ffffff";
  ctx.beginPath();
  ctx.ellipse(0, 0, aoe.radius * 0.4 * pulse, aoe.radius * 0.15 * pulse, 0, 0, Math.PI * 2);
  ctx.fill();

  // Sparkles / particles
  ctx.globalAlpha = alpha * 0.9;
  ctx.fillStyle = config.sparkles.color + alpha + ")";
  ctx.shadowBlur = 15;
  ctx.shadowColor = config.sparkles.shadow;

  for (let s = 0; s < config.sparkles.count; s++) {
    const angle = (progress * (aoe.type === 'wind' ? 15 : 8) + s * 1.1) % (Math.PI * 2);
    const dist = aoe.radius * 0.7;
    const x = Math.cos(angle) * dist;
    const y = Math.sin(angle) * dist * 0.5;

    ctx.beginPath();
    if (config.sparkles.lines) {
      ctx.moveTo(0, 0);
      ctx.lineTo(x, y);
      ctx.lineWidth = 2;
      ctx.strokeStyle = config.sparkles.color + alpha + ")";
      ctx.stroke();
    } else if (config.sparkles.square) {
      ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
    } else {
      ctx.arc(x, y, 1.5 + Math.sin(aoe.frame * 0.25 + s) * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
};

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
  let lastTime = 0;  // ← NEW: Track time for dt
  const ctx = ctxRef.current;
  if (!ctx || !grid) return;

      // SMOOTH CAMERA STATE
let smoothCam = { x: cameraRef.current.x, y: cameraRef.current.y };
  const lerpSpeed = 8; // 0.1 = smooth, 1.0 = instant

      // Defines a render function for the animation loop.
      // Clears the entire canvas before each frame to erase previous drawings.
const render = (currentTime = 0) => {
// Calc dt (frame time in seconds)
    const dt = lastTime ? (currentTime - lastTime) / 1000 : 0.016;  // Fallback to 60fps
    lastTime = currentTime;

    // Time-based lerp: alpha = 1 - e^(-speed * dt) → consistent chase speed
    const target = cameraRef.current;
    const alpha = 1 - Math.exp(-lerpSpeed * dt);  // Exponential smoothing magic
    smoothCam.x += (target.x - smoothCam.x) * alpha;
    smoothCam.y += (target.y - smoothCam.y) * alpha;

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
// —————— ELEMENTAL AOE EFFECTS (ALL TYPES) ——————
aoesRef.current = aoesRef.current.filter(aoe => {
  if (!aoe.active) return false;

  aoe.radius += aoe.speed;
  aoe.frame++;

  if (aoe.frame < 42) {
    const progress = aoe.frame / 42;
    const alpha = 1 - progress;
    const pulse = 1 + Math.sin(progress * Math.PI * aoe.pulseFreq) * aoe.pulseIntensity;

    drawElementalAOE(ctx, aoe, progress, alpha, pulse);
    return true;
  } else {
    return false; // auto-remove when done
  }
});

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