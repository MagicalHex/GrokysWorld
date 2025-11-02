// InteractionConstants.js
export const CHOPPABLE_OBJECTS = new Set(['treeobject', 'pinetreeobject', 'lightstoneobject']);
export const TALKABLE_OBJECTS = new Set(['farmer001', 'mechanic001', 'villagerobject', 'blacksmithobject']);

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
  farmer001: {
    icon: 'Farmer',
    greeting: "Howdy, partner! Need any crops?",
    choices: [
      { key: 'up',   text: "Show me your wares!", action: 'openShop', type: 'equipment' },
      { key: 'left', text: "Tell me about the village.", action: 'say', message: "It's peaceful here." },
      { key: 'right',text: "Goodbye.",               action: 'close' }
    ]
  },
  mechanic001: {
    icon: 'Mechanic',
    greeting: "Hello, partner! Need anything?",
    choices: [
      { key: 'up',   text: "Show me your wares!", action: 'openShop', type: 'weapons' },
      { key: 'left', text: "Tell me about the village.", action: 'say', message: "It's peaceful here." },
      { key: 'right',text: "Goodbye.",               action: 'close' }
    ]
  }
};

export const SHOP_DATA = {
  equipment: [
    { image: 'ownemojis/saw.webp',        name: 'Saw',          fallback: 'Saw',   cost: { woodobject: 1, rockobject: 1 }, addsToInventory: 'saw' },
    { image: 'ownemojis/axe.webp',        name: 'Axe',          fallback: 'Axe',   cost: { woodobject: 3, rockobject: 3 }, addsToInventory: 'axe' }
  ],
  weapons: [
    { image: 'ownemojis/dagger.webp',     name: 'Dagger',       fallback: 'Dagger',cost: { woodobject: 2, rockobject: 1 }, addsToInventory: 'dagger' },
    { image: 'ownemojis/short-sword.webp',name: 'Short Sword',  fallback: 'Short Sword',cost: { woodobject: 4, rockobject: 2 }, addsToInventory: 'shortsword' }
  ]
};

export const CHOP_DURATION = 3000;

export const OPENABLE_OBJECTS = new Set(['chest-closed']);

export const OPEN_RESULT = {
  'chest-closed': 'chest-open'
};

export const OPEN_DROPS = {
  'chest-closed': 'dungeon key'
};

export const OPEN_MESSAGES = {
  'chest-closed': "You just found a key! ... and something doesn't feel right."
};