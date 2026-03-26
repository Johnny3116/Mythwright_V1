/**
 * MessageTypes — Message type constants, factory, and validation.
 *
 * Direction legend:
 *   H→A  Host broadcasts to all players
 *   P→H  Player sends to host
 *   ↔    Bidirectional
 */

/** All valid message type strings. */
export const MSG = {
  // H→A
  HOST_STATE_UPDATE: 'HOST_STATE_UPDATE',   // Full game state snapshot
  DICE_ROLL_RESULT: 'DICE_ROLL_RESULT',     // Animated roll result to sync
  NARRATIVE_UPDATE: 'NARRATIVE_UPDATE',      // New narrator text
  GAME_START: 'GAME_START',                 // Game is starting
  GAME_OVER: 'GAME_OVER',                   // Win/lose result
  PLAYER_LIST_UPDATE: 'PLAYER_LIST_UPDATE', // Connected players changed
  TURN_CHANGE: 'TURN_CHANGE',               // Active turn changed
  EVOLUTION_EVENT: 'EVOLUTION_EVENT',        // Boss evolving — trigger animation
  ERROR: 'ERROR',                           // Error message to player

  // P→H
  PLAYER_ACTION: 'PLAYER_ACTION',           // Player submits turn action
  PLAYER_JOIN: 'PLAYER_JOIN',               // Player requests to join
  PLAYER_READY: 'PLAYER_READY',             // Player is ready (lobby/char select)
  PLAYER_CHARACTER: 'PLAYER_CHARACTER',     // Player selected their character
  CHAT_MESSAGE: 'CHAT_MESSAGE',             // In-game text chat

  // ↔
  HEARTBEAT: 'HEARTBEAT',                   // Connection alive check
  RECONNECT_REQUEST: 'RECONNECT_REQUEST',   // Player requesting state catch-up
  RECONNECT_RESPONSE: 'RECONNECT_RESPONSE', // Host sends current state
  STATE_REQUEST: 'STATE_REQUEST',           // Player requests full state resync
};

/**
 * Alias for MSG — for compatibility with imports expecting `MessageTypes`.
 * @type {typeof MSG}
 */
export const MessageTypes = MSG;

/** Set of valid type strings for O(1) lookup. */
const VALID_TYPES = new Set(Object.values(MSG));

/**
 * Create a stamped, uniquely identified message.
 *
 * @param {string} type  - One of the MSG constants.
 * @param {object} [payload={}]
 * @returns {{ type: string, payload: object, timestamp: number, id: string }}
 */
export function createMessage(type, payload = {}) {
  return {
    type,
    payload,
    timestamp: Date.now(),
    id: crypto.randomUUID(),
  };
}

/**
 * Validate that a message object is well-formed.
 *
 * @param {unknown} message
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateMessage(message) {
  const errors = [];

  if (message === null || typeof message !== 'object' || Array.isArray(message)) {
    return { valid: false, errors: ['Message must be a plain object'] };
  }

  if (!VALID_TYPES.has(message.type)) {
    errors.push(`Unknown message type: "${message.type}"`);
  }

  if (
    message.payload === undefined ||
    message.payload === null ||
    typeof message.payload !== 'object' ||
    Array.isArray(message.payload)
  ) {
    errors.push('payload must be a plain object');
  }

  if (typeof message.timestamp !== 'number' || !Number.isFinite(message.timestamp)) {
    errors.push('timestamp must be a finite number');
  }

  if (typeof message.id !== 'string' || message.id.length === 0) {
    errors.push('id must be a non-empty string');
  }

  return { valid: errors.length === 0, errors };
}
