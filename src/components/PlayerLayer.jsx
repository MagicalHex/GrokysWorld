// src/components/PlayerLayer.jsx
import React from 'react';
import './PlayerLayer.css';
import ActionBar from './ActionBar';

const PlayerLayer = React.memo(({
  playerPos,
  moveDirectionRef,
  globalPlayerHealth,
  currentAction,
  choppingProgress,
  tileSize
}) => {
  const direction = moveDirectionRef.current;

  return (
    <div
      className="player-layer"
      style={{
left: `${(playerPos.x + 1) * tileSize}px`,
top: `${(playerPos.y + 1) * tileSize}px`,
        width: `${tileSize}px`,
        height: `${tileSize}px`,
      }}
    >
      <div
        className={`player-container ${
          direction ? `enter-from-${direction}` : 'standing'
        }`}
        onAnimationStart={() => console.log('[ANIM] Starting:', direction)}
        onAnimationEnd={() => console.log('[ANIM] Ended:', direction)}
      >
        <ActionBar
          type={currentAction}
          value={currentAction === 'health' ? globalPlayerHealth : choppingProgress}
          color={globalPlayerHealth > 50 ? '#169b1fff' : '#f44336'}
        />
      </div>
    </div>
  );
});

export default PlayerLayer;