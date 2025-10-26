// PlayerInventory.jsx
import React, { useEffect, useRef, useState } from 'react';
import './PlayerInventory.css';

const InventoryPopup = ({ items, onClose }) => {
  const formatItemName = (item, quantity) => {
    const baseName = item.replace(/object$/i, '');
    const displayName = quantity >= 2 ? `${baseName}s` : baseName;
    return displayName.charAt(0).toUpperCase() + displayName.slice(1);
  };

  return (
    <div className="inventory-popup">
      <div className="inventory-popup__content">
        <h2>Inventory</h2>
        {Object.keys(items).length > 0 ? (
          <ul>
            {Object.entries(items).map(([item, quantity], index) => (
              <li key={index}>{formatItemName(item, quantity)} x{quantity}</li>
            ))}
          </ul>
        ) : (
          <p>Inventory is empty.</p>
        )}
        <button onClick={onClose}>Close (Right Ctrl)</button>
      </div>
    </div>
  );
};

const PlayerInventory = ({
  inventory,           // ← from PlayMode (current state)
  setInventory,        // ← from PlayMode (to mutate)
  onItemPickup,        // ← item player just stepped on
  interactionActive,
}) => {
  const prevPickupRef = useRef(null);
  const [showInventory, setShowInventory] = useState(false);

  // ────── PICKUP LOGIC: Only runs on *new* pickup ──────
  useEffect(() => {
    if (onItemPickup && onItemPickup !== prevPickupRef.current) {
      console.log('[PlayerInventory] Picked up:', onItemPickup);

      const newInventory = {
        ...inventory,
        [onItemPickup]: (inventory[onItemPickup] || 0) + 1,
      };

      setInventory(newInventory); // ← Use PlayMode's setter
    }
    prevPickupRef.current = onItemPickup;
  }, [onItemPickup, inventory, setInventory]);

  // ────── RIGHT CTRL TOGGLE ──────
  useEffect(() => {
    const handleKey = (e) => {
      if (e.code === 'ControlRight') {
        setShowInventory((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // ────── RENDER: Use passed `inventory`, not local state ──────
  return showInventory ? (
    <InventoryPopup
      items={inventory} // ← Live from PlayMode
      onClose={() => setShowInventory(false)}
    />
  ) : null;
};

export default PlayerInventory;