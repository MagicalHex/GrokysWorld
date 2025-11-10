// src/styles/objectStyles.js
export const OBJECT_STYLES = {
  // === SPIDERS ===
  littlespider: {
    image: '/ownemojis/littlespider.webp',
    scale: 2.2,
    shadow: 'rgb(164, 0, 0)',
    monster: true
  },
  cavespider: {
    image: '/ownemojis/spideroriginalnobg.webp',
    scale: 2.2,
    shadow: 'rgb(164, 0, 0)',
    animate: 'rattle',
    monster: true
  },
  player: {
    image: '/ownemojis/player-image.webp',
    scale: 2.2,
    shadow: 'rgb(164, 0, 0)',
    monster: false
  },
  // === EMOJIS (NEW ONES ADDED) ===
  companion: { emoji: '🐺' },
  spiderweb: { emoji: '🕸️' },
  spiderwebnopickup: { emoji: '🕸️' },
  fireobject: { emoji: '🔥' },
  campfireobject: { emoji: '🔥' },
  treeobject: { emoji: '🌳' },
  pinetreeobject: { emoji: '🌲' },

  // === SPECIAL ===
  campfireshaman: { 
    image: '/sprites/shaman.webp',
    questMarker: true 
  },

  // === ITEMS (emoji fallback since images 404) ===
  rockobject: { emoji: '🪨', droppedShine: true }, // 🪨 rock emoji
  woodobject: { emoji: '🪵', droppedShine: true },

  // === MONSTERS (emoji fallback) ===
  spider: { emoji: '🕷️', monster: true },
brickwall: {
  emoji: '🧱',  // ← BRIGHT RED BRICK — you'll SEE it instantly
  isoHeight: 1.5
},
window: {
  emoji: '🪟',  // ← BRIGHT RED BRICK — you'll SEE it instantly
  isoHeight: 1.5
},
  // ... add more monsters as needed
};