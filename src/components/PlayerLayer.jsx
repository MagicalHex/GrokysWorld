import React, { memo, useState, useEffect, useRef } from 'react';
import { DamagePopup } from './DamagePopup';
import { PickupPopup } from './PickupPopup';
import { useIsoProjection } from '../hooks/useIsoProjection';
import ActionBar from './ActionBar';
import './PlayerLayer.css';

const PlayerLayer = memo(({
  moveDirectionRef,
  moveTrigger,
  globalPlayerHealth,
  currentAction,
  choppingProgress,
  tileSize,
  popups,
  addPopup,
  setPopups,
  pickupPopups,
  removePickupPopup,
}) => {
  const direction = moveDirectionRef.current;

  // === PROPER DEBUG LOGGING: Only when popups change ===
  // useEffect(() => {
  //   console.log('PlayerLayer - popups updated:', popups);
  // }, [popups]);

  // State
  const [displayImage, setDisplayImage] = useState('/ownemojis/player-image.webp'); // standing by default
  const [currentDirection, setCurrentDirection] = useState(null);
  const timeoutRef = useRef(null);
  const intervalRef = useRef(null);

  // Define frames for each direction
  const frames = {
    left: ['/ownemojis/player-left1.webp', '/ownemojis/player-left2.webp'],
    right: ['/ownemojis/player-left1.webp', '/ownemojis/player-left2.webp'], // mirrored via CSS
    up: ['/ownemojis/player-up1.webp', '/ownemojis/player-up2.webp'],
    down: ['/ownemojis/player-forward1.webp', '/ownemojis/player-forward2.webp'],
    standing: '/ownemojis/player-image.webp'
  };

  // Get frame for direction and index
  const getFrame = (dir, index) => {
    if (!frames[dir]) return frames.standing;
    return frames[dir][index % frames[dir].length];
  };

  // Handle direction change and running animation
  useEffect(() => {
    // Clear existing timers
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (direction) {
      setCurrentDirection(direction);
      // Start with first frame
      setDisplayImage(getFrame(direction, 0));

      // Set interval to alternate frames every 150ms
      let frameIndex = 1;
      intervalRef.current = setInterval(() => {
        setDisplayImage(getFrame(direction, frameIndex));
        frameIndex = (frameIndex + 1) % 2;
      }, 150);

      // Schedule return to standing after 300ms
      timeoutRef.current = setTimeout(() => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setDisplayImage(frames.standing);
        setCurrentDirection(null);
      }, 300);
    } else {
      // Not moving: show standing
      setDisplayImage(frames.standing);
      setCurrentDirection(null);
    }

    // Cleanup on unmount or change
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [direction, moveTrigger]);

  // PlayerLayer.jsx (only the return part)
  return (
    <div
      className="player-layer"
      data-player="true" // 🔥 Alternative selector
      style={{
        position: 'absolute',
        left: '50.5%',
        top: '50.5%',
        width: `${tileSize}px`,
        height: `${tileSize}px`,
        pointerEvents: 'none',
        // zIndex: 1000,
      }}
    >
<div
  className={`player-container standing ${direction ? `enter-from-${direction}` : ''}`}
>
  {/* ← NEW: Only this inner div gets mirrored */}
  <div 
    className="player-sprite-mirror"
    style={{
      backgroundImage: `url(${displayImage})`,
      transform: currentDirection === 'right' ? 'scaleX(-1)' : 'none',
    }}
  />
        {/* === PLAYER UI: NAME + HEALTH BAR === */}
        <div className="player-ui">
          <ActionBar
            type={currentAction}
            value={currentAction === 'health' ? globalPlayerHealth : choppingProgress}
            max={100}
            // no name → defaults to "Player"
            // no isMonster → green bar + tiny name
          />
        </div>
        {/* POPUPS */}
        {popups
          .filter(p => p.isPlayer || p.isHeal || p.isXP)
          .map(popup => (
            <DamagePopup
              key={popup.id}
              damage={popup.dmg}
              isPlayer={popup.isPlayer}
              isHeal={popup.isHeal}
              element={popup.element}
              isXP={popup.isXP}
              isCrit={popup.isCrit}
              onFinish={() => setPopups(prev => prev.filter(p => p.id !== popup.id))}
            />
          ))}
        {pickupPopups.map(popup => (
          <PickupPopup
            key={popup.id}
            item={popup.item}
            onFinish={() => removePickupPopup(popup.id)}
          />
        ))}
      </div>
    </div>
  );
});

export default PlayerLayer;