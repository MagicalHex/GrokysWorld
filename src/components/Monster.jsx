// Monster.jsx
import React, { memo } from 'react';
import ActionBar from './ActionBar';
import './Monster.css';

// You can modify health bar + name position in .CSS: .monster-ui.high (these are presets, so set only low/medium/high in monsters.json)

const Monster = memo(({ 
  currentHp,
   maxHp,
    monsterName,
     tileSize,
      imageSrc,
  size = 'medium',
   type, scale = 1.0,
    nameHeightPosition = 'medium',  // high|medium|low
    nameWidthPosition = 'medium',
}) => {
  
  // Monster Position on tile
  const offsets = {
    small:  { x: '-25%', y: '-40%' },
    medium: { x: '0%',   y: '0%' },
    large:  { x: '5%',   y: '40%' }
  };
  const { x: offsetX, y: offsetY } = offsets[size] || offsets.medium;

  // ---- dynamic name font (same logic you already had) ----
  const baseFontSize = tileSize * 0.16;
  const fontSize = monsterName.length > 12 ? baseFontSize * 0.85 : baseFontSize;

  return (
    <div className={`monster-container ${type}`}           
         style={{ width: tileSize, height: tileSize }}>

      {/* SPRITE */}
      {imageSrc && (
        <img 
          src={imageSrc}
          style={{
            width: `${100 * scale}%`,
            height: `${100 * scale}%`,
            imageRendering: 'pixelated',
            display: 'block',
            transform: `translate(${offsetX}, ${offsetY})`,
            filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.5))',
          }}
          alt=""
        />
      )}

      {/* === UI BLOCK === */}
<div 
  className={`monster-ui 
    ${nameHeightPosition}          // ← vertical: high/medium/low
    ${nameWidthPosition}`}         // ← horizontal: left/center/right
>
        <ActionBar
          type="health"
          value={currentHp}
          max={maxHp}
          isMonster={true}
          name={monsterName}
          tileSize={tileSize}                 // <-- NEW: for dynamic name size
          nameFontSize={fontSize}             // <-- NEW: pre-calculated
        />
      </div>
    </div>
  );
});

export default Monster;