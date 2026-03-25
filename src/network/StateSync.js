/**
 * StateSync — Game state broadcast and reconciliation
 * Host is always authoritative. Players receive and apply full state snapshots.
 */

import { broadcast, sendTo } from './PeerManager.js';
import { MessageTypes, createMessage } from './MessageTypes.js';

/**
 * Broadcast the full game state to all connected players.
 * @param {object[]} connections
 * @param {object} gameState
 */
export function broadcastState(connections, gameState) {
  const message = createMessage(MessageTypes.HOST_STATE_UPDATE, { state: gameState });
  broadcast(connections, message);
}

/**
 * Apply a received state snapshot (player-side).
 * @param {object} receivedState
 * @param {Function} dispatch - Game state dispatch function
 */
export function applyStateSnapshot(receivedState, dispatch) {
  dispatch({ type: 'LOAD_STATE', payload: receivedState });
}

/**
 * Send a player action intent to the host.
 * @param {object} hostConnection
 * @param {object} action - { type, payload }
 */
export function sendPlayerAction(hostConnection, action) {
  const message = createMessage(MessageTypes.PLAYER_ACTION, { action });
  sendTo(hostConnection, message);
}

/**
 * Send a player join message to the host.
 * @param {object} hostConnection
 * @param {object} playerInfo - { peerId, playerName }
 */
export function sendPlayerJoin(hostConnection, playerInfo) {
  const message = createMessage(MessageTypes.PLAYER_JOIN, playerInfo);
  sendTo(hostConnection, message);
}

/**
 * Broadcast a dice roll result so all players can see the animation.
 * @param {object[]} connections
 * @param {object} rollData - { playerId, roll, result }
 */
export function broadcastDiceRoll(connections, rollData) {
  const message = createMessage(MessageTypes.DICE_ROLL_RESULT, rollData);
  broadcast(connections, message);
}
