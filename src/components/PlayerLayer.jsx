import React, { memo } from 'react';
import { useIsoProjection } from '../hooks/useIsoProjection';
import ActionBar from './ActionBar';
import './PlayerLayer.css';

const PlayerLayer = memo(
  ({
    playerPos,
    moveDirectionRef,
    globalPlayerHealth,
    currentAction,
    choppingProgress,
    tileSize,
  }) => {
    const direction = moveDirectionRef.current;
    const { worldToScreen } = useIsoProjection(tileSize);

    const screen = worldToScreen(playerPos.x, playerPos.y);

    // Feet sit roughly at the tile center – tweak the -0.35 if needed
    const left = `calc(50% + ${screen.x}px)`;
    const top = `calc(50% + ${screen.y - tileSize * 0.45}px)`;

    return (
      <div
        className="player-layer"
        style={{
          left,
          top,
          width: `${tileSize}px`,
          height: `${tileSize}px`,
        }}
      >
        <div className={`player-container standing`}>
          <ActionBar
            type={currentAction}
            value={
              currentAction === 'health' ? globalPlayerHealth : choppingProgress
            }
            color={globalPlayerHealth > 50 ? '#169b1fff' : '#f44336'}
          />
        </div>
      </div>
    );
  }
);

export default PlayerLayer;