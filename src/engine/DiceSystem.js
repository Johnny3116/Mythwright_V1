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
  // TODO: Implement in Phase 2
  throw new Error('DiceSystem.rollD20 not yet implemented');
}

/**
 * Roll a die with any number of faces.
 * @param {number} faces - Number of faces (e.g. 6, 12, 20)
 * @param {number} modifier
 * @returns {{ raw: number, modifier: number, total: number }}
 */
export function rollDie(faces, modifier = 0) {
  // TODO: Implement in Phase 2
  throw new Error('DiceSystem.rollDie not yet implemented');
}

/**
 * Roll multiple dice and return individual results + sum.
 * @param {number} count - Number of dice
 * @param {number} faces
 * @param {number} modifier
 * @returns {{ rolls: number[], sum: number, total: number }}
 */
export function rollMultiple(count, faces, modifier = 0) {
  // TODO: Implement in Phase 2
  throw new Error('DiceSystem.rollMultiple not yet implemented');
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
