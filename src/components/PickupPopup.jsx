// src/components/PickupPopup.jsx
import React, { useEffect, useState } from 'react';
import './PickupPopup.css';
import { OBJECTS } from './Objects';

export const PickupPopup = ({ item, onFinish }) => {
  const [visible, setVisible] = useState(true);

  // auto-remove after animation (≈1 s)
  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onFinish, 300);   // wait for fade-out
    }, 1000);
    return () => clearTimeout(timer);
  }, [onFinish]);

  if (!visible) return null;

  return (
    <div className="pickup-popup">
      {OBJECTS[item] ? (
        <span style={{ fontSize: '1.4rem' }}>
          {OBJECTS[item]} +1
        </span>
      ) : (
        '+1'
      )}
    </div>
  );
};