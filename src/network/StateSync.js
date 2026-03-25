/**
 * StateSync — Game state broadcast and reconciliation
 * Host is always authoritative. Players receive and apply full state snapshots.
 */

/**
 * Broadcast the full game state to all connected players.
 * @param {object[]} connections
 * @param {object} gameState
 */
export function broadcastState(connections, gameState) {
  // TODO: Implement in Phase 3
  throw new Error('StateSync.broadcastState not yet implemented');
}

/**
 * Apply a received state snapshot (player-side).
 * @param {object} receivedState
 * @param {Function} dispatch - Game state dispatch function
 */
export function applyStateSnapshot(receivedState, dispatch) {
  // TODO: Implement in Phase 3
  throw new Error('StateSync.applyStateSnapshot not yet implemented');
}

/**
 * Send a player action intent to the host.
 * @param {object} hostConnection
 * @param {object} action - { type, payload }
 */
export function sendPlayerAction(hostConnection, action) {
  // TODO: Implement in Phase 3
  throw new Error('StateSync.sendPlayerAction not yet implemented');
}
