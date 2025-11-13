// Monster.jsx
import React, { memo } from 'react';
import ActionBar from './ActionBar';  // ← REUSE!

const Monster = memo(({ 
  screenX, screenY, currentHp, maxHp, 
  tileSize, imageSrc 
}) => {
  return (
    <div
      style={{
        position: 'absolute',
        transform: `translate(${screenX}px, ${screenY}px)`,
        width: tileSize,
        height: tileSize,
        pointerEvents: 'none',
      }}
    >
      {imageSrc && (
        <img 
          src={imageSrc}
          style={{
            width: tileSize,
            height: tileSize,
            imageRendering: 'pixelated',
            display: 'block',
            transform: 'translate(2.5%, 35%)',
          }}
          alt=""
        />
      )}
      
      {currentHp > 0 && (
        <div
          style={{
            position: 'absolute',
            left: '0%',
            top: '0px',
            transform: 'translateX(-50%)',
          }}
        >
          <ActionBar
            type="health"
            value={currentHp}
            max={maxHp}
            isMonster={true}   // ← triggers orange logic
            color="#ff4500"
          />
        </div>
      )}
    </div>
  );
});

export default Monster;