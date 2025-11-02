// InteractionConstants.js
export const CHOPPABLE_OBJECTS = new Set(['treeobject', 'pinetreeobject', 'lightstoneobject']);
export const TALKABLE_OBJECTS = new Set(['farmer001', 'mechanic001', 'villagerobject', 'blacksmithobject', 'campfireshaman']);

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

// InteractionConstants.js
export const QUESTS = {
  collect_stones_wood: {
    id: 'collect_stones_wood',
    title: 'Gather Resources',
    description: 'Collect 5 stones and 5 wood for the fire.',
    objectives: [
      { item: 'rockobject', required: 5 },
      { item: 'woodobject', required: 5 }
    ],
    reward: { gold: 10 },
    nextQuest: 'collect_spider_webs'
  },
  collect_spider_webs: {
    id: 'collect_spider_webs',
    title: 'Spider Silk',
    description: 'Bring me 5 spider webs from the cave.',
     objectives: [
      { item: 'spiderweb', required: 5 }
    ],
    reward: { gold: 20 },
    nextQuest: 'collect_dungeon_key'
  },
  collect_dungeon_key: {
    id: 'collect_dungeon_key',
    title: 'The Lost Key',
    description: 'Find the dungeon key in the old chest.',
    objectives: [
      { item: 'dungeon key', required: 1 }
    ],
    reward: { gold: 25 },
    nextQuest: null
  }
};

// Quest giver dialogue (auto-advances based on state)
export const QUEST_DIALOGUE = {
  campfireshaman: {
    icon: 'Crystal Ball',
    getDialogue: (activeQuests, inventory) => {
      const first = QUESTS.collect_stones_wood;
      const second = QUESTS.collect_spider_webs;
      const third = QUESTS.collect_dungeon_key;

      // Check completion
      const isFirstDone = activeQuests[first.id]?.status === 'completed';
      const isSecondDone = activeQuests[second.id]?.status === 'completed';

      // Determine current quest
      let currentQuest = null;
      if (!activeQuests[first.id]) currentQuest = first;
      else if (!isFirstDone) currentQuest = first;
      else if (!activeQuests[second.id]) currentQuest = second;
      else if (!isSecondDone) currentQuest = second;
      else if (!activeQuests[third.id]) currentQuest = third;
      else if (!isSecondDone) currentQuest = third;

      if (!currentQuest) {
        return {
          greeting: "You've done all I asked. The fire burns bright!",
          choices: [{ key: 'up', text: "Thank you!", action: 'close' }]
        };
      }

      const isActive = activeQuests[currentQuest.id]?.status === 'active';
      const progress = currentQuest.objectives.map(obj => {
        const have = inventory[obj.item] || 0;
        return `${have}/${obj.required} ${obj.item.replace(/object$/,'')}`;
      }).join(', ');

      return {
        greeting: isActive
          ? `**${currentQuest.title}**\nProgress: ${progress}`
          : currentQuest.description,
        choices: [
          {
            key: 'up',
            text: isActive ? 'Turn In' : 'Accept Quest',
            action: isActive ? 'turnInQuest' : 'acceptQuest',
            questId: currentQuest.id
          },
          { key: 'left', text: "Not now", action: 'close' }
        ]
      };
    }
  }
};

// InteractionConstants.js
export const getQuestMarker = (activeQuests, inventory) => {
  const first = QUESTS.collect_stones_wood;
  const second = QUESTS.collect_spider_webs;
  const third = QUESTS.collect_dungeon_key;

  // 1. No quest started → show ?
  if (!activeQuests[first.id]) return '?';

  // 2. First active → show !
  if (activeQuests[first.id]?.status === 'active') return '!';

  // 3. First completed, second not started → show ?
  if (activeQuests[first.id]?.status === 'completed' && !activeQuests[second.id]) return '?';

  // 4. Second active → show !
  if (activeQuests[second.id]?.status === 'active') return '!';

  // 5. Second completed, third not started → show ?
  if (activeQuests[second.id]?.status === 'completed' && !activeQuests[third.id]) return '?';

  // 6. Third active → show !
  if (activeQuests[third.id]?.status === 'active') return '!';

  // 7. All done → hide
  return null;
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