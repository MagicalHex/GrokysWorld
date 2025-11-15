import React, { memo, useState, useEffect, useRef, useCallback } from 'react';
import { DamagePopup } from './DamagePopup'; // ← ADD
import { PickupPopup } from './PickupPopup';  // ← ADD THIS
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
  popups,           // ← NEW
  addPopup,          // ← NEW  
  setPopups,   // ← NEW: to remove when done
  pickupPopups,        // ← NEW
  removePickupPopup,   // ← NEW
}) => {
    const direction = moveDirectionRef.current;

    // === PROPER DEBUG LOGGING: Only when popups change ===
  useEffect(() => {
    console.log('PlayerLayer - popups updated:', popups);
  }, [popups]);

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

    // PlayerLayer.jsx (only the return part)

return (
  <div
    className="player-layer"
data-player="true"            // 🔥 Alternative selector
  style={{ 
    position: 'absolute',
      left: '50.5%',
      top: '50.5%',
      width: `${tileSize}px`,
      height: `${tileSize}px`,
      position: 'absolute',
      pointerEvents: 'none',
      // zIndex: 1000,
    }}
  >
    <div
      className={`player-container standing ${direction ? `enter-from-${direction}` : ''}`}
      style={{
        backgroundImage: `url(${displayImage})`,
      }}
    >
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
  }
);

export default PlayerLayer;