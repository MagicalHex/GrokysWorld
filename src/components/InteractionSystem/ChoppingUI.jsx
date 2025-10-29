// Chopping/ChoppingUI.jsx
import React from 'react';
import ProgressBar from '../ProgressBar';

export const ChoppingUI = ({ x, y, tileSize }) => {
  if (x === null || y === null || tileSize == null) return null;

  return (
    <div
      style={{
        position: 'absolute',
        left: `${x * tileSize}px`,
        top: `${y * tileSize}px`,
        width: tileSize,
        height: tileSize,
        pointerEvents: 'none',
        zIndex: 10,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-end',
        paddingBottom: '10px',
      }}
    >
      <ProgressBar />
    </div>
  );
};