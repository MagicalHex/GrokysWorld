// QuestPopup.jsx
import React, { useState, useEffect } from 'react';
import './QuestPopup.css';

export const QuestPopup = ({ message, x, y, tileSize, onClose }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300); // match fade-out
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  if (!visible) return null;

  const left = x * tileSize + tileSize / 2;
  const top = y * tileSize - 40;

  return (
    <div
      className="quest-popup"
      style={{
        left: `${left}px`,
        top: `${top}px`,
        transform: 'translateX(-50%)',
      }}
    >
      <div className="quest-popup__text">{message}</div>
    </div>
  );
};