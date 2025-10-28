// src/hooks/useLevels.js
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { FALLBACK_LEVELS, PORTAL_ENTRY_POINTS, loadMaps } from '../data/Levels';

const ROWS = 16;
const COLUMNS = 24;

const RESTRICTED_TERRAINS = new Set([
  'stone', 'darkstone', 'stonepillar', 'grassnowalk',
  'timberwallup', 'timberwallside', 'timberwallcornerright', 'timberwallcornerleft'
]);

export const useLevels = () => {
  const [levels, setLevels] = useState(() =>
    Object.fromEntries(
      Object.entries(FALLBACK_LEVELS).map(([id, data]) => [
        id,
        {
          ...data,
          originalSpawns: {},
          respawnQueue: [],
          playerPos: undefined,
        },
      ])
    )
  );

  const [currentLevel, setCurrentLevel] = useState(1);
const [restrictedTilesByLevel, setRestrictedTilesByLevel] = useState({});

  const respawnIntervalRef = useRef(null);

  // Load maps once
  useEffect(() => {
    let mounted = true;
    loadMaps().then(loaded => {
      if (!mounted || !loaded) return;

      setLevels(prev => {
        const updated = { ...prev };
        Object.entries(loaded).forEach(([id, data]) => {
          const originalSpawns = {};
          Object.entries(data.objects).forEach(([k, v]) => {
            if (v === 'spider' || v === 'treeobject') originalSpawns[k] = v;
          });

          updated[id] = {
            ...updated[id],
            ...data,
            originalSpawns,
            respawnQueue: updated[id].respawnQueue || [],
          };
        });
        return updated;
      });
    });
    return () => { mounted = false; };
  }, []);

  // Compute restricted tiles
  useEffect(() => {
    const restrictedByLevel = {};
    Object.entries(levels).forEach(([id, lvl]) => {
      const set = new Set();
      lvl.grid.forEach((row, y) =>
        row.forEach((terrain, x) => {
          if (RESTRICTED_TERRAINS.has(terrain)) set.add(`${x},${y}`);
        })
      );
      restrictedByLevel[id] = set;
    });
    setRestrictedTilesByLevel(restrictedByLevel);
  }, [levels]);

  // Respawn system
  useEffect(() => {
    respawnIntervalRef.current = setInterval(() => {
      const now = Date.now();
      setLevels(prev => {
        const updated = { ...prev };
        let changed = false;

        Object.keys(updated).forEach(id => {
          const lvl = updated[id];
          if (!lvl.respawnQueue?.length) return;

          const newQ = [];
          lvl.respawnQueue.forEach(item => {
            if (now >= item.timestamp) {
              const { key, type } = item;
              const cur = lvl.objects[key];
              const can = !cur || cur === 'timberwoodchoppedobject' || cur === 'coin';
              if (can) {
                lvl.objects = { ...lvl.objects, [key]: type };
                changed = true;
              } else {
                newQ.push({ ...item, timestamp: now + 5000 });
              }
            } else {
              newQ.push(item);
            }
          });
          lvl.respawnQueue = newQ;
        });

        return changed ? updated : prev;
      });
    }, 1000);

    return () => clearInterval(respawnIntervalRef.current);
  }, []);

  // Handlers
  const updateLevel = useCallback((updates, levelId = currentLevel) => {
    setLevels(prev => ({
      ...prev,
      [levelId]: { ...prev[levelId], ...updates },
    }));
  }, [currentLevel]);

  const handleGridChange = useCallback((newGrid, levelId = currentLevel) => {
    const restricted = new Set();
    newGrid.forEach((row, y) =>
      row.forEach((terrain, x) => {
        if (RESTRICTED_TERRAINS.has(terrain)) restricted.add(`${x},${y}`);
      })
    );
    setRestrictedTilesByLevel(prev => ({ ...prev, [levelId]: restricted }));
    updateLevel({ grid: newGrid }, levelId);
  }, [currentLevel, updateLevel]);

  const onObjectsChange = useCallback(
    (newObjects, levelId = currentLevel) => updateLevel({ objects: newObjects }, levelId),
    [currentLevel, updateLevel]
  );

  const onPlayerPosChange = useCallback(
    (newPos, levelId = currentLevel) => updateLevel({ playerPos: newPos }, levelId),
    [currentLevel, updateLevel]
  );

  const onLevelChange = useCallback(
    (newLevel, customSpawn = null) => {
      const key = String(newLevel);
      if (!levels[key]) return;
      const entry = customSpawn || PORTAL_ENTRY_POINTS[key] || { x: 1, y: 1 };
      updateLevel({ playerPos: entry }, key);
      setCurrentLevel(Number(key));
    },
    [levels, updateLevel]
  );

  const onQueueRespawn = useCallback(
    ({ key, type }) => {
      const timestamp = Date.now() + 30000;
      setLevels(prev => ({
        ...prev,
        [currentLevel]: {
          ...prev[currentLevel],
          respawnQueue: [...(prev[currentLevel].respawnQueue || []), { key, type, timestamp }],
        },
      }));
    },
    [currentLevel]
  );

  const getOriginalSpawns = useCallback(
    (lid = currentLevel) => levels[lid]?.originalSpawns || {},
    [levels, currentLevel]
  );

  const renderSelector = useCallback(() => (
    <div>
      <label>Level: </label>
      <select value={currentLevel} onChange={e => onLevelChange(Number(e.target.value))}>
        {Object.entries(levels).map(([id, data]) => (
          <option key={id} value={id}>
            {data.name ? `${data.name} (Level ${id})` : `Level ${id}`}
          </option>
        ))}
      </select>
    </div>
  ), [levels, currentLevel, onLevelChange]);

  const currentLevelData = useMemo(
    () => levels[currentLevel] || levels[1],
    [levels, currentLevel]
  );

  const restrictedTiles = useMemo(
    () => restrictedTilesByLevel[currentLevel] || new Set(),
    [restrictedTilesByLevel, currentLevel]
  );

  return {
    currentLevelData,
    currentLevel,
    setCurrentLevel,
    restrictedTiles,
    handleGridChange,
    onObjectsChange,
    onPlayerPosChange,
    onLevelChange,
    onQueueRespawn,
    getOriginalSpawns,
    rows: ROWS,
    columns: COLUMNS,
    renderSelector,
  };
};