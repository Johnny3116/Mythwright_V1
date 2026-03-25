/**
 * helpers — General utility functions
 */

/**
 * Clamp a number between min and max.
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Format a timestamp as a readable time string.
 * @param {number} timestamp
 * @returns {string}
 */
export function formatTimestamp(timestamp) {
  return new Date(timestamp).toLocaleTimeString();
}

/**
 * Generate a unique ID.
 * @returns {string}
 */
export function generateId() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Deep clone a JSON-serializable object.
 * @param {object} obj
 * @returns {object}
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Pick a random element from an array using crypto RNG.
 * @param {Array} arr
 * @returns {*}
 */
export function randomChoice(arr) {
  if (!arr.length) return undefined;
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return arr[bytes[0] % arr.length];
}
