// src/components/DamagePopup.jsx
import React, { useEffect, useState } from 'react';
import './DamagePopup.css';   // <-- CSS file (see below)

export const DamagePopup = ({ x, y, damage, isPlayer, isHeal, onFinish }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onFinish, 300);
    }, 1200);
    return () => clearTimeout(timer);
  }, [onFinish]);

  if (!visible) return null;

  const TILE_SIZE = 40;

  const style = {
    left: x * TILE_SIZE + TILE_SIZE / 2,
    top: y * TILE_SIZE + TILE_SIZE / 2,
    // Dynamic color
    '--dmg-color': isHeal
      ? '#4ade80'      // GREEN for heal
      : isPlayer
        ? '#ff4d4d'    // RED for player damage
        : '#ffb84d',   // ORANGE for monster damage
  };

  return (
    <div className="damage-popup" style={style}>
      {isHeal ? '+' : ''}{damage}
    </div>
  );
};