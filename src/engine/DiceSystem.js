/**
 * DiceSystem — Cryptographically random D20 rolls
 * Uses crypto.getRandomValues() — never Math.random()
 */

/**
 * Generate a cryptographically random integer in [0, range).
 * @param {number} range
 * @returns {number}
 */
function cryptoRandInt(range) {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] % range;
}

/**
 * Roll a D20 with an optional modifier.
 * @param {number} modifier - Flat modifier added to the raw roll
 * @returns {{ natural: number, modified: number, modifier: number }}
 */
export function rollD20(modifier = 0) {
  const natural = cryptoRandInt(20) + 1; // 1-20
  return { natural, modified: natural + modifier, modifier };
}

/**
 * Given a roll value and a ranges object, return the matching range key.
 * Ranges object: { miss: [1,5], hit: [6,15], critical: [16,20] }
 * @param {number} roll
 * @param {object} ranges - { [key]: [min, max] }
 * @returns {string} The matching range key
 */
export function rollInRange(roll, ranges) {
  for (const [key, [min, max]] of Object.entries(ranges)) {
    if (roll >= min && roll <= max) return key;
  }
  return null;
}

/**
 * Roll a random integer between min and max, inclusive.
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function rollBetween(min, max) {
  const range = max - min + 1;
  return min + cryptoRandInt(range);
}

/**
 * Roll a die with any number of faces with an optional modifier.
 * @param {number} faces - Number of faces (e.g. 6, 12, 20)
 * @param {number} modifier
 * @returns {{ natural: number, modified: number, modifier: number }}
 */
export function rollDie(faces, modifier = 0) {
  const natural = cryptoRandInt(faces) + 1;
  return { natural, modified: natural + modifier, modifier };
}

/**
 * Roll multiple dice and return individual results + sum.
 * @param {number} count - Number of dice
 * @param {number} faces
 * @param {number} modifier
 * @returns {{ rolls: number[], sum: number, total: number }}
 */
export function rollMultiple(count, faces, modifier = 0) {
  const rolls = Array.from({ length: count }, () => cryptoRandInt(faces) + 1);
  const sum = rolls.reduce((a, b) => a + b, 0);
  return { rolls, sum, total: sum + modifier };
}

/**
 * Create a roll history tracker for the session.
 * @returns {{ add(roll): void, getAll(): Array, getLast(n): Array, getStats(): object, clear(): void }}
 */
export function createRollHistory() {
  const history = [];

  return {
    add(roll) {
      history.push({ ...roll, timestamp: Date.now() });
    },
    getAll() {
      return [...history];
    },
    getLast(n) {
      return history.slice(-n);
    },
    getStats() {
      if (history.length === 0) return { count: 0, average: 0, min: null, max: null };
      const naturals = history.map((r) => r.natural);
      return {
        count: history.length,
        average: naturals.reduce((a, b) => a + b, 0) / naturals.length,
        min: Math.min(...naturals),
        max: Math.max(...naturals),
      };
    },
    clear() {
      history.length = 0;
    },
    serialize() {
      return [...history];
    },
    deserialize(data) {
      history.length = 0;
      history.push(...data);
    },
  };
}

/**
 * Get the full roll history for the current session (module-level singleton).
 * @returns {Array}
 */
const _moduleHistory = createRollHistory();
export function getRollHistory() {
  return _moduleHistory.getAll();
}

/**
 * Clear roll history (e.g. on new game).
 */
export function clearRollHistory() {
  _moduleHistory.clear();
}

/**
 * Determine the outcome tier for a roll value given a hitRanges config.
 * @param {number} rollValue - The d20 roll (modified)
 * @param {object} hitRanges - e.g. { critFail:[1,1], miss:[2,5], ... }
 * @returns {string|null} tier key, or null if no match
 */
export function getOutcomeTier(rollValue, hitRanges) {
  if (!hitRanges || rollValue == null) return null;
  for (const [key, [min, max]] of Object.entries(hitRanges)) {
    if (rollValue >= min && rollValue <= max) return key;
  }
  return 'miss';
}
