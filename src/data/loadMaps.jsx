// Pure function — no React, no hooks
export const createFallbackGrid = (rows, cols, tile) =>
  Array(rows).fill().map(() => Array(cols).fill(tile));

const FALLBACKS = {
  1: () => createFallbackGrid(16, 24, 'grass'),
  2: () => createFallbackGrid(16, 24, 'sand'),
  3: () => createFallbackGrid(16, 24, 'sand'),
  4: () => createFallbackGrid(16, 24, 'sand'),
  5: () => createFallbackGrid(16, 24, 'darkstone'),
};

export const loadMaps = async () => {
  try {
    const maps = await Promise.all([
      fetch('/maps/town.json').then(r => r.json()),
      fetch('/maps/wilderness.json').then(r => r.json()),
      fetch('/maps/slimecave.json').then(r => r.json()),
      fetch('/maps/stonecave.json').then(r => r.json()),
      fetch('/maps/dungeon.json').then(r => r.json()),
    ]);

    return maps.reduce((acc, map, i) => {
      const id = i + 1;
      const originalSpawns = {};
      Object.entries(map.objects || {}).forEach(([key, type]) => {
        if (['spider', 'treeobject'].includes(type)) {
          originalSpawns[key] = type;
        }
      });

      acc[id] = {
        name: map.name || `Level ${id}`,
        grid: map.grid || FALLBACKS[id](),
        objects: map.objects || {},
        originalSpawns,
        respawnQueue: [],
      };
      return acc;
    }, {});
  } catch (err) {
    console.warn('Maps failed, using fallbacks', err);
    return Object.keys(FALLBACKS).reduce((acc, id) => {
      acc[id] = {
        name: `Level ${id}`,
        grid: FALLBACKS[id](),
        objects: {},
        originalSpawns: {},
        respawnQueue: [],
      };
      return acc;
    }, {});
  }
};