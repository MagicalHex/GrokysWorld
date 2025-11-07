// PlayerInventory.jsx
import React, { useEffect, useState, useMemo } from 'react';
import './PlayerInventory.css';
import ItemIcon, { RARITY_COLOR } from './ItemIcon';
import { ITEMS } from './Items';
import { splitInventory } from './splitInventory'; // ← Re-enable if you want full logic

const InventoryPopup = ({ equipment, inventory, activeQuests = {}, onClose }) => {
  const formatName = (id) => {
    const base = id.replace(/object$/i, '');
    return base.charAt(0).toUpperCase() + base.slice(1);
  };

  const activeQuestList = Object.values(activeQuests).filter(q => q.status === 'active');

  return (
    <div className="inventory-popup">
      <div className="inventory-popup__content inventory-grid">
        {/* EQUIPMENT */}
        <div className="inventory-column">
          <h2>Equipment</h2>
          {Object.keys(equipment).length === 0 ? (
            <p>No equipment.</p>
          ) : (
            <ul className="inventory-list">
              {Object.entries(equipment).map(([slot, id]) => {
                const item = ITEMS[id] || {};
                const rarityColor = RARITY_COLOR[item.rarity] || '#fff';
                return (
                  <li key={slot} className="inventory-item">
                    <div className="inventory-item__header">
                      <ItemIcon itemId={id} className="item-icon" />
                      <span className="inventory-item__name" style={{ color: rarityColor }}>
                        {formatName(id)}
                      </span>
                    </div>
                    {item.description && <div className="inventory-item__desc">{item.description}</div>}
                    {item.sell?.gold && <div className="inventory-item__sell">Sell: {item.sell.gold} gold</div>}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* INVENTORY */}
        <div className="inventory-column">
          <h2>Inventory</h2>
          {Object.keys(inventory).length === 0 ? (
            <p>Inventory is empty.</p>
          ) : (
            <ul className="inventory-list">
              {Object.entries(inventory).map(([id, qty]) => {
                const item = ITEMS[id] || {};
                const displayName = formatName(id);
                const rarityColor = RARITY_COLOR[item.rarity] || '#fff';
                return (
                  <li key={id} className="inventory-item">
                    <div className="inventory-item__header">
                      <ItemIcon itemId={id} className="item-icon" />
                      <span className="inventory-item__name" style={{ color: rarityColor }}>
                        {displayName} <span className="quantity">x{qty}</span>
                      </span>
                    </div>
                    {item.description && <div className="inventory-item__desc">{item.description}</div>}
                    {item.sell?.gold && <div className="inventory-item__sell">Sell: {item.sell.gold} gold</div>}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* QUESTS */}
        <div className="inventory-column">
          <h2 style={{ color: '#ff0' }}>Active Quests</h2>
          {activeQuestList.length > 0 ? (
            <ul style={{ color: '#ff0', fontSize: '0.95rem', paddingLeft: '1.2rem' }}>
              {activeQuestList.map((quest, i) => (
                <li key={i} style={{ marginBottom: '0.75rem' }}>
                  <strong>{quest.title}</strong>
                  <br />
                  <span style={{ color: '#ccc', fontSize: '0.85rem' }}>{quest.description}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: '#666' }}>No active quests.</p>
          )}
        </div>

        <div className="inventory-close-full">
          <button onClick={onClose}>Close (Right Ctrl)</button>
        </div>
      </div>
    </div>
  );
};

// MAIN COMPONENT
const PlayerInventory = ({
  inventory: globalInventory,
  equipment, // ← from useEquipment in parent
  onInventoryChange,
  activeQuests = {},
}) => {
  const [showInventory, setShowInventory] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      if (e.code === 'ControlRight') setShowInventory(p => !p);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Compute clean inventory (remove equipped items)
  const inventory = useMemo(() => {
    if (!globalInventory) return {};
    const result = { ...globalInventory };
    Object.values(equipment || {}).forEach(id => {
      if (result[id] > 0) {
        result[id]--;
        if (result[id] <= 0) delete result[id];
      }
    });
    return result;
  }, [globalInventory, equipment]);

  return showInventory ? (
    <InventoryPopup
      equipment={equipment}
      inventory={inventory}   // ← Now defined!
      activeQuests={activeQuests}
      onClose={() => setShowInventory(false)}
    />
  ) : null;
};

export default PlayerInventory;