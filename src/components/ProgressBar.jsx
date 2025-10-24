// src/components/ProgressBar.jsx
import React, { useEffect, useState } from 'react';
import './ProgressBar.css';

const ProgressBar = () => {
  const [key, setKey] = useState(0);

  // Force remount every time → restarts the CSS animation
  useEffect(() => {
    setKey(prev => prev + 1);
  }, []);

  return (
    <div className="progress-bar-container">
      <div
        key={key}  // ← Key change forces animation restart
        className="progress-bar-fill"
      />
    </div>
  );
};

export default ProgressBar;