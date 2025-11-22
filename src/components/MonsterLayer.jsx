// MonsterLayer.jsx
/**
 * 🔥 MonsterLayer: Renders ALL monsters with:
 *  - 60fps smooth isometric positioning (NO React re-renders for movement!)
 *  - Viewport culling (only visible monsters rendered)
 *  - Directional sprites (left/right/up/down → 300ms → front)
 *  - Per-monster damage popups
 *  - Health bars + names
 * 
 * PERFORMANCE SECRETS:
 * 1. useMemo → stable monster list (culls + computes once)
 * 2. useRef Map → track DOM elements (no React state for position)
 * 3. useLayoutEffect → update CSS transform 60fps (before paint)
 * 4. memo() → prevents unnecessary re-renders
 */

import React, {
  memo,           // 🔥 Prevents parent re-renders from re-rendering ALL monsters
  useMemo,        // 🔥 Stable monster list (only recomputes when needed)
  useRef,         // 🔥 Track DOM elements for 60fps positioning
  useLayoutEffect,// 🔥 Update positions BEFORE browser paints (no jank)
  useState,       // 🔥 Per-monster directional image state
  useEffect,      // 🔥 Handle direction changes + timeouts
} from 'react';
import Monster from './Monster';                    // Individual monster (image + healthbar)
import { useIsoProjection } from '../hooks/useIsoProjection'; // World → screen math
import { isMonster } from '../utils/monsterRegistry';        // Type checker
import { DamagePopup } from './DamagePopup';                 // Floating damage numbers

