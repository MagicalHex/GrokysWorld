// src/components/PlayerLayer.jsx
import React from 'react';
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
      className={`player-layer object player ${
        direction ? `enter-from-${direction}` : 'standing'
      }`}
      style={{
        position: 'absolute',
        left: `${playerPos.x * tileSize}px`,
        top: `${playerPos.y * tileSize}px`,
        width: `${tileSize}px`,
        height: `${tileSize}px`,
        zIndex: 1000,
        pointerEvents: 'none'  // Don't block tile clicks
      }}
      onAnimationStart={() => console.log('[ANIM] Starting:', moveDirectionRef)}
      onAnimationEnd={() => console.log('[ANIM] Ended:', moveDirectionRef)}
    >
      <ActionBar
        type={currentAction}
        value={currentAction === 'health' ? globalPlayerHealth : choppingProgress}
        color={globalPlayerHealth > 50 ? '#169b1fff' : '#f44336'}
      />
</div>
  );
});

export default React.memo(PlayerLayer);