// src/components/DamagePopup.jsx
import React, { useEffect, useState } from 'react';
import './DamagePopup.css';

const ELEMENT_EMOJIS = {
  fire: '🔥',
  ice: '❄️',
  frost: '❄️',
  water: '💧',
  wind: '🌪️',
  lightning: '⚡',
  thunder: '⚡',
  earth: '🪨',
  poison: '☠️',
  holy: '✨',
  dark: '🖤',
};

export const DamagePopup = ({
  damage,
  isPlayer,
  isHeal,
  isXP,
  isCrit = false,
  element = null,    // ← NEW PROP
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

  const emoji = element ? ELEMENT_EMOJIS[element.toLowerCase()] : null;

  return (
    <div
      className="damage-popup"
      style={{
        '--dmg-color': isXP
          ? '#ffffff'
          : isHeal
            ? '#4ade80'
            : isCrit
              ? '#ffd700'
              : isPlayer
                ? (element === 'ice' ? '#82eefd' : element === 'lightning' ? '#c3d1ff' : '#ff4d4d')  // optional: color tweaks per element
                : '#ffb84d',
        '--text-shadow': isXP
          ? '0 0 4px #00bfff, 0 0 8px #0099cc'
          : isCrit
            ? '0 0 6px #ffcc00, 0 0 12px #ff9900'
            : '0 0 4px rgba(0,0,0,0.6), 0 0 8px rgba(0,0,0,0.4)',
        '--crit-scale': isCrit ? '1.4' : '1',
      }}
    >
      {isXP || isHeal ? '+' : ''}
      {emoji && <span className="element-emoji">{emoji}</span>}
      {damage}
      {emoji && isCrit && <span className="element-emoji">{emoji}</span>} {/* double emoji on crit for extra spice 🔥🔥 */}
    </div>
  );
};