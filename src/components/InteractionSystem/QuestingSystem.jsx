// uestingSystem.js
import { OPENABLE_OBJECTS, OPEN_RESULT, OPEN_DROPS, OPEN_MESSAGES } from './InteractionConstants';

export const useQuesting = ({
  objects,
  onObjectsChange,
  onInventoryChange,
  interaction,
  setInteraction,
  showQuestPopup,
  spawnMonster,
}) => {
  const startOpening = (targetKey) => {
    if (interaction.active) return false;
    const obj = objects[targetKey];
    if (!OPENABLE_OBJECTS.has(obj)) return false;

    const upd = { ...objects };
    upd[targetKey] = OPEN_RESULT[obj];

    const item = OPEN_DROPS[obj];
    onInventoryChange(prev => ({
      ...prev,
      [item]: (prev[item] ?? 0) + 1
    }));

    const [x, y] = targetKey.split(',').map(Number);
    showQuestPopup(x, y, OPEN_MESSAGES[obj]);

    onObjectsChange(upd);
    setInteraction({ type: null, active: false, key: null, timer: null });

// ────── SPIDER AMBUSH ──────
if (obj === 'chest-closed') {
      console.log('[Questing] Chest opened → ambush in 2s');
      const spawns = ['7,4', '7,7', '7,10'];
      spawns.forEach(key => {
        spawnMonster(key, 'cavespider', 2000);
      });
    }

    return true;
  };

  return { startOpening };
};