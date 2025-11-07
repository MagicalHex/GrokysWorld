// src/utils/logger.js
const noop = () => {};

if (process.env.NODE_ENV === 'production') {
  console.log = noop;
  console.info = noop;
  console.warn = noop;
  // Keep errors visible (recommended!)
  // console.error = noop;  // <-- remove if you want to hide errors
}