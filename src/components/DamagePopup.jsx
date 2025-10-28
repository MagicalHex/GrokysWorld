// src/components/DamagePopup.jsx
import React, { useEffect, useState } from 'react';
import './DamagePopup.css';   // <-- CSS file (see below)

export const DamagePopup = ({ x, y, damage, isPlayer, onFinish }) => {
  const [visible, setVisible] = useState(true);

  // Auto-remove after animation (≈1.2 s)
  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onFinish, 300); // wait for fade-out
    }, 1200);
    return () => clearTimeout(timer);
  }, [onFinish]);

  if (!visible) return null;

  // Tile size – change to match your map's CSS grid cell size
  const TILE_SIZE = 40; // px

  const style = {
    // Center the number inside the tile
    left: x * TILE_SIZE + TILE_SIZE / 2,
    top:  y * TILE_SIZE + TILE_SIZE / 2,
    // colour: red for player damage, orange for monster
    '--dmg-color': isPlayer ? '#ff4d4d' : '#ffb84d',
  };

  return (
    <div className="damage-popup" style={style}>
      {damage}
    </div>
  );
};