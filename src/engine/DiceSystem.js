/**
 * DiceSystem — Cryptographically random D20 rolls
 * Uses crypto.getRandomValues() — never Math.random()
 */

const rollHistory = [];

/**
 * Roll a D20 with an optional modifier.
 * @param {number} modifier - Flat modifier added to the raw roll
 * @returns {{ raw: number, modifier: number, total: number }}
 */
export function rollD20(modifier = 0) {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  const raw = (array[0] % 20) + 1;
  const total = raw + modifier;
  const result = { raw, modifier, total };
  rollHistory.push({ ...result, faces: 20, timestamp: Date.now() });
  return result;
}

/**
 * Roll a die with any number of faces.
 * @param {number} faces - Number of faces (e.g. 6, 12, 20)
 * @param {number} modifier
 * @returns {{ raw: number, modifier: number, total: number }}
 */
export function rollDie(faces, modifier = 0) {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  const raw = (array[0] % faces) + 1;
  const total = raw + modifier;
  const result = { raw, modifier, total };
  rollHistory.push({ ...result, faces, timestamp: Date.now() });
  return result;
}

/**
 * Roll multiple dice and return individual results + sum.
 * @param {number} count - Number of dice
 * @param {number} faces
 * @param {number} modifier
 * @returns {{ rolls: number[], sum: number, total: number }}
 */
export function rollMultiple(count, faces, modifier = 0) {
  const rolls = [];
  const array = new Uint32Array(count);
  crypto.getRandomValues(array);
  for (let i = 0; i < count; i++) {
    rolls.push((array[i] % faces) + 1);
  }
  const sum = rolls.reduce((acc, r) => acc + r, 0);
  return { rolls, sum, total: sum + modifier };
}

/**
 * Roll a random integer within a range (inclusive).
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function rollInRange(min, max) {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  const range = max - min + 1;
  return min + (array[0] % range);
}

/**
 * Get the full roll history for the current session.
 * @returns {Array}
 */
export function getRollHistory() {
  return [...rollHistory];
}

/**
 * Clear roll history (e.g. on new game).
 */
export function clearRollHistory() {
  rollHistory.length = 0;
}
