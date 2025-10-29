// QuestPopup.jsx
import React, { useState, useEffect } from 'react';
import './QuestPopup.css';

export const QuestPopup = ({ message, onClose }) => {
  const [visible, setVisible] = useState(true);

  // How many pixels to the left of the centre (negative = left, positive = right)
  const LEFT_OFFSET_PX = -80;   // <-- tweak this value

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300); // match fade-out
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  if (!visible) return null;

  return (
    <div
      className="quest-popup"
      style={{
        // 50vw / 50vh = centre of the viewport
        left: `calc(50vw + ${LEFT_OFFSET_PX}px)`,
        top:  '50vh',
        transform: 'translate(-50%, -50%)',
      }}
    >
      <div className="quest-popup__text">{message}</div>
    </div>
  );
};