// InteractionSystem.jsx
import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import './InteractionSystem.css';
import ProgressBar from './ProgressBar';

// IMPORT ALL FROM CONSTANTS
import {
  CHOPPABLE_OBJECTS,
  TALKABLE_OBJECTS,
  CHOP_RESULT,
  CHOP_DROPS,
  NPC_DIALOGUE,
  SHOP_DATA,
  CHOP_DURATION
} from './InteractionConstants';

const InteractionSystem = forwardRef(({
  playerPos,
  objects,
  onObjectsChange,
  onCancelInteraction,
  rows,
  columns,
  inventory,
  setInventory,
  interaction,        // ← ADD HERE
  setInteraction,     // ← ADD HERE
  tileSize,
  onQueueRespawn,
  onInventoryChange
}, ref) => {

  // === CHOPPING LOGIC ===
  const startChopping = (targetKey) => {
    if (interaction.active) return;
    const obj = objects[targetKey];
    if (!CHOPPABLE_OBJECTS.has(obj)) return;

    const timer = setTimeout(() => {
      const upd = { ...objects };
      delete upd[targetKey];
      upd[targetKey] = CHOP_RESULT[obj]; // e.g. 'timberwoodchoppedobject'

      // Drop item nearby
      const [x, y] = targetKey.split(',').map(Number);
      const dropItem = CHOP_DROPS[obj];
      let dropKey = null;

      for (let d = 1; d <= Math.max(rows, columns); d++) {
        for (let dx = -d; dx <= d; dx++) {
          for (let dy = -d; dy <= d; dy++) {
            if (Math.abs(dx) !== d && Math.abs(dy) !== d) continue;
            const nx = x + dx, ny = y + dy;
            const key = `${nx},${ny}`;
            if (nx >= 0 && nx < columns && ny >= 0 && ny < rows && !upd[key]) {
              dropKey = key;
              break;
            }
          }
          if (dropKey) break;
        }
        if (dropKey) break;
      }

if (dropKey) upd[dropKey] = dropItem;
    onObjectsChange(upd);

    // FIXED: Pass the ORIGINAL type
    onQueueRespawn({ key: targetKey, type: obj }); // ← obj is 'treeobject' or 'lightstoneobject'

    setInteraction({ type: null, active: false, key: null, timer: null });
  }, CHOP_DURATION);

  setInteraction({ type: 'chop', active: true, key: targetKey, timer });
};

  // === TALKING LOGIC ===
  const startTalking = (targetKey) => {
    const obj = objects[targetKey];
    if (!TALKABLE_OBJECTS.has(obj)) return;

    const dlg = NPC_DIALOGUE[obj];
    if (!dlg) return;

    const choices = dlg.choices.map(c => ({
      ...c,
      action: () => handleChoiceAction(c.action, c.type || c.message)
    }));

    setInteraction({
      type: 'talk',
      active: true,
      key: targetKey,
      message: dlg.greeting,
      npc: obj,
      choices
    });
  };

  // === CHOICE HANDLER ===
  const handleChoiceAction = (action, payload) => {
    if (action === 'openShop') openShop(payload);
    else if (action === 'say') say(payload);
    else if (action === 'close') closeDialogue();
  };
  
  // === ARROW KEY HANDLER (only for talk) ===
  useEffect(() => {
    if (!interaction.active || interaction.type !== 'talk') return;

    const handleKey = (e) => {
      const map = { ArrowUp: 0, ArrowLeft: 1, ArrowRight: 2 };
      if (e.key === 'ArrowDown') {
        closeDialogue();
        return;
      }

      const idx = map[e.key];
      if (idx !== undefined && interaction.choices?.[idx]) {
        interaction.choices[idx].action();
      }
    };

    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
  }, [interaction.active, interaction.type, interaction.choices]);

  // === SHOP ===
  const openShop = (type) => {
    const items = SHOP_DATA[type];
    if (!items) {
      say("Sorry, I don't have anything right now.");
      return;
    }

    const arrowIcons = ['Left', 'Up', 'Right'];
    const lines = items.map((it, i) =>
      `${it.emoji} **${it.name}** – ${Object.entries(it.cost)
        .map(([k, v]) => `${v} ${k}`).join(', ')}`
    );

    const choices = items.map((it, i) => ({
      key: ['left', 'up', 'right'][i],
      text: `Buy ${it.name}`,
      action: () => buyItem(it)
    }));

    setInteraction(prev => ({
      ...prev,
      message: lines.join('\n'),
      choices
    }));
  };

const buyItem = (item) => {
  // ---- LOG WHAT THE MERCHANT SEES ----
  console.log('%c[Merchant] Current inventory:', 'color:orange', inventory);
  console.log('%c[Merchant] Required cost:', 'color:orange', item.cost);

  const hasEnough = Object.entries(item.cost).every(([res, amt]) => {
    const owned = inventory[res] ?? 0;
    console.log(`  → ${res}: need ${amt}, have ${owned}`);
    return owned >= amt;
  });

  if (!hasEnough) {
    say("You don't have enough materials!");
    return;
  }

  const newInv = { ...inventory };
  Object.entries(item.cost).forEach(([res, amt]) => {
    newInv[res] -= amt;
    if (newInv[res] <= 0) delete newInv[res];
  });
  newInv[item.addsToInventory] = (newInv[item.addsToInventory] ?? 0) + 1;

  console.log('%c[Merchant] Purchase SUCCESS → newInv:', 'color:lime', newInv);
  onInventoryChange(newInv);
  say(`You bought the **${item.name}**!`);
};

  const say = (txt) => {
    setInteraction(prev => ({
      ...prev,
      message: txt,
      choices: [{ key: 'up', text: 'Thanks!', action: closeDialogue }]
    }));
  };

  const closeDialogue = () => {
    if (interaction.timer) clearTimeout(interaction.timer);
    setInteraction({ type: null, active: false, key: null, timer: null });
    onCancelInteraction?.();
  };

  // === PUBLIC API ===
  const handleStartInteraction = (targetKey) => {
    if (interaction.active) return;
    startChopping(targetKey) || startTalking(targetKey);
  };

  const cancelInteraction = () => {
    if (interaction.timer) clearTimeout(interaction.timer);
    setInteraction({ type: null, active: false, key: null, timer: null });
    onCancelInteraction?.();
  };

  // Expose to parent via ref
  useImperativeHandle(ref, () => ({
    handleStartInteraction,
    // interaction,
    cancelInteraction,
    CHOPPABLE_OBJECTS,
    TALKABLE_OBJECTS
  }));

  // === ARROW KEYS (talk only) ===
  useEffect(() => {
    if (!interaction.active || interaction.type !== 'talk') return;

    const handleKey = (e) => {
      const map = { ArrowUp: 0, ArrowLeft: 1, ArrowRight: 2 };
      if (e.key === 'ArrowDown') { cancelInteraction(); return; }
      const idx = map[e.key];
      if (idx !== undefined && interaction.choices?.[idx]) {
        interaction.choices[idx].action();
      }
    };
    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
  }, [interaction.active, interaction.type, interaction.choices]);

  // === RENDER ===
  if (!interaction.active) return null;

  if (interaction.type === 'talk') {
    return (
      <div className="chat-bubble">
        <div style={{ fontSize: '40px' }}>🛠️</div>
        <div className="chat-bubble__message">
{interaction.message.split('\n').map((line, i) => {
  // Split by **bold** markers and render <strong>
  const parts = line.split(/\*\*(.*?)\*\*/g);
  return (
    <div key={i}>
      {parts.map((part, idx) =>
        idx % 2 === 1 ? (
          <strong key={idx}>{part}</strong>
        ) : (
          <React.Fragment key={idx}>{part}</React.Fragment>
        )
      )}
    </div>
  );
})}
        </div>
        {interaction.choices && (
          <div className="chat-bubble__choices">
            {interaction.choices.slice(0, 3).map((c, i) => {
              const icons = ['Up', 'Left', 'Right'];
              return (
                <div key={i} className="chat-bubble__choice">
                  <span className="chat-bubble__icon">[{icons[i]}]</span>
                  {c.text}
                </div>
              );
            })}
          </div>
        )}
        <div className="chat-bubble__hint">Press Down to walk away</div>
      </div>
    );
  }
if (interaction.type === 'chop' && interaction.key && tileSize != null) {
  const [x, y] = interaction.key.split(',').map(Number);
  if (isNaN(x) || isNaN(y)) return null;

  const left = x * tileSize;
  const top = y * tileSize;

  return (
<div
  style={{
    position: 'absolute',
    left: `${left}px`,
    top: `${top}px`,
    width: tileSize,
    height: tileSize,
    pointerEvents: 'none',
    zIndex: 10,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingBottom: '10px',  // above ground
  }}
>
  <ProgressBar />
</div>
  );
}

return null;
});

export default InteractionSystem;