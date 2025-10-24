// src/components/InteractionSystem.jsx
import React, { useState, useEffect } from 'react';

const CHOP_DURATION = 3000;

const InteractionSystem = ({
  objects,
  playerPos,
  onObjectsChange,
  choppingTarget,
  onChoppingStateChange,
}) => {
  const [chopping, setChopping] = useState({
    active: false,
    key: null,
    timer: null,
  });

  // START CHOPPING
  useEffect(() => {
    if (!choppingTarget || chopping.active) return;

    const timer = setTimeout(() => {
      const updated = { ...objects };
      delete updated[choppingTarget];
      updated[choppingTarget] = 'timberwoodchoppedobject';
      onObjectsChange(updated);

      setChopping({ active: false, key: null, timer: null });
      onChoppingStateChange(null);
      console.log('TREE CHOPPED!');
    }, CHOP_DURATION);

    setChopping({ active: true, key: choppingTarget, timer });
    onChoppingStateChange(choppingTarget);
    console.log(`Chopping started on ${choppingTarget}`);
  }, [choppingTarget, chopping.active, objects, onObjectsChange, onChoppingStateChange]);

  // CANCEL ON MOVE
  useEffect(() => {
    if (!chopping.active) return;

    return () => {
      if (chopping.timer) {
        clearTimeout(chopping.timer);
        setChopping({ active: false, key: null, timer: null });
        onChoppingStateChange(null);
        console.log('Chopping canceled — player moved!');
      }
    };
  }, [playerPos, chopping.active, chopping.timer, onChoppingStateChange]);

  return null;
};

export default InteractionSystem;