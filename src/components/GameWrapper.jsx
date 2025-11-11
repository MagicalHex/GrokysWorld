// src/components/GameWrapper.jsx
import React from 'react';
import './GameWrapper.css';

export default function GameWrapper({ children }) {
  return (
    <div className="game-wrapper">
      {children}
    </div>
  );
}