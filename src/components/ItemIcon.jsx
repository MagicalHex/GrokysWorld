// src/ItemIcon.jsx
import React, { useState } from 'react';
import { OBJECTS } from './Objects';
import { ITEMS } from './ITEMS';
import './ItemIcon.css';

export const RARITY_COLOR = {
  common:   '#bbbbbb',
  uncommon: '#1eff00',
  rare:     '#0070dd',
  epic:     '#a335ee',
};

const ItemIcon = ({
  itemId,
  showName = false,      // set true in shop / tool-tips
  className = 'item-icon',
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const data = ITEMS[itemId] || {};
  const objEmoji = OBJECTS[itemId];

  // 1. Image
  if (data.image && !imgFailed) {
    return (
      <img
        src={data.image}
        alt={data.name}
        className={className}
        onError={() => setImgFailed(true)}
      />
    );
  }

  // 2. Emoji (from ITEMS or from global OBJECTS)
  const emoji = data.emoji ?? (typeof objEmoji === 'string' ? objEmoji : null);
  if (emoji) {
    return <span className={className}>{emoji}</span>;
  }

  // 3. Name (final fallback)
  const name = data.name ?? itemId;
  const color = data.rarity ? RARITY_COLOR[data.rarity] : '#fff';

  return (
    <span className={className} style={{ color }}>
      {showName ? name : '?'}
    </span>
  );
};

export default ItemIcon;