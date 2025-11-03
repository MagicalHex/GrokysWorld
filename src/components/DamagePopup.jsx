// src/components/DamagePopup.jsx
import React, { useEffect, useState } from 'react';
import './DamagePopup.css';

export const DamagePopup = ({ damage, isPlayer, isHeal, onFinish }) => {
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
        '--dmg-color': isHeal ? '#4ade80' : isPlayer ? '#ff4d4d' : '#ffb84d',
      }}
    >
      {isHeal ? '+' : ''}{damage}
    </div>
  );
};