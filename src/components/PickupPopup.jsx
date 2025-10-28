// src/components/PickupPopup.jsx
import React, { useEffect, useState } from 'react';
import './PickupPopup.css';
import { OBJECTS } from './Objects';

export const PickupPopup = ({ x, y, item, onFinish }) => {
  const [visible, setVisible] = useState(true);

  // Auto-remove after animation (≈1.0 s)
  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onFinish, 300); // wait for fade-out
    }, 1000);
    return () => clearTimeout(timer);
  }, [onFinish]);

  if (!visible) return null;

  const TILE_SIZE = 45; // Must match your grid tile size

  const style = {
    left: x * TILE_SIZE + TILE_SIZE / 2,
    top:  y * TILE_SIZE + TILE_SIZE / 2,
  };

return (
  <div className="pickup-popup" style={style}>
    {OBJECTS[item] ? <span style={{ fontSize: '1.4rem' }}>{OBJECTS[item]} +1</span> : '+1'}
  </div>
);
};