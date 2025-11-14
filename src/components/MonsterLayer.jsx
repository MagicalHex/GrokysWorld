// MonsterLayer.jsx
import React, { memo, useMemo, useRef, useLayoutEffect } from 'react';
import Monster from './Monster';
import { useIsoProjection } from '../hooks/useIsoProjection';
import { isMonster } from '../utils/monsterRegistry';
import { DamagePopup } from './DamagePopup'; // ← ADD

// MonsterLayer.jsx — Renders monsters with buttery-smooth positioning + culling
// 1. useMemo → Stable monster list (culling + data)
// 2. useRef → Track DOM elements
// 3. useLayoutEffect → Live transform updates (60fps)
// 4. ref callback → Map IDs to elements
// 5. CSS transition/animation → Smoothness + fade-in

const MonsterLayer = memo(({
  objects,                    // All world objects { 'x,y': monsterType }
  globalMonsterHealths,       // { monsterId: currentHP }
  monsterData,                // { type: { hp, name, image } }
  monsterTypes,               // Type mappings
  tileSize,                   // Pixel size of tiles
  camera,                     // { x, y } — player/camera world position
  popups, 
  addPopups,
  setPopups,
}) => {
  // Gets isometric world→screen projection function
  const { worldToScreen } = useIsoProjection(tileSize);

  // 🔥 CULLING: Calculate viewport size in tiles (matches CanvasGrid exactly)
  const tilesAcross = Math.ceil(window.innerWidth / tileSize) + 4;   // Horizontal tiles visible + padding
  const tilesDown = Math.ceil(window.innerHeight / tileSize) + 4;    // Vertical tiles visible + padding

  // 🔥 1. MONSTER DATA — Stable list (only updates on spawn/die/health change)
  const monsterDataList = useMemo(() => {
    // World-space culling bounds (same math as CanvasGrid's tile loop)
    const startX = Math.max(0, Math.floor(camera.x - tilesAcross / 2));     // Leftmost visible X
    const endX = Math.min(10000, Math.floor(camera.x + tilesAcross / 2));   // Rightmost visible X
    const startY = Math.max(0, Math.floor(camera.y - tilesDown / 2));       // Topmost visible Y
    const endY = Math.min(10000, Math.floor(camera.y + tilesDown / 2));     // Bottommost visible Y

    // Process all objects → extract monsters within cull bounds
    return Object.entries(objects)
      // Convert each 'x,y:objData' entry
      .map(([key, objData]) => {
        // Parse world position from key ('123,456' → x=123, y=456)
        const [xStr, yStr] = key.split(',');
        const x = Number(xStr);   // World X coord
        const y = Number(yStr);   // World Y coord

        // 🔥 CHEAP CULL: Skip monsters outside viewport (before expensive checks)
        if (x < startX || x > endX || y < startY || y > endY) return null;

        // Get monster type (handles string/object objData)
        const rawType = typeof objData === 'string' ? objData : objData.type;
        const objType = monsterTypes[rawType] || rawType;

        // Skip non-monsters
        if (!isMonster(objType)) return null;

        // Get unique ID for this monster instance
        const monsterId = typeof objData === 'string' ? objData : objData.id || objData;

        // Monster template data (hp, image, name)
        const data = monsterData[objType];
        const maxHp = data?.hp || 100;                            // Max health from template
        const currentHp = globalMonsterHealths[monsterId] ?? maxHp; // Current health (or full)

        // Return stable monster data (world pos + stats)
        return {
          monsterId,        // Unique key for React/DOM
          x, y,             // World position (for live positioning)
          currentHp,        // Live HP
          maxHp,            // Max HP
          monsterName: data?.name || objType.toUpperCase(),  // Display name
          imageSrc: data?.image,  // Sprite image
        };
      })
      // Remove nulls (culled/non-monsters)
      .filter(Boolean);
  }, [
    objects,           // Remap when world changes
    globalMonsterHealths,  // Remap when health changes
    monsterData,       // Remap when templates change
    monsterTypes,      // Remap when mappings change
    camera.x, camera.y, // Recull when camera moves
    tileSize           // Recull if tile size changes
  ]);

  // 🔥 2. POSITION REFS — Track DOM elements for smooth updates
  const monsterRefs = useRef(new Map());  // Map<monsterId, DOM element>

  // 🔥 3. LIVE POSITIONING — Updates transform every frame (NO React re-renders!)
  useLayoutEffect(() => {
    // Convert camera world pos → screen pos
    const camScreen = worldToScreen(camera.x, camera.y);

    // Update position for each visible monster
    monsterDataList.forEach((monster) => {
      // Convert monster world pos → screen pos
      const baseScreen = worldToScreen(monster.x, monster.y);
      // Relative to camera (0,0 = screen center)
      const screenX = baseScreen.x - camScreen.x;
      const screenY = baseScreen.y - camScreen.y;

      // Get the actual DOM element
      const el = monsterRefs.current.get(monster.monsterId);
      if (el) {
        // Smoothly move via CSS transform (60fps butter)
        el.style.transform = `translate(${screenX}px, ${screenY}px)`;
      }
    });
  }); // Runs synchronously after DOM mutations, before paint

  // Render stable monster DOM (never remounts!)
  return (
    <div
      // Container centered on screen (like canvas center)
      style={{
        position: 'absolute',
        left: '50%',        // Anchor to screen center X
        top: '50%',         // Anchor to screen center Y
        width: 0,           // Zero size (children positioned absolutely)
        height: 0,
        pointerEvents: 'none',  // Don't block canvas clicks
        zIndex: 15,         // Above tiles, below player/UI
        transform: 'translate(-50%, -50%)',  // Offset for true center
      }}
    >
      {/* Render one wrapper div per monster */}
      {monsterDataList.map((monster) => (
        <div
          key={monster.monsterId}  // Stable React key = no remounts!
          // REF CALLBACK: Store/delete DOM element in Map
          ref={(el) => {
            if (el) monsterRefs.current.set(monster.monsterId, el);     // New: store
            else monsterRefs.current.delete(monster.monsterId);          // Gone: cleanup
          }}
          // Wrapper styles for smooth positioning
          style={{
            position: 'absolute',     // Position relative to container center
            width: tileSize,          // Match monster sprite size
            height: tileSize,
            // Smooth movement between positions
            transition: 'transform 0.1s ease-out',
            // Fade-in animation (prevents pop-in)
            opacity: 0,
            animation: 'fadeIn 0.3s ease-out forwards',
          }}
        >
          {/* Actual Monster component (healthbar + image) */}
          <Monster
            currentHp={monster.currentHp}
            maxHp={monster.maxHp}
            monsterName={monster.monsterName}
            tileSize={tileSize}
            imageSrc={monster.imageSrc}
          />
{/* === POPUPS FOR THIS MONSTER ONLY === */}
{popups
  .filter(popup => popup.monsterId === monster.monsterId)  // ← CRITICAL: Only this monster
  .map(popup => (
    <DamagePopup
      key={popup.id}
      damage={popup.dmg}
      isCrit={popup.isCrit}                    // ← Monster: just crit + damage
      isHeal={popup.isHeal}                    // ← Will be false for monsters  
      onFinish={() => setPopups(prev => prev.filter(p => p.id !== popup.id))}
    />
  ))}

        </div>
      ))}
    </div>
  );
});

export default MonsterLayer;