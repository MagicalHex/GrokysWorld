// src/components/CanvasGrid.jsx — SEAMLESS + CENTERED + EMOJIS
import React, { useRef, useEffect, useCallback } from 'react';

const CanvasGrid = React.memo(({ 
  grid, objects, playerPos, tileSize, columns, rows,
}) => {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);

  const worldToScreen = useCallback((x, y) => {
    const isoW = tileSize * 0.7071; // Perfect 45° isometric
    const isoH = tileSize * 0.3536; // Half height
    return {
      x: (x - y) * isoW,
      y: (x + y) * isoH
    };
  }, [tileSize]);

  // PERFECT CANVAS SIZING + CENTERING
useEffect(() => {
  const canvas = canvasRef.current;
  if (!canvas) return;

  // FULL SCREEN COVERAGE — tiles will fill this exactly
  canvas.width = window.innerWidth * 0.95;   // 95% of viewport width
  canvas.height = window.innerHeight * 0.75; // 75% of viewport height

  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctxRef.current = ctx;
}, []); // Only once!

useEffect(() => {
  let raf;
  const ctx = ctxRef.current;
  if (!ctx || !grid) return;

  const render = () => {
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    const centerX = canvasRef.current.width / 2;
    const centerY = canvasRef.current.height / 2;

    ctx.save();
    ctx.translate(centerX, centerY);
    
    // Perfect vertical positioning for isometric
ctx.translate(0, -canvasRef.current.height * 0.7);  // ← try 0.35 → 0.42

    // === KEY: Calculate EXACTLY how many tiles fit screen ===
    const isoW = tileSize * 0.7071;
    const isoH = tileSize * 0.3536;
    
    // How many tiles fit horizontally/vertically in screen space
    const tilesAcross = Math.ceil(canvasRef.current.width / isoW) + 2;
    const tilesDown = Math.ceil(canvasRef.current.height / isoH) + 2;

    // Player-centered viewport bounds
    const playerX = playerPos?.x ?? columns / 2;
    const playerY = playerPos?.y ?? rows / 2;

    const startX = Math.max(0, Math.floor(playerX - tilesAcross / 2));
    const endX = Math.min(columns - 1, Math.floor(playerX + tilesAcross / 2));
    const startY = Math.max(0, Math.floor(playerY - tilesDown / 2));
    const endY = Math.min(rows - 1, Math.floor(playerY + tilesDown / 2));

    // Collect + depth sort ONLY visible tiles
    const tiles = [];
    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        const screen = worldToScreen(x, y);
        tiles.push({ x, y, screen, depth: x + y });
      }
    }
    tiles.sort((a, b) => a.depth - b.depth);

    // === RENDER TILES (fills canvas perfectly!) ===
    tiles.forEach(({ screen, x, y }) => {
      const terrain = grid[y]?.[x] || 'grass';

      if (terrain === 'grass') {
        ctx.save();
        ctx.translate(screen.x, screen.y + tileSize * 0.1);
        
        // Your perfect diamond tile
        ctx.fillStyle = '#2E8B57';
        ctx.beginPath();
        ctx.moveTo(0, tileSize * 0.3);
        ctx.lineTo(tileSize * 0.5, 0);
        ctx.lineTo(tileSize, tileSize * 0.3);
        ctx.lineTo(tileSize * 0.5, tileSize * 0.6);
        ctx.closePath();
        ctx.fill();
        
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
        
        ctx.restore();

        // REAL EMOJIS (not text!)
        ctx.font = `${tileSize * 0.5}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🌱', screen.x + tileSize * 0.25, screen.y + tileSize * 0.1);
        ctx.fillText('🌿', screen.x + tileSize * 0.75, screen.y + tileSize * 0.15);
      }

      // Objects
      const objKey = `${x},${y}`;
      const obj = objects?.[objKey];
      if (obj) {
        ctx.save();
        const height = obj === 'treeobject' ? 2.2 : 1.2;
        ctx.translate(screen.x + tileSize/2, screen.y + tileSize/2 - (height * tileSize * 0.3));
        
        ctx.font = `${tileSize}px 'Segoe UI Emoji', Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const emojiMap = {
          bricks: '🧱',
          treeobject: '🌲',
          spider: '🕷️',
          farmer001: '👨‍🌾'
        };
        ctx.fillText(emojiMap[obj] || '❓', 0, 0);
        ctx.restore();
      }
    });

    ctx.restore();

    // Player (always centered, top layer)
    if (playerPos) {
      const pScreen = worldToScreen(playerPos.x, playerPos.y);
      ctx.save();
      ctx.translate(centerX + pScreen.x + tileSize/2, 
                    centerY + pScreen.y + tileSize/2 - tileSize * 0.6 - canvasRef.current.height * 0.25);
      
      ctx.font = `${tileSize * 1.2}px 'Segoe UI Emoji', Arial, sans-serif`;
      ctx.shadowColor = '#FF69B4';
      ctx.shadowBlur = 15;
      ctx.shadowOffsetY = 0;
      ctx.fillText('🧑', 0, 0);
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    raf = requestAnimationFrame(render);
  };

  render();
  return () => cancelAnimationFrame(raf);
}, [grid, objects, playerPos, tileSize, columns, rows, worldToScreen]);

  return (
    <canvas
      ref={canvasRef}
      className="play-canvas"
      style={{
        width: '100%',
        height: '80vh',
        maxWidth: '1200px',
        display: 'block',
        margin: '0 auto',
        background: 'linear-gradient(180deg, #87CEEB 0%, #E0F6FF 50%, #98FB98 100%)'
      }}
    />
  );
});

export default CanvasGrid;