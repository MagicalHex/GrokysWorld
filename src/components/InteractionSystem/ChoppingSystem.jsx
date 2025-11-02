import { useRef } from 'react';
import {
  CHOPPABLE_OBJECTS,
  CHOP_RESULT,
  CHOP_DROPS,
} from './InteractionConstants';

export const useChopping = ({
  objects,
  onObjectsChange,
  interaction,
  setInteraction,
  rows,
  columns,
  onQueueRespawn,
  CHOP_DURATION, // 3 seconds in ms
  setCurrentAction,
  setChoppingProgress,
}) => {
  const animationRef = useRef(null);

  const startChopping = (targetKey) => {
    if (interaction.active) return;
    const obj = objects[targetKey];
    if (!CHOPPABLE_OBJECTS.has(obj)) return;

    // 1. START ACTIONBAR (CSS animation)
    setCurrentAction('chop');
    setChoppingProgress(0);

    // 2. COMPLETE AFTER 3s (CSS drives the fill)
    const timeoutId = setTimeout(() => {
      completeChopping(targetKey, obj);
    }, CHOP_DURATION);

    setInteraction({
      type: 'chop',
      active: true,
      key: targetKey,
      timer: timeoutId,
    });

    animationRef.current = timeoutId;

    return true;
  };

  const completeChopping = (targetKey, obj) => {
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
          const nx = x + dx;
          const ny = y + dy;
          const key = `${nx},${ny}`;
          if (
            nx >= 0 &&
            nx < columns &&
            ny >= 0 &&
            ny < rows &&
            !upd[key]
          ) {
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

    // 4. RESET ACTIONBAR
    setCurrentAction('health');
    setChoppingProgress(0);
    setInteraction({ type: null, active: false, key: null, timer: null });

    if (animationRef.current) {
      clearTimeout(animationRef.current);
      animationRef.current = null;
    }
  };

  // Optional: cancel early (e.g. player walks away)
  const cancelChopping = () => {
    if (animationRef.current) {
      clearTimeout(animationRef.current);
      animationRef.current = null;
    }
    setCurrentAction('health');
    setChoppingProgress(0);
    setInteraction({ type: null, active: false, key: null, timer: null });
  };

  return { startChopping, cancelChopping };
};  