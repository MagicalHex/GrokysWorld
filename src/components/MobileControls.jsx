// src/components/MobileControls.jsx
import React from 'react';
import './MobileControls.css';

const MobileControls = ({ onExit, openInventory, joystickRef }) => {
  return (
    <div className="mobile-controls-bar">
      <button onClick={onExit} className="mobile-control-btn mobile-edit-btn">
        E
      </button>
      <div ref={joystickRef} className="mobile-joystick-zone" />
      <button onClick={openInventory} className="mobile-control-btn mobile-inventory-btn">
        I
      </button>
    </div>
  );
};

export default MobileControls;