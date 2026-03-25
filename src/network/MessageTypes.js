/**
 * MessageTypes — Message type constants and payload schemas
 */

export const MessageTypes = {
  HOST_STATE_UPDATE: 'HOST_STATE_UPDATE',
  PLAYER_ACTION: 'PLAYER_ACTION',
  PLAYER_JOIN: 'PLAYER_JOIN',
  PLAYER_DISCONNECT: 'PLAYER_DISCONNECT',
  CHAT_MESSAGE: 'CHAT_MESSAGE',
  HOST_OVERRIDE: 'HOST_OVERRIDE',
  DICE_ROLL_RESULT: 'DICE_ROLL_RESULT',
  HEARTBEAT: 'HEARTBEAT',
  HEARTBEAT_ACK: 'HEARTBEAT_ACK',
  STATE_REQUEST: 'STATE_REQUEST',
};

/**
 * Create a typed message payload.
 * @param {string} type - MessageTypes constant
 * @param {object} payload
 * @returns {object}
 */
export function createMessage(type, payload = {}) {
  return {
    type,
    payload,
    timestamp: Date.now(),
  };
}
