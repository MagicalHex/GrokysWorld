// src/utils/gameLoop.js
let lastTime = 0;
const subscribers = new Set();

const loop = (time) => {
  const delta = time - lastTime;
  lastTime = time;

  subscribers.forEach(cb => {
    try {
      cb(delta, time);
    } catch (err) {
      console.error('Game loop error:', err);
    }
  });

  requestAnimationFrame(loop);
};

let started = false;
export const startGameLoop = () => {
  if (started) return;
  started = true;
  requestAnimationFrame(loop);
};

export const subscribe = (callback) => {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
};