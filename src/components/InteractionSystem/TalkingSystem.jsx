// Talking/TalkingSystem.js
import { TALKABLE_OBJECTS, NPC_DIALOGUE, SHOP_DATA } from './InteractionConstants';

export const useTalking = ({
  objects,
  interaction,
  setInteraction,
  inventory,
  onInventoryChange,
  onCancelInteraction
}) => {
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
      icon: dlg.icon,
      choices
    });
  };

  const handleChoiceAction = (action, payload) => {
    if (action === 'openShop') openShop(payload);
    else if (action === 'say') say(payload);
    else if (action === 'close') closeDialogue();
  };

  const openShop = (type) => {
    const items = SHOP_DATA[type];
    if (!items) {
      say("Sorry, I don't have anything right now.");
      return;
    }

    const lines = items.map(it =>
      `**${it.name}** – ${Object.entries(it.cost).map(([k, v]) => `${v} ${k}`).join(', ')}`
    );

    const choices = items.map((it, i) => ({
      text: `Buy ${it.name}`,
      action: () => buyItem(it),
      item: it
    }));

    setInteraction(prev => ({ ...prev, message: lines.join('\n'), choices }));
  };

  const buyItem = (item) => {
    const hasEnough = Object.entries(item.cost).every(([res, amt]) => (inventory[res] ?? 0) >= amt);
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