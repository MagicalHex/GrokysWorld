// Questing/QuestingUI.jsx
import React from 'react';
import { QuestPopup } from '../QuestPopup';

export const QuestingUI = ({ questPopup, tileSize, onClose }) => {
  if (!questPopup) return null;

  return (
    <QuestPopup
      message={questPopup.message}
      x={questPopup.x}
      y={questPopup.y}
      tileSize={tileSize}
      onClose={onClose}
    />
  );
};