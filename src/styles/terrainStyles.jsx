// src/styles/terrainStyles.js
export const TERRAIN_STYLES = {
  grass: {
    gradient: ['#006400', 'green', 'darkgreen'],
    shadow: 'rgba(32, 157, 61, 0.47)',
    shadowHeight: 2
  },
// src/styles/terrainStyles.js
darkstoneTile: {
  layers: [
    { type: 'solid', color: '#1e1e1e' }, // base dark gray

    // Subtle noise highlights
    { 
      type: 'radial', 
      cx: 0.4, cy: 0.4, 
      colors: ['#333333', 'transparent'], 
      radii: [0, 0.8] 
    },
    { 
      type: 'radial', 
      cx: 0.7, cy: 0.6, 
      colors: ['#2a2a2a', 'transparent'], 
      radii: [0, 0.7] 
    },

    // Diagonal shine
    { 
      type: 'linear', 
      angle: 135, 
      colors: ['#292929', '#1a1a1a', '#222222'] 
    }
  ]
},
  sand: {
    gradient: ['#D2B48C', '#F4A460', '#CDBA96']
  },
  darkstone: {
    gradient: ['#1a2525', '#2F4F4F', '#1a2525']
  },
  water: {
    gradient: ['#1e3a8a', '#4169ED', '#1e40af'],
    animate: true // later for waves
  },
  // Add only what you use
};