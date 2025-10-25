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

const PlayerInventory = ({ interactionActive, onItemPickup }) => {
  const [inventory, setInventory] = useState({});

  // Handle item pickups
  useEffect(() => {
    if (onItemPickup) {
      console.log('[PlayerInventory] Picked up item:', onItemPickup); // Debug log
      setInventory(prev => ({
        ...prev,
        [onItemPickup]: (prev[onItemPickup] || 0) + 1
      }));
    }
  }, [onItemPickup]);

  // Right Ctrl key handler for inventory toggle
  useEffect(() => {
    const handleInventoryToggle = (e) => {
      if (e.code === 'ControlRight') {
        console.log('[PlayerInventory] Right Ctrl (ControlRight) pressed – toggling inventory');
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