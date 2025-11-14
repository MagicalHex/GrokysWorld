// src/components/ActionBar.jsx
import React, { useState, useEffect } from 'react';
import './ActionBar.css';

let globalKeyCounter = 0;

const ActionBar = ({
  type = 'health',
  value,
  max = 100,
  color,
  isMonster = false,
  name,                // optional – defaults to "Player" for non-monsters
  tileSize,            // <-- for monster name scaling
  nameFontSize,        // <-- pre-calculated for monsters (optional)
}) => {
  const isProgress = type === 'chop' || type === 'mine';

  // -----------------------------------------------------------------
  // 1. NAME
  // -----------------------------------------------------------------
  const displayName = name ?? (isMonster ? '' : 'Player');

  // Monster name uses the font size you already calculated in Monster.jsx
  // Player name is deliberately tiny (fixed 0.9 em)
  const finalNameStyle = isMonster && nameFontSize
    ? { fontSize: `${nameFontSize}px` }
    : { fontSize: '0.3em' };               // <-- player name small

  // -----------------------------------------------------------------
  // 2. Progress key reset (unchanged)
  // -----------------------------------------------------------------
  const [progressKey, setProgressKey] = useState(null);
  useEffect(() => {
    if (isProgress) {
      const t = setTimeout(() => {
        globalKeyCounter++;
        setProgressKey(globalKeyCounter);
      }, 0);
      return () => clearTimeout(t);
    } else {
      setProgressKey(null);
    }
  }, [type, isProgress]);

  // -----------------------------------------------------------------
  // 3. Width / colour
  // -----------------------------------------------------------------
  const healthWidth = `${(value / max) * 100}%`;
const defaultColor = isMonster
  ? '#ff4500'   // ← ORANGE for monsters (overrides everything)
  : '#4CAF50';  // player green
  const finalColor = color ?? defaultColor;

  // -----------------------------------------------------------------
  // 4. Render – name **always above** the bar
  // -----------------------------------------------------------------
  return (
    <div className="action-bar-wrapper">
      {/* NAME (always above) */}
      {displayName && (
        <div className="action-bar-name" style={finalNameStyle}>
          {displayName}
        </div>
      )}

      {/* BAR */}
      <div className="action-bar">
        <div
          key={isProgress ? progressKey : 'health'}
          className={`action-bar-fill ${isProgress ? 'progress' : ''} ${isMonster ? 'monster' : ''}`}
          style={{
            width: isProgress ? '0%' : healthWidth,
            background: isProgress
              ? 'linear-gradient(90deg, #0D47A1, #1976D2, #42A5F5, #90CAF9)'
              : finalColor,
            backgroundSize: isProgress ? '200% 100%' : '100%',
            animation: isProgress
              ? 'chop-fill 3s linear forwards, gradient-shift 1.5s ease-in-out infinite'
              : 'none',
          }}
        />

        {isProgress && (
          <div className="action-icon">
            {type === 'chop' ? 'Axe' : 'Pickaxe'}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActionBar;