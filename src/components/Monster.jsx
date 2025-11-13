// Monster.jsx
import React, { memo } from 'react';
import MonsterHealthBar from './MonsterHealthBar';

const Monster = memo(({ 
  screenX, screenY, currentHp, maxHp, monsterName, 
  tileSize, imageSrc 
}) => {
  const ratio = currentHp / maxHp;
  const hue = Math.max(0, 120 * ratio);
  const color = `hsl(${hue}, 100%, 45%)`;

  return (
    <div
      style={{
        position: 'absolute',
        transform: `translate(${screenX}px, ${screenY}px)`,  // ← raw offset from center
        width: tileSize,
        height: tileSize,
        pointerEvents: 'none',
      }}
    >
      {/* Monster Image - centered on tile */}
      {imageSrc && (
        <img 
          src={imageSrc}
          style={{
            width: tileSize,
            height: tileSize,
            imageRendering: 'pixelated',
            display: 'block',
            transform: 'translate(2.5%, 35%)',  // ← slight offset like your original
          }}
          alt=""
        />
      )}
      
      {/* HealthBar - above head */}
      {currentHp > 0 && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '-24px',
            transform: 'translateX(-50%)',
          }}
        >
          <MonsterHealthBar value={currentHp} max={maxHp} color={color} />
        </div>
      )}
    </div>
  );
});

export default Monster;