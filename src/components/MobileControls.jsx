// MobileControls.jsx
import React from 'react';
import './MobileControls.css';

const MobileControls = ({ onExit, openInventory, joystickRef }) => {
  return (
    <div className="mobile-controls-bar">
      {/* LEFT BUTTON */}
      <button onClick={onExit} className="mobile-control-btn">
        E
      </button>

      {/* CENTER – joystick stays in the middle */}
      <div className="mobile-joystick-wrapper">
        <div ref={joystickRef} className="mobile-joystick-zone" />
      </div>

      {/* RIGHT BUTTON */}
      <button onClick={openInventory} className="mobile-control-btn">
        I
      </button>
    </div>
  );
};

export default MobileControls;