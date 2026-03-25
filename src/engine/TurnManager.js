/**
 * TurnManager — Turn order, phase cycling, initiative tracking
 */

/**
 * Initialize turn order from player list.
 * @param {Array} players - Array of player objects
 * @returns {object} Turn state { order: string[], currentIndex: number, round: number, phase: string }
 */
export function initializeTurnOrder(players) {
  // TODO: Implement in Phase 2
  throw new Error('TurnManager.initializeTurnOrder not yet implemented');
}

/**
 * Advance to the next turn/phase in the cycle.
 * Cycle: all player turns → boss turn → environment → win check → next round
 * @param {object} turnState
 * @param {number} playerCount
 * @returns {object} New turn state
 */
export function advanceTurn(turnState, playerCount) {
  // TODO: Implement in Phase 2
  throw new Error('TurnManager.advanceTurn not yet implemented');
}

/**
 * Get the currently active entity id.
 * @param {object} turnState
 * @returns {string} Entity id or 'boss' or 'environment'
 */
export function getActiveEntity(turnState) {
  // TODO: Implement in Phase 2
  throw new Error('TurnManager.getActiveEntity not yet implemented');
}
