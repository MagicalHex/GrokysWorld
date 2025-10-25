import React, { useState } from 'react';

const CHOPPABLE_OBJECTS = new Set(['treeobject','pinetreeobject','lightstoneobject']);
const TALKABLE_OBJECTS   = new Set(['farmerobject','villagerobject','blacksmithobject']);

const CHOP_RESULT = {
  treeobject:      'timberwoodchoppedobject',
  pinetreeobject:  'timberwoodchoppedobject',
  lightstoneobject:'lightstonechoppedobject'
};

const NPC_DIALOGUE = {
  farmerobject: {
    greeting: "Howdy, partner! Need any crops?",
    choices: [
      { key: 'up',    text: "Show me your wares!",   action: () => openShop('farmer') },
      { key: 'left',  text: "Tell me about the village.", action: () => say("It's peaceful here.") },
      { key: 'right', text: "Goodbye.",             action: () => closeDialogue() }
    ]
  }
};

const CHOP_DURATION = 3000;

let openShop, say, closeDialogue;   // will be injected by PlayMode

const InteractionSystem = ({
  playerPos,
  objects,
  onObjectsChange,
  onCancelInteraction
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
        setInteraction({ type:null, active:false, key:null, timer:null });
        onObjectsChange(upd);
      }, CHOP_DURATION);
      setInteraction({ type:'chop', active:true, key:targetKey, timer });
      return;
    }

    // ---- TALKING ----
    if (TALKABLE_OBJECTS.has(obj)) {
      const dlg = NPC_DIALOGUE[obj];
      if (!dlg) return;
      setInteraction({
        type:'talk',
        active:true,
        key:targetKey,
        message:dlg.greeting,
        npc:obj,
        choices:dlg.choices
      });
    }
  };

  const cancelInteraction = () => {
    if (interaction.timer) clearTimeout(interaction.timer);
    setInteraction({ type:null, active:false, key:null, timer:null });
  };

  // expose for PlayMode actions
  openShop = (type) => {
    console.log('Opening shop:', type);
    cancelInteraction();
  };
  say = (txt) => {
    setInteraction(prev => ({
      ...prev,
      message: txt,
      choices: [{ key:'up', text:'Thanks!', action: closeDialogue }]
    }));
  };
  closeDialogue = () => cancelInteraction();

  return {
    handleStartInteraction,
    interaction,          // <-- public state
    cancelInteraction,
    setInteraction,       // <-- needed for `say`
    CHOPPABLE_OBJECTS,
    TALKABLE_OBJECTS
  };
};

export default InteractionSystem;