const MonsterLayer = memo(
  ({
    objects,                    // { 'x,y': monsterId } — world state
    globalMonsterHealths,       // { monsterId: currentHP } — live health
    monsterData,                // { type: { hp, image, images: {left: "..."} } }
    monsterTypes,               // { rawId: 'goblin' } — ID → type mapping
    tileSize,                   // px per tile (for sizing + culling)
    camera,                     // { x, y } — player/world center
    popups,                     // [{ id, dmg, monsterId, isCrit }]
    setPopups,                  // () => remove popup

    // ---- DIRECTIONAL SPRITES (NEW!) ---------------------------------
    monsterMoveDirectionRef,    // { current: { monsterId: 'left'|'up'|... } }
    monsterMoveTrigger,         // number — increments → triggers direction useEffect
    // ----------------------------------------------------------------
  }) => {
    // 🔥 ISOMETRIC MATH: Convert world (x,y) → screen pixels
    const { worldToScreen } = useIsoProjection(tileSize);

    // ---------- VIEWPORT CULLING ----------
    // Calculate how many tiles fit on screen + padding
    // → Only process/render monsters in this box (saves CPU!)
    const tilesAcross = Math.ceil(window.innerWidth / tileSize) + 4;
    const tilesDown = Math.ceil(window.innerHeight / tileSize) + 4;

    // ---------- DIRECTIONAL SPRITE LOGIC ----------
    // { monsterId: 'left' } — which direction each monster is showing
    const [displayDir, setDisplayDir] = useState({});
    // { monsterId: timeoutId } — track timeouts to cancel/revert
    const timeoutRef = useRef({});

    // 🔥 useEffect: React to monster movement (triggered by monsterMoveTrigger++)
    useEffect(() => {
      const newDir = { ...displayDir };
      let changed = false;

      // Check every monster that just moved
      Object.entries(monsterMoveDirectionRef.current).forEach(([id, dir]) => {
        // New direction? Show it!
        if (dir && dir !== displayDir[id]) {
          newDir[id] = dir;
          changed = true;

          // Cancel any existing timeout for this monster
          if (timeoutRef.current[id]) {
            clearTimeout(timeoutRef.current[id]);
          }

          // Schedule revert to front image after 300ms
          timeoutRef.current[id] = setTimeout(() => {
            setDisplayDir((prev) => {
              const next = { ...prev };
              delete next[id]; // ← Clear direction → shows default image
              return next;
            });
            // Cleanup timeout ref
            delete timeoutRef.current[id];
          }, 300);
        }
      });

      // Only re-render if a direction actually changed
      if (changed) setDisplayDir(newDir);
    }, [monsterMoveTrigger, monsterMoveDirectionRef.current]);

    // 🔥 Cleanup: Clear all timeouts when component unmounts
    useEffect(() => {
      return () => {
        Object.values(timeoutRef.current).forEach(clearTimeout);
      };
    }, []);

    // ---------- 🔥 CORE: Build list of VISIBLE monsters ----------
    const monsterDataList = useMemo(() => {
      // Calculate world-space bounding box (culling bounds)
      const startX = Math.max(0, Math.floor(camera.x - tilesAcross / 2));
      const endX = Math.min(10000, Math.floor(camera.x + tilesAcross / 2));
      const startY = Math.max(0, Math.floor(camera.y - tilesDown / 2));
      const endY = Math.min(10000, Math.floor(camera.y + tilesDown / 2));

      return Object.entries(objects) // { 'x,y': monsterId }
        .map(([key, objData]) => {
          // Parse world position from key
          const [xStr, yStr] = key.split(',');
          const x = Number(xStr);
          const y = Number(yStr);

          // 🔥 CULL: Skip monsters outside viewport
          if (x < startX || x > endX || y < startY || y > endY) {
            return null;
          }

          // Get monster type (handles string vs object objData)
          const rawType = typeof objData === 'string' ? objData : objData.type;
          const objType = monsterTypes[rawType] || rawType;
          
          // Skip non-monsters
          if (!isMonster(objType)) return null;

          // Unique ID for this monster instance
          const monsterId = typeof objData === 'string' 
            ? objData 
            : objData.id || objData;

          // Template data (hp, images, etc.)
          const data = monsterData[objType];
          const maxHp = data?.hp || 100;
          const currentHp = globalMonsterHealths[monsterId] ?? maxHp;

          // 🔥 DIRECTIONAL IMAGE LOGIC
          const movingDir = displayDir[monsterId];
          let imageSrc = data?.image; // Default: front-facing

          // If moving AND has directional image → use it!
          if (movingDir && data?.images?.[movingDir]) {
            imageSrc = data.images[movingDir];
          }

          // Return enriched monster data for rendering
          return {
            monsterId,
            x, y,                           // World position
            currentHp, maxHp,               // Health
            monsterName: data?.name || objType.toUpperCase(),
            imageSrc,                       // Final image (directional or default)
            size: data?.size || 'medium',
            type: objType,
            scale: data?.scale || 1.0,
            nameHeightPosition: data?.nameHeightPosition || 'medium',
            nameWidthPosition: data?.nameWidthPosition || 'center',
          };
        })
        .filter(Boolean); // Remove culled/non-monsters
    }, [
      objects,
      globalMonsterHealths,
      monsterData,
      monsterTypes,
      camera.x, camera.y,
      tileSize,
      displayDir, // ← Rebuilds when directions change (shows new sprites)
    ]);

    // ---------- 🔥 PERFORMANCE: Track DOM elements ----------
    const monsterRefs = useRef(new Map()); // monsterId → DOM element

    // ---------- 🔥 60FPS POSITIONING (NO React re-renders!) ----------
    useLayoutEffect(() => {
      // Camera in screen space (center = 0,0)
      const camScreen = worldToScreen(camera.x, camera.y);

      // Update EVERY visible monster's position
      monsterDataList.forEach((m) => {
        // Monster world pos → screen pos → relative to camera
        const base = worldToScreen(m.x, m.y);
        const screenX = base.x - camScreen.x;
        const screenY = base.y - camScreen.y;

        // 🔥 Direct DOM manipulation (bypasses React!)
        const el = monsterRefs.current.get(m.monsterId);
        if (el) {
          el.style.transform = `translate(${screenX}px, ${screenY}px)`;
        }
      });
    }); // Runs AFTER DOM render, BEFORE browser paints

    // ---------- RENDER: One div per monster ----------
    return (
      <div className="monster-layer">
        {monsterDataList.map((monster) => (
          <div
            key={monster.monsterId}           // Stable React key
            data-monster={monster.monsterId}  // Debug selector
            // 🔥 Ref callback: Store DOM element when mounted/unmounted
            ref={(el) => {
              if (el) {
                monsterRefs.current.set(monster.monsterId, el);
              } else {
                monsterRefs.current.delete(monster.monsterId);
              }
            }}
            style={{
              position: 'absolute',
              width: tileSize,
              height: tileSize,
              // Smooth movement between world positions
              transition: 'transform 0.2s ease-out',
              // Fade-in animation (no pop-in)
              opacity: 0,
              animation: 'fadeIn 0.3s ease-out forwards',
            }}
          >
            {/* 🔥 Monster: sprite + health bar */}
            <Monster
              currentHp={monster.currentHp}
              maxHp={monster.maxHp}
              monsterName={monster.monsterName}
              tileSize={tileSize}
              imageSrc={monster.imageSrc}       // ← Directional or default!
              size={monster.size}
              type={monster.type}
              scale={monster.scale}
              nameHeightPosition={monster.nameHeightPosition}
              nameWidthPosition={monster.nameWidthPosition}
            />

            {/* 🔥 Damage popups FOR THIS MONSTER ONLY */}
            {popups
              .filter((p) => p.monsterId === monster.monsterId)
              .map((popup) => (
                <DamagePopup
                  key={popup.id}
                  damage={popup.dmg}
                  isCrit={popup.isCrit}
                  isHeal={popup.isHeal}
                  element={popup.element}
                  onFinish={() =>
                    setPopups((prev) =>
                      prev.filter((p) => p.id !== popup.id)
                    )
                  }
                />
              ))}
          </div>
        ))}
      </div>
    );
  }
);

export default MonsterLayer;