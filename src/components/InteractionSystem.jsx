// src/components/InteractionSystem.jsx
import React, { useState, useEffect } from 'react';

// === CHOPPABLE OBJECTS ===
const CHOPPABLE_OBJECTS = new Set([
  'treeobject',
  'pinetreeobject',
  'lightstoneobject'  // ← NEW: Mineable!
]);

// === RESULT MAP ===
const CHOP_RESULT = {
  'treeobject': 'timberwoodchoppedobject',
  'pinetreeobject': 'timberwoodchoppedobject',
  'lightstoneobject': 'lightstonechoppedobject'  // ← Customize this!
};

const CHOP_DURATION = 3000; // 3 seconds

const InteractionSystem = ({
  playerPos,
  objects,
  onObjectsChange,
  onCancelChop
}) => {
  const [chopping, setChopping] = useState({
    active: false,
    key: null,
    timer: null
  });

  const handleStartChop = (targetKey) => {
    if (chopping.active) return;

    const targetObj = objects[targetKey];
    if (!CHOPPABLE_OBJECTS.has(targetObj)) return;

    console.log(`Mining started on ${targetKey} (${targetObj})`);

    const timer = setTimeout(() => {
      const updated = { ...objects };
      delete updated[targetKey];
      updated[targetKey] = CHOP_RESULT[targetObj] || 'timberwoodchoppedobject';

      setChopping({ active: false, key: null, timer: null });
      onObjectsChange(updated);
      console.log(`${targetObj.toUpperCase()} MINED! ${updated[targetKey]} placed.`);
    }, CHOP_DURATION);

    setChopping({ active: true, key: targetKey, timer });
  };

  const cancelChop = () => {
    if (!chopping.active || !chopping.timer) return;

    clearTimeout(chopping.timer);
    setChopping({ active: false, key: null, timer: null });
    console.log('Mining canceled — player moved!');
  };

  return { handleStartChop, chopping, cancelChop };
};

export default InteractionSystem;