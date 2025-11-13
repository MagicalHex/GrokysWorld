// src/components/MonsterHealthBar.jsx
import React from 'react';
import './ActionBar.css';  // Reuse player CSS

const MonsterHealthBar = ({ value, max = 100, color = '#ff9a04ff' }) => {
  const healthWidth = `${(value / max) * 100}%`;

  return (
    <div className="action-bar">
<div
  className="action-bar-fill health"
  style={{
    width: healthWidth,
    background: color,
    animation: 'none'
  }}
/>
    </div>
  );
};

export default MonsterHealthBar;