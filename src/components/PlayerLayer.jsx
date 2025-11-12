import React, { memo, useState, useEffect, useRef } from 'react';
import { useIsoProjection } from '../hooks/useIsoProjection';
import ActionBar from './ActionBar';
import './PlayerLayer.css';

const PlayerLayer = memo(
  ({
    moveDirectionRef,
    moveTrigger,
    globalPlayerHealth,
    currentAction,
    choppingProgress,
    tileSize,
  }) => {
    const direction = moveDirectionRef.current;

    // State
    const [displayImage, setDisplayImage] = useState('/ownemojis/player-image.webp'); // standing by default
    const timeoutRef = useRef(null);

    // Handle direction change
    useEffect(() => {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      if (direction) {
        // Immediately show directional image
        const getDirectionalImage = () => {
          switch (direction) {
            case 'left': return '/ownemojis/player-left.webp';
            case 'right': return '/ownemojis/player-right.webp';
            case 'up': return '/ownemojis/player-up.webp';
            case 'down': return '/ownemojis/player-down.webp';
            default: return '/ownemojis/player-image.webp';
          }
        };

        setDisplayImage(getDirectionalImage());

        // Schedule return to standing after 500ms
        timeoutRef.current = setTimeout(() => {
          setDisplayImage('/ownemojis/player-image.webp');
          timeoutRef.current = null;
        }, 300);
      } else {
        // Not moving: ensure we show standing (in case timeout was pending)
        setDisplayImage('/ownemojis/player-image.webp');
      }

      // Cleanup on unmount or direction change
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }, [direction, moveTrigger]);

    return (
      <div
        className="player-layer"
        style={{
          left: '50.5%',
          top: '50.5%',
          width: `${tileSize}px`,
          height: `${tileSize}px`,
          position: 'absolute',
          pointerEvents: 'none',
          zIndex: 1000,
        }}
      >
        <div
          className={`player-container standing ${
            direction ? `enter-from-${direction}` : ''
          }`}
          style={{
            backgroundImage: `url(${displayImage})`,
          }}
        >
          <ActionBar
            type={currentAction}
            value={currentAction === 'health' ? globalPlayerHealth : choppingProgress}
            color={globalPlayerHealth > 50 ? '#169b1fff' : '#f44336'}
          />
        </div>
      </div>
    );
  }
);

export default PlayerLayer;