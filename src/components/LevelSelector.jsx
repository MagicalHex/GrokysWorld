import React from 'react';

const LevelSelector = ({ renderSelector }) => {
  return (
    <div className="level-selector">
      <label htmlFor="level-select">Level: </label>
      {renderSelector()}
    </div>
  );
};

export default LevelSelector;