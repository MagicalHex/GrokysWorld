// Talking/TalkingSystem.js
import { 
  TALKABLE_OBJECTS, 
  NPC_DIALOGUE, 
  QUEST_DIALOGUE,
  SHOP_DATA,
  QUESTS 
} from './InteractionConstants';

export const useTalking = ({
  objects,
  interaction,
  setInteraction,
  inventory,
  onInventoryChange,
  onCancelInteraction,
  onQuestAccept,
  onQuestComplete,
  activeQuests = {}
}) => {

  const startTalking = (targetKey) => {
    const obj = objects[targetKey];
    if (!TALKABLE_OBJECTS.has(obj)) return;

    const questGiver = QUEST_DIALOGUE[obj];
    const npc = NPC_DIALOGUE[obj];

    let dlg = null;

    // 1. QUEST GIVER (dynamic)
    if (questGiver && questGiver.getDialogue) {
      dlg = questGiver.getDialogue(activeQuests, inventory);
    }
    // 2. FALLBACK: Static NPC dialogue
    else if (npc) {
      dlg = npc;
    }
    if (!dlg) return;

    // Map choices with proper action + payload
    const choices = (dlg.choices || []).map(c => ({
      ...c,
      action: () => handleChoiceAction(c.action, c.questId || c.type || c.message, c)
    }));

    setInteraction({
      type: 'talk',
      active: true,
      key: targetKey,
      message: dlg.greeting,
      npc: obj,
      icon: dlg.icon || 'Crystal Ball',
      choices
    });
  };

  const handleChoiceAction = (action, payload, fullChoice) => {
    if (action === 'acceptQuest') acceptQuest(payload);
    else if (action === 'turnInQuest') turnInQuest(payload);
    else if (action === 'openShop') openShop(payload);        // ← RESTORED!
    else if (action === 'say') say(payload);
    else if (action === 'close') closeDialogue();
  };

  // === QUESTS ===
  const acceptQuest = (questId) => {
    onQuestAccept?.(questId);
    say(`Quest accepted: **${QUESTS[questId].title}**`);
  };

  const turnInQuest = (questId) => {
    const quest = QUESTS[questId];
    const canComplete = quest.objectives.every(obj =>
      (inventory[obj.item] || 0) >= obj.required
    );

    if (!canComplete) {
      say("You don't have enough materials yet!");
      return;
    }

    const newInv = { ...inventory };
    quest.objectives.forEach(obj => {
      newInv[obj.item] -= obj.required;
      if (newInv[obj.item] <= 0) delete newInv[obj.item];
    });

    if (quest.reward.gold) {
      newInv.gold = (newInv.gold || 0) + quest.reward.gold;
    }

    onInventoryChange(newInv);
    onQuestComplete?.(questId);
    say(`Quest completed! +${quest.reward.gold} gold.`);
  };

  // === SHOPS (RESTORED & WORKING!) ===
  const openShop = (type) => {
    const items = SHOP_DATA[type];
    if (!items || items.length === 0) {
      say("Sorry, I don't have anything right now.");
      return;
    }

    const lines = items.map(it =>
      `**${it.name}** – ${Object.entries(it.cost).map(([k, v]) => `${v} ${k}`).join(', ')}`
    );

    const choices = items.map((it) => ({
      text: `Buy ${it.name}`,
      action: () => buyItem(it),
      item: it
    }));

    setInteraction(prev => ({
      ...prev,
      message: lines.join('\n'),
      choices
    }));
  };

  const buyItem = (item) => {
    const hasEnough = Object.entries(item.cost).every(([res, amt]) =>
      (inventory[res] ?? 0) >= amt
    );
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

    onInventoryChange(newInv);
    say(`You bought the **${item.name}**!`);
  };

  const say = (txt) => {
    setInteraction(prev => ({
      ...prev,
      message: txt,
      choices: [{ text: 'Thanks!', action: closeDialogue }]
    }));
  };

  const closeDialogue = () => {
    if (interaction.timer) clearTimeout(interaction.timer);
    setInteraction({ type: null, active: false, key: null, timer: null });
    onCancelInteraction?.();
  };

  return { startTalking, closeDialogue };
};