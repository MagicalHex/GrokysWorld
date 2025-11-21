// src/data/objectRegistry.js
export const OBJECT_DATA = {
  treeobject: {
    emoji: 'tree',
    size: 'medium',
    scale: 1.2,
    height: 0,
    // image: '/assets/objects/tree.png',   // optional PNG
  },
  evergreenobject: {
    emoji: 'evergreen',
    size: 'medium',
    scale: 1.1,
  },
  bricks: {
    emoji: 'bricks',
    size: 'small',
    scale: 1,
  },
boulder: {
    emoji: 'tree',
    size: 'medium',
    scale: 0.9,
    image: '/ownemojis/boulder.webp',
    offsetX: 0,    // pixels to nudge left/right
    offsetY: 8,   // negative = move up (good for grounding)
  },
  deadtree: {
    emoji: 'tree',
    size: 'medium',
    scale: 1.5,
    image: '/ownemojis/deadtree.webp',
    offsetX: -12,   // center the wider base
    offsetY: -30,   // lift it so the trunk base sits on the tile
  },
  deadtree1: {
    emoji: 'tree',
    size: 'medium',
    scale: 3,
    image: '/ownemojis/deadtree3.webp',
    offsetX: -50,
    offsetY: -80,
  },
    deadtree2: {
    emoji: 'tree',
    size: 'medium',
    scale: 3,
    image: '/ownemojis/deadtree2.webp',
    offsetX: -50,
    offsetY: -80,
  },
  skullobject: {
    size: 'medium',
    scale: 0.8,
    image: '/ownemojis/skullobject.webp',
    offsetX: 0,
    offsetY: 0,
  },
  obeliskstone: {
    size: 'medium',
    scale: 3,
    image: '/ownemojis/obeliskstone.webp',
    offsetX: -50,
    offsetY: -80,
  },
  deadaltar: {
    size: 'medium',
    scale: 1.2,
    image: '/ownemojis/deadaltar.webp',
    offsetX: 0,
    offsetY: 0,
  },
wallruin: {
  image: '/ownemojis/wall-ruin.webp',
  scale: 1.3,
  offsetY: -10,      // crucial! lift it way up so base touches ground
  offsetX: -10,
  rotateX: 0,       // ← this makes it stand upright!
  rotate: 0,         // or 90, 180, 270 for other directions
  lean: 12,          // optional ruin tilt
},
};

export const EMOJI_MAP = {
  tree: '🌳',
  evergreen: '🌲',
  bricks: '🧱',
  // keep the same symbols you used in the old canvas code
};