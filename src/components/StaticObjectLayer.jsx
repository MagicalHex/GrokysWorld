// StaticObjectLayer.jsx
import React, { memo, useMemo, useRef, useLayoutEffect } from 'react';
import { useIsoProjection } from '../hooks/useIsoProjection';
import { OBJECT_DATA, EMOJI_MAP } from '../data/objectRegistry';
import './StaticObjectLayer.css';

const StaticObjectLayer = memo(({
  objects,
  objectTypes = OBJECT_DATA,
  tileSize,
  camera,
}) => {
  const { worldToScreen } = useIsoProjection(tileSize);
  const refs = useRef(new Map());

  const visible = useMemo(() => {
    const across = Math.ceil(window.innerWidth / tileSize) + 4;
    const down = Math.ceil(window.innerHeight / tileSize) + 4;
    const startX = Math.max(0, Math.floor(camera.x - across / 2));
    const endX = Math.min(10000, Math.floor(camera.x + across / 2));
    const startY = Math.max(0, Math.floor(camera.y - down / 2));
    const endY = Math.min(10000, Math.floor(camera.y + down / 2));

    return Object.entries(objects)
      .map(([key, raw]) => {
        const [xs, ys] = key.split(',');
        const x = Number(xs), y = Number(ys);
        if (x < startX || x > endX || y < startY || y > endY) return null;

const type = typeof raw === 'string' ? raw : raw.type;
const cfg = { 
  ...objectTypes[type], 
  ...(typeof raw === 'object' ? raw : {})   // overrides win
};
        if (!cfg) return null;

        return { id: key, x, y, cfg };
      })
      .filter(Boolean);
  }, [objects, objectTypes, camera.x, camera.y, tileSize]);

  useLayoutEffect(() => {
    const cam = worldToScreen(camera.x, camera.y);
    visible.forEach(o => {
      const screen = worldToScreen(o.x, o.y);
      const dx = screen.x - cam.x;
      const dy = screen.y - cam.y;

      const el = refs.current.get(o.id);
      if (el) {
el.style.transform = `translate3d(${dx}px, ${dy}px, 0px)`;
el.style.transform += ' translateZ(0)'; // force GPU layer
      }
    });
  });

  return (
    <>
      {visible.map(({ id, cfg }) => {
        const hasImg = cfg.image && cfg.image.trim();
        const emoji = cfg.emoji ? EMOJI_MAP[cfg.emoji] || cfg.emoji : null;

        return (
          <div className="static-object-layer"
            key={id}
            data-object={id}
            ref={el => {
              if (el) refs.current.set(id, el);
              else refs.current.delete(id);
            }}
            style={{
              position: 'absolute',
              width: tileSize,
              height: tileSize,
              transition: 'transform 0.2s ease-out',
              opacity: 0,
              animation: 'fadeIn 0.3s ease-out forwards',
              pointerEvents: 'none',
            }}
          >
            {hasImg ? (
<img
  src={cfg.image}
  alt=""
  draggable={false}
  style={{
    width: `${100 * (cfg.scale ?? 1)}%`,
    height: `${100 * (cfg.scale ?? 1)}%`,
    imageRendering: 'pixelated',

    // ← DELETE the old transform line completely!
    // ← Use ONLY this new one:

    transform: `
      translate(${cfg.offsetX || 0}px, ${cfg.offsetY || 0}px)
      ${cfg.flipH ? 'scaleX(-1)' : ''}
      ${cfg.flipV ? 'scaleY(-1)' : ''}
      rotateX(${cfg.rotateX || 0}deg)
      rotate(${cfg.rotate || 0}deg)
      rotateY(${cfg.rotateY || 0}deg)
      rotateZ(${cfg.rotateZ || 0}deg)
    `.trim().replace(/\s+/g, ' '),

    transformOrigin: 'center bottom',

    filter: 'drop-shadow(3px 3px 8px rgba(0,0,0,0.7))',
    opacity: cfg.opacity ?? 1,
  }}
/>
            ) : emoji ? (
              <div
                style={{
                  fontSize: `${tileSize * (cfg.scale ?? 1)}px`,
                  lineHeight: 1,
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  height: '100%',
                }}
              >
                {emoji}
              </div>
            ) : null}
          </div>
        );
      })}
    </>
  );
});

export default StaticObjectLayer;