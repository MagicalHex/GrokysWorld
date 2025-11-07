// src/components/DamagePopup.jsx
import React, { useEffect, useState } from 'react';
import './DamagePopup.css';

export const DamagePopup = ({
  damage,
  isPlayer,
  isHeal,
  isXP,
  isCrit = false,
  onFinish,
}) => {
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
          ? '#ffffff'                     // XP – white
          : isHeal
            ? '#4ade80'                   // heal – green
            : isCrit
              ? '#ffd700'                 // crit – gold
              : isPlayer
                ? '#ff4d4d'               // player dmg – red
                : '#ffb84d',              // monster dmg – orange
        '--text-shadow': isXP
          ? '0 0 4px #00bfff, 0 0 8px #0099cc'   // blue glow
          : isCrit
            ? '0 0 6px #ffcc00, 0 0 12px #ff9900' // gold glow
            : '0 0 4px rgba(0,0,0,0.6), 0 0 8px rgba(0,0,0,0.4)',
        '--crit-scale': isCrit ? '1.4' : '1',   // bigger text
      }}
    >
      {isXP || isHeal ? '+' : ''}{damage}
    </div>
  );
};