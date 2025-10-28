// src/data/Levels.js
// NO HOOKS! Pure data + config

export const createFallbackGrid = (rows, cols, terrain) =>
  Array(rows).fill().map(() => Array(cols).fill(terrain));

export const FALLBACK_LEVELS = {
  1: { grid: createFallbackGrid(16, 24, 'grass'), objects: {}, name: 'Town' },
  2: { grid: createFallbackGrid(16, 24, 'sand'), objects: {}, name: 'Wilderness' },
  3: { grid: createFallbackGrid(16, 24, 'sand'), objects: {}, name: 'Desert' },
  4: { grid: createFallbackGrid(16, 24, 'sand'), objects: {}, name: 'Beach' },
  5: { grid: createFallbackGrid(16, 24, 'darkstone'), objects: {}, name: 'Dungeon' },
};

export const PORTAL_ENTRY_POINTS = {
  1: { x: 1, y: 1 },
  2: { x: 1, y: 2 },
  3: { x: 3, y: 3 },
  4: { x: 4, y: 4 },
  5: { x: 1, y: 1 },
};

export const loadMaps = async () => {
  try {
    const maps = await Promise.all([
      fetch('/maps/town.json').then(r => r.json()),
      fetch('/maps/wilderness.json').then(r => r.json()),
      fetch('/maps/desert.json').then(r => r.json()),
      fetch('/maps/beach.json').then(r => r.json()),
      fetch('/maps/dungeon.json').then(r => r.json()),
    ]);

    return {
      1: { ...maps[0], objects: maps[0].objects || {} },
      2: { ...maps[1], objects: maps[1].objects || {} },
      3: { ...maps[2], objects: maps[2].objects || {} },
      4: { ...maps[3], objects: maps[3].objects || {} },
      5: { ...(maps[4] || FALLBACK_LEVELS[5]), objects: maps[4]?.objects || {} },
    };
  } catch (err) {
    console.warn('Failed to load maps, using fallbacks');
    return null;
  }
};