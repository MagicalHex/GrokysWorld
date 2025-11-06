// src/components/DamagePopup.jsx
import React, { useEffect, useState } from 'react';
import './DamagePopup.css';

export const DamagePopup = ({ damage, isPlayer, isHeal, isXP, onFinish }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onFinish, 300);
    }, 1200);
    return () => clearTimeout(timer);
  }, [onFinish]);

  if (!visible) return null;

  return (
    <div
      className="damage-popup"
      style={{
        '--dmg-color': isXP 
          ? '#ffffff'  // White for XP
          : isHeal 
            ? '#4ade80' 
            : isPlayer 
              ? '#ff4d4d' 
              : '#ffb84d',
        '--text-shadow': isXP 
          ? '0 0 4px #00bfff, 0 0 8px #0099cc'  // Blue glow
          : '0 0 4px rgba(0,0,0,0.6), 0 0 8px rgba(0,0,0,0.4)'
      }}
    >
      {isXP ? '+' : isHeal ? '+' : ''}{damage}
    </div>
  );
};