// PlayerInventory.jsx
import React, { useEffect, useRef, useState } from 'react';
import './PlayerInventory.css';
import { OBJECTS } from './Objects';
import ItemIcon, { RARITY_COLOR } from './ItemIcon';
import { ITEMS } from './Items';

// ---------------------------------------------------------------------
// 1. Equipment categories
// ---------------------------------------------------------------------
const CATEGORY = {
  BOW:   'bow',
  ARMOR: 'armor',
  SWORD: 'sword',
};

const CATEGORY_SET = {
  [CATEGORY.BOW]:   new Set(['bow']),
  [CATEGORY.ARMOR]: new Set(['knights-armor','dark-armor','wing-armor']),
  [CATEGORY.SWORD]: new Set(['dagger','sword','axe','short-sword']),
};

// ---------------------------------------------------------------------
// 2. Helper: get numeric stat for an item
// ---------------------------------------------------------------------
const getStat = (itemId, type) => {
  const data = ITEMS[itemId] || {};
  return data.stats?.[type] || 0;
};

// ---------------------------------------------------------------------
// 3. Core inventory manager (pure function – no React)
// ---------------------------------------------------------------------
const splitInventory = (raw) => {
  const equip = {};
  const inv = { ...raw };

  const candidates = {
    [CATEGORY.BOW]:   [],
    [CATEGORY.ARMOR]: [],
    [CATEGORY.SWORD]: [],
  };

  for (const id of Object.keys(raw)) {
    const qty = raw[id];
    if (qty === 0) continue;

    for (const cat of Object.values(CATEGORY)) {
      if (CATEGORY_SET[cat].has(id)) {
        for (let i = 0; i < qty; i++) candidates[cat].push(id);
        break;
      }
    }
  }

  const pickBest = (ids, stat) => {
    if (ids.length === 0) return undefined;
    return ids.reduce((best, cur) =>
      getStat(cur, stat) > getStat(best, stat) ? cur : best
    );
  };

  // Bow
  const bestBow = pickBest(candidates[CATEGORY.BOW], 'attack');
  if (bestBow) {
    equip.bow = bestBow;
    inv[bestBow] = (inv[bestBow] ?? 0) - 1;
    if (inv[bestBow] === 0) delete inv[bestBow];
  }

  // Armor
  const bestArmor = pickBest(candidates[CATEGORY.ARMOR], 'defense');
  if (bestArmor) {
    equip.armor = bestArmor;
    inv[bestArmor] = (inv[bestArmor] ?? 0) - 1;
    if (inv[bestArmor] === 0) delete inv[bestArmor];
  }

  // Sword
  const bestSword = pickBest(candidates[CATEGORY.SWORD], 'attack');
  if (bestSword) {
    equip.sword = bestSword;
    inv[bestSword] = (inv[bestSword] ?? 0) - 1;
    if (inv[bestSword] === 0) delete inv[bestSword];
  }

  return { equipment: equip, inventory: inv };
};

// ---------------------------------------------------------------------
// 4. Popup UI – now with three columns
// ---------------------------------------------------------------------
const InventoryPopup = ({
  equipment,
  inventory,
  activeQuests = {},
  onClose,
}) => {
  const formatName = (id) => {
    const base = id.replace(/object$/i, '');
    return base.charAt(0).toUpperCase() + base.slice(1);
  };

  const activeQuestList = Object.values(activeQuests).filter(
    (q) => q.status === 'active'
  );

  return (
    <div className="inventory-popup">
      <div className="inventory-popup__content inventory-grid">
        
        {/* ==== COLUMN 1: EQUIPMENT ==== */}
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
                      <span
                        className="inventory-item__name"
                        style={{ color: rarityColor }}
                      >
                        {formatName(id)}
                      </span>
                    </div>
                    {item.description && (
                      <div className="inventory-item__desc">
                        {item.description}
                      </div>
                    )}
                    {item.sell?.gold && (
                      <div className="inventory-item__sell">
                        Sell: {item.sell.gold} gold
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* ==== COLUMN 2: INVENTORY ==== */}
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
                      <span
                        className="inventory-item__name"
                        style={{ color: rarityColor }}
                      >
                        {displayName}{' '}
                        <span className="quantity">x{qty}</span>
                      </span>
                    </div>
                    {item.description && (
                      <div className="inventory-item__desc">
                        {item.description}
                      </div>
                    )}
                    {item.sell?.gold && (
                      <div className="inventory-item__sell">
                        Sell: {item.sell.gold} gold
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* ==== COLUMN 3: QUESTS ==== */}
        <div className="inventory-column">
          <h2 style={{ color: '#ff0' }}>Active Quests</h2>
          {activeQuestList.length > 0 ? (
            <ul style={{ color: '#ff0', fontSize: '0.95rem', paddingLeft: '1.2rem' }}>
              {activeQuestList.map((quest, i) => (
                <li key={i} style={{ marginBottom: '0.75rem' }}>
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
        </div>

        {/* Close button – spans all columns */}
        <div className="inventory-close-full">
          <button onClick={onClose}>Close (Right Ctrl)</button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------
// 5. Main component
// ---------------------------------------------------------------------
const PlayerInventory = ({
  inventory: rawInventory,
  setInventory,
  onItemPickup,
  interactionActive,
  activeQuests = {},
}) => {
  const prevPickupRef = useRef(null);
  const [showInventory, setShowInventory] = useState(false);

  useEffect(() => {
    if (
      onItemPickup &&
      onItemPickup !== prevPickupRef.current &&
      ITEMS[onItemPickup]
    ) {
      const newRaw = {
        ...rawInventory,
        [onItemPickup]: (rawInventory[onItemPickup] || 0) + 1,
      };
      setInventory(newRaw);
    }
    prevPickupRef.current = onItemPickup;
  }, [onItemPickup, rawInventory, setInventory]);

  useEffect(() => {
    const handler = (e) => {
      if (e.code === 'ControlRight') setShowInventory((p) => !p);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const { equipment, inventory } = splitInventory(rawInventory);

  return showInventory ? (
    <InventoryPopup
      equipment={equipment}
      inventory={inventory}
      activeQuests={activeQuests}
      onClose={() => setShowInventory(false)}
    />
  ) : null;
};

export default PlayerInventory;