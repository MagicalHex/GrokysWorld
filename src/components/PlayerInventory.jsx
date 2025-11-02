// PlayerInventory.jsx
import React, { useEffect, useRef, useState } from 'react';
import './PlayerInventory.css';
import { OBJECTS } from './Objects';

const EQUIPMENT_SET = new Set(['dagger', 'sword', 'axe', 'knights-armor', 'short-sword', 'dark-armor', 'wing-armor']);

const InventoryPopup = ({ items, activeQuests = {}, onClose }) => {
  const formatItemName = (item, quantity) => {
    const baseName = item.replace(/object$/i, '');
    const displayName = quantity >= 2 ? `${baseName}s` : baseName;
    return displayName.charAt(0).toUpperCase() + displayName.slice(1);
  };

  // Separate equipment & inventory
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

  // Get active quests
  const activeQuestList = Object.values(activeQuests).filter(q => q.status === 'active');

  return (
    <div className="inventory-popup">
      <div className="inventory-popup__content">
        {/* === EQUIPMENT === */}
        <h2>Equipment</h2>
        {Object.keys(equipmentItems).length > 0 ? (
          <ul>
            {Object.entries(equipmentItems).map(([item, quantity], index) => (
              <li key={index}>
                {OBJECTS[item] && (
                  <span style={{ fontSize: '1.4rem', marginRight: '0.5rem' }}>
                    {OBJECTS[item]}
                  </span>
                )}
                {formatItemName(item, quantity)} x{quantity}
              </li>
            ))}
          </ul>
        ) : (
          <p>No equipment.</p>
        )}

        {/* === INVENTORY === */}
        <h2>Inventory</h2>
        {Object.keys(inventoryItems).length > 0 ? (
          <ul>
            {Object.entries(inventoryItems).map(([item, quantity], index) => (
              <li key={index}>
                {OBJECTS[item] && (
                  <span style={{ fontSize: '1.4rem', marginRight: '0.5rem' }}>
                    {OBJECTS[item]}
                  </span>
                )}
                {formatItemName(item, quantity)} x{quantity}
              </li>
            ))}
          </ul>
        ) : (
          <p>Inventory is empty.</p>
        )}

        {/* === QUESTS === */}
        <h2 style={{ marginTop: '1.5rem', color: '#ff0' }}>Active Quests</h2>
        {activeQuestList.length > 0 ? (
          <ul style={{ color: '#ff0', fontSize: '0.95rem' }}>
            {activeQuestList.map((quest, i) => (
              <li key={i} style={{ marginBottom: '0.5rem' }}>
                <strong>{quest.title}</strong>
                <br />
                <span style={{ color: '#ccc', fontSize: '0.85rem' }}>
                  {quest.description}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ color: '#666' }}>No active quests.</p>
        )}

        <button onClick={onClose}>Close (Right Ctrl)</button>
      </div>
    </div>
  );
};

const PlayerInventory = ({
  inventory,
  setInventory,
  onItemPickup,
  interactionActive,
  activeQuests = {}   // ← NEW
}) => {
  const prevPickupRef = useRef(null);
  const [showInventory, setShowInventory] = useState(false);

  // PICKUP LOGIC
  useEffect(() => {
    if (onItemPickup && onItemPickup !== prevPickupRef.current) {
      const newInventory = {
        ...inventory,
        [onItemPickup]: (inventory[onItemPickup] || 0) + 1,
      };
      setInventory(newInventory);
    }
    prevPickupRef.current = onItemPickup;
  }, [onItemPickup, inventory, setInventory]);

  // TOGGLE INVENTORY
  useEffect(() => {
    const handleKey = (e) => {
      if (e.code === 'ControlRight') {
        setShowInventory(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  return showInventory ? (
    <InventoryPopup
      items={inventory}
      activeQuests={activeQuests}   // ← PASS DOWN
      onClose={() => setShowInventory(false)}
    />
  ) : null;
};

export default PlayerInventory;