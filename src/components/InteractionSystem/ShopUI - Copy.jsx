// Talking/ShopUI.jsx
import React from 'react';

const formatItemName = (item, quantity) => {
  const baseName = item.replace(/object$/i, '');
  const displayName = quantity >= 2 ? `${baseName}s` : baseName;
  return displayName.charAt(0).toUpperCase() + displayName.slice(1);
};

export const ShopUI = ({ message, items }) => {
  return (
    <div className="shop-bubble">
      <div className="shop-bubble__message">{message}</div>
      <ul className="shop-bubble__items">
        {items.map((item, i) => {
          const icons = ['Up', 'Left', 'Right'];
          return (
            <li key={i} className="shop-bubble__item">
              <span className="shop-bubble__icon">[{icons[i]}]</span>
              <span className={`object ${item.addsToInventory}`}></span>
              {item.name}
              <span className="shop-bubble__cost">
                Cost:{' '}
                {Object.entries(item.cost).map(([k, v], j) => (
                  <span key={j} className="shop-bubble__cost-item">
                    <span className={`object ${k}`}></span>
                    {formatItemName(k, v)} x{v}{j < Object.keys(item.cost).length - 1 ? ', ' : ''}
                  </span>
                ))}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="shop-bubble__hint">Press Down to close</div>
    </div>
  );
};