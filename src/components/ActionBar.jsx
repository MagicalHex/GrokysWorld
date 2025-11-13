// src/components/ActionBar.jsx
import React, { useState, useEffect } from 'react';
import './ActionBar.css';

let globalKeyCounter = 0; // Persistent across renders

const ActionBar = ({
  type = 'health',
  value,
  max = 100,
  color,
  isMonster = false,  // ← NEW: are we rendering a monster?
}) => {
  const isProgress = type === 'chop' || type === 'mine';

  // Unique key that increments EVERY time we start a progress action
  const [progressKey, setProgressKey] = useState(null);

  // When type switches to 'chop' or 'mine', trigger a fresh key
useEffect(() => {
    if (isProgress) {
            // Tiny delay to ensure previous animation is *fully* removed
      const timeout = setTimeout(() => {
        globalKeyCounter++;
        setProgressKey(globalKeyCounter);
      }, 0);
      return () => clearTimeout(timeout);
    } else {
      setProgressKey(null);
    }
  }, [type, isProgress]);

  const healthWidth = `${(value / max) * 100}%`;

  // DEFAULT COLORS
  const defaultColor = isMonster
    ? `hsl(${Math.max(30, 120 * (value / max))}, 100%, 50%)`  // orange → red
    : '#4CAF50';  // player green

  const finalColor = color ?? defaultColor;

  return (
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
  );
};

export default ActionBar;