/**
 * DiceSystem — Cryptographically random dice rolls.
 * Uses crypto.getRandomValues() exclusively — never Math.random().
 */

// ---------------------------------------------------------------------------
// Internal history store
// ---------------------------------------------------------------------------

const _entries = [];

/** Roll history object with statistics. */
export const rollHistory = {
  /** @returns {{ min:number, max:number, average:number, count:number }} */
  getStats() {
    if (_entries.length === 0) return { min: 0, max: 0, average: 0, count: 0 };
    const raws = _entries.map(e => e.raw ?? e.rolls?.[0] ?? 0);
    const sum = raws.reduce((a, b) => a + b, 0);
    return {
      min: Math.min(...raws),
      max: Math.max(...raws),
      average: sum / raws.length,
      count: raws.length,
    };
  },
};

// ---------------------------------------------------------------------------
// Core RNG — unbiased via rejection sampling
// ---------------------------------------------------------------------------

/**
 * Unbiased random integer in [1, n].
 * @param {number} n
 * @returns {number}
 */
function cryptoRandInt(n) {
  const limit = 256 - (256 % n);
  const buf = new Uint8Array(1);
  // eslint-disable-next-line no-constant-condition
  while (true) {
    crypto.getRandomValues(buf);
    if (buf[0] < limit) return (buf[0] % n) + 1;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Roll a D20 with an optional flat modifier.
 * @param {number} [modifier=0]
 * @returns {{ raw: number, modifier: number, total: number }}
 */
export function rollD20(modifier = 0) {
  const raw = cryptoRandInt(20);
  const total = raw + modifier;
  const entry = { raw, modifier, total, timestamp: Date.now() };
  _entries.push(entry);
  return entry;
}

/**
 * Roll a die with any number of faces.
 * @param {number} faces
 * @param {number} [modifier=0]
 * @returns {{ raw: number, modifier: number, total: number }}
 */
export function rollDie(faces, modifier = 0) {
  const raw = cryptoRandInt(faces);
  const total = raw + modifier;
  const entry = { raw, modifier, total, faces, timestamp: Date.now() };
  _entries.push(entry);
  return entry;
}

/**
 * Roll multiple dice and sum results.
 * @param {number} count
 * @param {number} faces
 * @param {number} [modifier=0]
 * @returns {{ rolls: number[], sum: number, total: number }}
 */
export function rollMultiple(count, faces, modifier = 0) {
  const rolls = Array.from({ length: count }, () => cryptoRandInt(faces));
  const sum = rolls.reduce((a, b) => a + b, 0);
  const total = sum + modifier;
  _entries.push({ rolls, sum, modifier, total, timestamp: Date.now() });
  return { rolls, sum, total };
}

/**
 * Classify a roll result against named ranges.
 * @param {number} roll
 * @param {Record<string, [number, number]>} ranges  e.g. { miss:[1,5], hit:[6,15], critical:[16,20] }
 * @returns {string|null}
 */
export function rollInRange(roll, ranges) {
  for (const [category, [min, max]] of Object.entries(ranges)) {
    if (roll >= min && roll <= max) return category;
  }
  return null;
}

/**
 * Random integer in [min, max] inclusive.
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function rollBetween(min, max) {
  if (min >= max) return min;
  return min + cryptoRandInt(max - min + 1) - 1;
}

/** @returns {Array} Copy of all rolls this session. */
export function getRollHistory() {
  return [..._entries];
}

/** Clear history (e.g. on new game). */
export function clearRollHistory() {
  _entries.length = 0;
}
