// InteractionConstants.js
export const CHOPPABLE_OBJECTS = new Set(['treeobject', 'pinetreeobject', 'lightstoneobject']);
export const TALKABLE_OBJECTS = new Set(['farmerobject', 'villagerobject', 'blacksmithobject']);

export const CHOP_RESULT = {
  treeobject: 'timberwoodchoppedobject',
  pinetreeobject: 'timberwoodchoppedobject',
  lightstoneobject: 'lightstonechoppedobject'
};

export const CHOP_DROPS = {
  treeobject: 'woodobject',
  pinetreeobject: 'woodobject',
  lightstoneobject: 'rockobject'
};

export const NPC_DIALOGUE = {
  farmerobject: {
    greeting: "Howdy, partner! Need any crops?",
    choices: [
      { key: 'up', text: "Show me your wares!", action: 'openShop', type: 'farmer' },
      { key: 'left', text: "Tell me about the village.", action: 'say', message: "It's peaceful here." },
      { key: 'right', text: "Goodbye.", action: 'close' }
    ]
  }
};

export const SHOP_DATA = {
  farmer: [
    { emoji: '🪚', name: 'Saw', cost: { woodobject: 1, rockobject: 1 }, addsToInventory: 'saw' },
    { emoji: '🪓', name: 'Axe', cost: { woodobject: 3, rockobject: 3 }, addsToInventory: 'axe' },
    { emoji: '🗡️', name: 'Dagger', cost: { woodobject: 2, rockobject: 1 }, addsToInventory: 'dagger' }
  ]
};

export const CHOP_DURATION = 3000;