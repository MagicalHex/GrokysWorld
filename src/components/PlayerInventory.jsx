// PlayerInventory.jsx
import React, { useState, useEffect } from 'react';
import './PlayerInventory.css';

const InventoryPopup = ({ items, onClose }) => {
  // Helper function to format item names
  const formatItemName = (item, quantity) => {
    // Remove 'object' suffix
    const baseName = item.replace(/object$/i, '');
    // Pluralize if quantity >= 2
    const displayName = quantity >= 2 ? `${baseName}s` : baseName;
    // Capitalize first letter
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

const PlayerInventory = ({ interactionActive, onItemPickup, onInventoryChange }) => {
  const [inventory, setInventory] = useState({});
  const prevPickupRef = React.useRef(null); // Track previous value

  // Handle item pickups — ONLY on transition from null/undefined to a value
  useEffect(() => {
    // Only trigger if we JUST picked up something new (not standing on it)
    if (onItemPickup && onItemPickup !== prevPickupRef.current) {
      console.log('[PlayerInventory] Picked up item:', onItemPickup);

      const newInventory = {
        ...inventory,
        [onItemPickup]: (inventory[onItemPickup] || 0) + 1
      };

      setInventory(newInventory);
      if (onInventoryChange) onInventoryChange(newInventory);
    }

    // Update ref to current value
    prevPickupRef.current = onItemPickup;
  }, [onItemPickup, inventory, onInventoryChange]);

  // Right Ctrl key handler
  useEffect(() => {
    const handleInventoryToggle = (e) => {
      if (e.code === 'ControlRight') {
        setShowInventory(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleInventoryToggle);
    return () => window.removeEventListener('keydown', handleInventoryToggle);
  }, []);

  const [showInventory, setShowInventory] = useState(false);

  return showInventory ? <InventoryPopup items={inventory} onClose={() => setShowInventory(false)} /> : null;
};

export default PlayerInventory;