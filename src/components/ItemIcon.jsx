// ItemIcon.jsx
import React, { useState } from 'react';
import { OBJECTS } from './Objects';
import { ITEMS } from './ITEMS';

const ItemIcon = ({ itemId, alt, className = "inventory-item-icon" }) => {
  const [failed, setFailed] = useState(false);
  const itemData = ITEMS[itemId];
  const objectEmoji = OBJECTS[itemId];

  // 1. Try image from ITEMS
  if (itemData?.image) {
    if (failed) {
      return <span className={className}>{itemData.fallback}</span>;
    }
    return (
      <img
        src={itemData.image}
        alt={alt}
        className={className}
        onError={() => setFailed(true)}
      />
    );
  }

  // 2. Try emoji from OBJECTS (wood, gold, etc.)
  if (typeof objectEmoji === 'string' && objectEmoji && !objectEmoji.startsWith('/')) {
    return <span className={className}>{objectEmoji}</span>;
  }

  // 3. Fallback
  return <span className={className}>question</span>;
};

export default ItemIcon;