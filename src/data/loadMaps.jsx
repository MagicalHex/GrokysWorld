// Pure function — no React, no hooks
export const createFallbackGrid = (rows, cols, tile) =>
  Array(rows).fill().map(() => Array(cols).fill(tile));

const FALLBACKS = {
  1: () => createFallbackGrid(16, 24, 'grass'), // Town
  2: () => createFallbackGrid(16, 24, 'sand'), // Wilderness
  3: () => createFallbackGrid(16, 24, 'sand'), // Slime Cave
  4: () => createFallbackGrid(16, 24, 'sand'), // Stone Cave
  5: () => createFallbackGrid(16, 24, 'darkstone'), // Town Mines Level 1
  6: () => createFallbackGrid(16, 24, 'darkstone'), // Slime Cave 1
  7: () => createFallbackGrid(16, 24, 'darkstone'), // Town Mines Level 2
};

export const loadMaps = async () => {
  try {
    const maps = await Promise.all([
      fetch('/maps/town.json').then(r => r.json()),
      fetch('/maps/wilderness.json').then(r => r.json()),
      fetch('/maps/slimecave.json').then(r => r.json()),
      fetch('/maps/stonecave.json').then(r => r.json()),
      fetch('/maps/dungeon.json').then(r => r.json()),
      fetch('/maps/slimecave1.json').then(r => r.json()),
      fetch('/maps/townmineslevel2.json').then(r => r.json()),
    ]);

    return maps.reduce((acc, map, i) => {
      const id = i + 1;
      const originalSpawns = {};
      Object.entries(map.objects || {}).forEach(([key, type]) => {
        if (['spider', 'treeobject', 'littlespider', 'cavespider', 'lightstoneobject' ].includes(type)) {
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