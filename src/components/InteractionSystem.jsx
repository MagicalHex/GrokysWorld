// InteractionSystem.jsx
import React, { useState } from 'react';
import './InteractionSystem.css';

const CHOPPABLE_OBJECTS = new Set(['treeobject', 'pinetreeobject', 'lightstoneobject']);
const TALKABLE_OBJECTS = new Set(['farmerobject', 'villagerobject', 'blacksmithobject']);

const CHOP_RESULT = {
  treeobject: 'timberwoodchoppedobject',
  pinetreeobject: 'timberwoodchoppedobject',
  lightstoneobject: 'lightstonechoppedobject'
};

// Map chopped objects to dropped items
const CHOP_DROPS = {
  treeobject: 'woodobject',
  pinetreeobject: 'woodobject',
  lightstoneobject: 'rockobject'
};

const NPC_DIALOGUE = {
  farmerobject: {
    greeting: "Howdy, partner! Need any crops?",
    choices: [
      { key: 'up', text: "Show me your wares!", action: () => openShop('farmer') },
      { key: 'left', text: "Tell me about the village.", action: () => say("It's peaceful here.") },
      { key: 'right', text: "Goodbye.", action: () => closeDialogue() }
    ]
  }
};
/** --------------------------------------------------------------
 *  SHOP DEFINITION – keep it next to NPC_DIALOGUE for easy editing
 *  -------------------------------------------------------------- */
const SHOP_DATA = {
  farmer: [
    { emoji: '🪚', name: 'Saw', cost: { woodobject: 1, rockobject: 1 }, addsToInventory: 'saw' },
    { emoji: '🪓', name: 'Axe', cost: { woodobject: 3, rockobject: 3 }, addsToInventory: 'axe' },
    { emoji: '🗡️', name: 'Dagger', cost: { woodobject: 2, rockobject: 1 }, addsToInventory: 'dagger' }
  ]
};

const CHOP_DURATION = 3000;

let openShop, say, closeDialogue;

const InteractionSystem = ({
  playerPos,
  objects,
  onObjectsChange,
  onCancelInteraction,
      rows,
    columns,
      onItemPickup,
  inventory, // New: Receive inventory
  setInventory // New: Receive setInventory
}) => {
  const [interaction, setInteraction] = useState({
    type: null,
    active: false,
    key: null,
    timer: null,
    message: null,
    npc: null,
    choices: null
  });

  const handleStartInteraction = (targetKey) => {
    if (interaction.active) return;
    const obj = objects[targetKey];

// ---- CHOPPING ----
    if (CHOPPABLE_OBJECTS.has(obj)) {
      const timer = setTimeout(() => {
        const upd = { ...objects };
        delete upd[targetKey];
        upd[targetKey] = CHOP_RESULT[obj];

        // Drop item in the nearest empty tile
        const [x, y] = targetKey.split(',').map(Number);
        const dropItem = CHOP_DROPS[obj];

        // Spiral search for the first empty tile
        let dropKey = null;
        for (let distance = 1; distance <= Math.max(rows, columns); distance++) {
          // Check tiles at current distance in a square spiral
          for (let dx = -distance; dx <= distance; dx++) {
            for (let dy = -distance; dy <= distance; dy++) {
              // Skip if not on the boundary of the current distance layer
              if (Math.abs(dx) !== distance && Math.abs(dy) !== distance) continue;

              const newX = x + dx;
              const newY = y + dy;
              const key = `${newX},${newY}`;

              // Check if tile is valid and empty
              if (
                newX >= 0 && newX < columns && // Within grid bounds
                newY >= 0 && newY < rows &&
                !upd[key] // Tile is empty
              ) {
                dropKey = key;
                break; // Exit inner loop
              }
            }
            if (dropKey) break; // Exit outer loop if a tile is found
          }
          if (dropKey) break; // Exit distance loop if a tile is found
        }

        if (dropKey) {
          upd[dropKey] = dropItem;
          console.log(`[InteractionSystem] Dropped ${dropItem} at ${dropKey}`);
        } else {
          console.log(`[InteractionSystem] No valid tile to drop ${dropItem} near ${targetKey}`);
        }

        setInteraction({ type: null, active: false, key: null, timer: null });
        onObjectsChange(upd);
      }, CHOP_DURATION);
      setInteraction({ type: 'chop', active: true, key: targetKey, timer });
      return;
    }

    // ---- TALKING ----
    if (TALKABLE_OBJECTS.has(obj)) {
      const dlg = NPC_DIALOGUE[obj];
      if (!dlg) return;
      setInteraction({
        type: 'talk',
        active: true,
        key: targetKey,
        message: dlg.greeting,
        npc: obj,
        choices: dlg.choices
      });
    }
  };

  const cancelInteraction = () => {
    if (interaction.timer) clearTimeout(interaction.timer);
    setInteraction({ type: null, active: false, key: null, timer: null });
  };

openShop = (type) => {
  const items = SHOP_DATA[type];
  if (!items) {
    say("Sorry, I don't have anything right now.");
    return;
  }

  // Format each item as a line with its arrow
  const arrowIcons = ['Left', 'Up', 'Right'];
  const lines = items.map((it, i) => 
    `[${arrowIcons[i]}] ${it.emoji} **${it.name}** – ${Object.entries(it.cost)
      .map(([k, v]) => `${v} ${k}`).join(', ')}`
  );

  // Create one choice per item
  const choices = items.map((it, i) => ({
    key: ['left', 'up', 'right'][i],
    text: `Buy ${it.name}`,
    action: () => buyItem(it)  // We'll define this next
  }));

  setInteraction(prev => ({
    ...prev,
    message: lines.join('\n'),
    choices
  }));
};
  const buyItem = (item) => {
    // Check if player has enough resources
    const hasEnough = Object.entries(item.cost).every(([res, amt]) => 
      (inventory[res] || 0) >= amt
    );

    if (!hasEnough) {
      say("You don't have enough materials!");
      return;
    }

    // Deduct cost
    const newInventory = { ...inventory };
    Object.entries(item.cost).forEach(([res, amt]) => {
      newInventory[res] -= amt;
      if (newInventory[res] === 0) delete newInventory[res];
    });

    // Add bought item
    newInventory[item.addsToInventory] = (newInventory[item.addsToInventory] || 0) + 1;

    setInventory(newInventory);
    say(`You bought the **${item.name}**!`);
  };
  
  say = (txt) => {
    setInteraction(prev => ({
      ...prev,
      message: txt,
      choices: [{ key: 'up', text: 'Thanks!', action: closeDialogue }]
    }));
  };
  closeDialogue = () => cancelInteraction();

  return {
    handleStartInteraction,
    interaction,
    cancelInteraction,
    setInteraction,
    CHOPPABLE_OBJECTS,
    TALKABLE_OBJECTS
  };
};

export default InteractionSystem;