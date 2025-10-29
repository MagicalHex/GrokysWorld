// InteractionSystem.jsx
import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { useChopping } from './ChoppingSystem';
import { useTalking } from './TalkingSystem';
import { useQuesting } from './QuestingSystem';
import { ChoppingUI } from './ChoppingUI';
import { TalkingUI } from './TalkingUI';
import { QuestingUI } from './QuestingUI';
import './InteractionSystem.css';

import {
  CHOP_DURATION,
  CHOPPABLE_OBJECTS,
  TALKABLE_OBJECTS
} from './InteractionConstants';

const InteractionSystem = forwardRef(({
  objects,
  onObjectsChange,
  onCancelInteraction,
  rows,
  columns,
  inventory,
  interaction,
  setInteraction,
  tileSize,
  onQueueRespawn,
  spawnMonster,
  onInventoryChange
}, ref) => {

  // === QUEST POPUP ===
  const [questPopup, setQuestPopup] = useState(null);
  const showQuestPopup = (x, y, message) => {
    setQuestPopup({ x, y, message });
    setTimeout(() => setQuestPopup(null), 3500);
  };

  // === SYSTEMS ===
  const { startChopping } = useChopping({
    objects, onObjectsChange, interaction, setInteraction,
    rows, columns, onQueueRespawn, CHOP_DURATION
  });

  const { startTalking, closeDialogue } = useTalking({
    objects, interaction, setInteraction, inventory, onInventoryChange, onCancelInteraction
  });

  const { startOpening } = useQuesting({
    objects, onObjectsChange, onInventoryChange, interaction, setInteraction, showQuestPopup, spawnMonster
  });

  // === PUBLIC API ===
  const handleStartInteraction = (targetKey) => {
    if (interaction.active) return;
    startChopping(targetKey) || startTalking(targetKey) || startOpening(targetKey);
  };

  const cancelInteraction = () => {
    if (interaction.timer) clearTimeout(interaction.timer);
    setInteraction({ type: null, active: false, key: null, timer: null });
    onCancelInteraction?.();
  };

  useImperativeHandle(ref, () => ({
    handleStartInteraction,
    cancelInteraction,
    CHOPPABLE_OBJECTS,
    TALKABLE_OBJECTS
  }));

  // === TALK ARROW KEYS ===
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
  if (!interaction.active && !questPopup) return null;

  const chopX = interaction.type === 'chop' && interaction.key ? Number(interaction.key.split(',')[0]) : null;
  const chopY = interaction.type === 'chop' && interaction.key ? Number(interaction.key.split(',')[1]) : null;

  return (
    <>
      {interaction.type === 'talk' && (
        <TalkingUI message={interaction.message} choices={interaction.choices} />
      )}

      <ChoppingUI x={chopX} y={chopY} tileSize={tileSize} />

      <QuestingUI questPopup={questPopup} tileSize={tileSize} onClose={() => setQuestPopup(null)} />
    </>
  );
});

export default InteractionSystem;