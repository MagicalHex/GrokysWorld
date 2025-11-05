import React from 'react';
import './HealthBar.css';

const HealthBar = ({ health, max = 100, color = '#4CAF50' }) => {
  const percentage = Math.max(0, Math.min(100, (health / max) * 100));

  return (
    <div className="health-bar">
      <div
        className="health-bar-fill"
        style={{
          '--health-color': color,
          transform: `scaleX(${percentage / 100})`
        }}
      />
    </div>
  );
};

export default HealthBar;