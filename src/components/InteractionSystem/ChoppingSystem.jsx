// Chopping/ChoppingSystem.js
import { CHOPPABLE_OBJECTS, CHOP_RESULT, CHOP_DROPS } from './InteractionConstants';

export const useChopping = ({
  objects,
  onObjectsChange,
  interaction,
  setInteraction,
  rows,
  columns,
  onQueueRespawn,
  CHOP_DURATION
}) => {
  const startChopping = (targetKey) => {
    if (interaction.active) return;
    const obj = objects[targetKey];
    if (!CHOPPABLE_OBJECTS.has(obj)) return;

    const timer = setTimeout(() => {
      const upd = { ...objects };
      delete upd[targetKey];
      upd[targetKey] = CHOP_RESULT[obj];

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
      onQueueRespawn({ key: targetKey, type: obj });
      setInteraction({ type: null, active: false, key: null, timer: null });
    }, CHOP_DURATION);

    setInteraction({ type: 'chop', active: true, key: targetKey, timer });
  };

  return { startChopping };
};