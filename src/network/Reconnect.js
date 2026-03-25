/**
 * Reconnect — Disconnect detection and auto-reconnect
 */

const HEARTBEAT_INTERVAL_MS = 5000;
const GRACE_PERIOD_MS = 15000;

/**
 * Start the heartbeat loop for a connection.
 * @param {object} connection - DataConnection
 * @param {Function} onDisconnect - Called when peer fails to respond
 * @returns {Function} Stop heartbeat function
 */
export function startHeartbeat(connection, onDisconnect) {
  // TODO: Implement in Phase 3
  throw new Error('Reconnect.startHeartbeat not yet implemented');
}

/**
 * Attempt to reconnect to host after disconnect.
 * @param {string} roomCode
 * @param {number} maxAttempts
 * @returns {Promise<object>} Restored connection
 */
export async function attemptReconnect(roomCode, maxAttempts = 5) {
  // TODO: Implement in Phase 3
  throw new Error('Reconnect.attemptReconnect not yet implemented');
}

/**
 * Request a full state catch-up from the host after reconnect.
 * @param {object} hostConnection
 */
export function requestStateSync(hostConnection) {
  // TODO: Implement in Phase 3
  throw new Error('Reconnect.requestStateSync not yet implemented');
}
