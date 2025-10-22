import React from 'react';
import './HealthBar.css';

const HealthBar = ({ health, max = 100, color = '#4CAF50' }) => (
  <div className="health-bar">
    <div 
      className="health-bar-fill"
      style={{ 
        width: `${(health / max) * 100}%`, 
        backgroundColor: color
      }} 
    />
  </div>
);

export default HealthBar;