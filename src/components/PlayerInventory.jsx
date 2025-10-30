// PlayerInventory.jsx
import React, { useEffect, useRef, useState } from 'react';
import './PlayerInventory.css';
import { OBJECTS } from './Objects'; // Adjust path if necessary (matching PickupPopup)

const EQUIPMENT_SET = new Set(['dagger', 'sword', 'axe', 'knights-armor', 'short-sword', 'dark-armor', 'wing-armor']); // Add more equipment base names as needed

const InventoryPopup = ({ items, onClose }) => {
  const formatItemName = (item, quantity) => {
    const baseName = item.replace(/object$/i, '');
    const displayName = quantity >= 2 ? `${baseName}s` : baseName;
    return displayName.charAt(0).toUpperCase() + displayName.slice(1);
  };

  // Separate items into equipment and inventory
  const equipmentItems = {};
  const inventoryItems = {};
  Object.entries(items).forEach(([item, quantity]) => {
    const baseName = item.replace(/object$/i, '');
    if (EQUIPMENT_SET.has(baseName)) {
      equipmentItems[item] = quantity;
    } else {
      inventoryItems[item] = quantity;
    }
  });

  return (
    <div className="inventory-popup">
      <div className="inventory-popup__content">
        <h2>Equipment</h2>
        {Object.keys(equipmentItems).length > 0 ? (
          <ul>
            {Object.entries(equipmentItems).map(([item, quantity], index) => (
              <li key={index}>
                {OBJECTS[item] ? (
                  <span style={{ fontSize: '1.4rem', marginRight: '0.5rem' }}>
                    {OBJECTS[item]}
                  </span>
                ) : null}
                {formatItemName(item, quantity)} x{quantity}
              </li>
            ))}
          </ul>
        ) : (
          <p>No equipment.</p>
        )}
        <h2>Inventory</h2>
        {Object.keys(inventoryItems).length > 0 ? (
          <ul>
            {Object.entries(inventoryItems).map(([item, quantity], index) => (
              <li key={index}>
                {OBJECTS[item] ? (
                  <span style={{ fontSize: '1.4rem', marginRight: '0.5rem' }}>
                    {OBJECTS[item]}
                  </span>
                ) : null}
                {formatItemName(item, quantity)} x{quantity}
              </li>
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