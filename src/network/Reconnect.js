/**
 * Reconnect — Disconnect detection and auto-reconnect
 */

import { DEFAULT_HEARTBEAT_INTERVAL } from '@utils/constants.js';
import { MessageTypes, createMessage } from './MessageTypes.js';
import { sendTo } from './PeerManager.js';

const HEARTBEAT_INTERVAL_MS = DEFAULT_HEARTBEAT_INTERVAL;
const GRACE_PERIOD_MS = 15000;

/**
 * Start a heartbeat on the host side to detect disconnected peers.
 * @param {object} connectionsRef - React ref holding connections array
 * @param {Function} onDisconnect - Called with peerId when peer is considered disconnected
 * @returns {{ recordHeartbeat: Function, stop: Function }}
 */
export function startHeartbeat(connectionsRef, onDisconnect) {
  const lastSeen = new Map();

  const interval = setInterval(() => {
    const connections = connectionsRef.current || [];
    const now = Date.now();

    for (const conn of connections) {
      if (!conn || !conn.open) continue;
      // Initialize lastSeen on first encounter so the grace period starts from
      // the first heartbeat tick, not from the current time every iteration.
      if (!lastSeen.has(conn.peer)) lastSeen.set(conn.peer, now);
      const last = lastSeen.get(conn.peer);
      if (now - last > GRACE_PERIOD_MS) {
        onDisconnect(conn.peer);
      }
      try {
        sendTo(conn, createMessage(MessageTypes.HEARTBEAT, { ts: now }));
      } catch { /* ignore */ }
    }
  }, HEARTBEAT_INTERVAL_MS);

  return {
    recordHeartbeat: (peerId) => lastSeen.set(peerId, Date.now()),
    stop: () => clearInterval(interval),
  };
}

/**
 * Attempt to reconnect to host after disconnect with exponential backoff.
 * @param {string} roomCode
 * @param {Function} joinRoomFn
 * @param {number} maxAttempts
 * @returns {Promise<{ peer, hostConnection }>}
 */
export async function attemptReconnect(roomCode, joinRoomFn, maxAttempts = 4) {
  let delay = 2000;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await joinRoomFn(roomCode);
    } catch (err) {
      if (attempt >= maxAttempts) throw err;
      await new Promise(r => setTimeout(r, delay));
      delay = Math.min(delay * 2, 16000);
    }
  }
}

/**
 * Request a full state catch-up from the host after reconnect.
 * @param {object} hostConnection
 */
export function requestStateSync(hostConnection) {
  // Use RECONNECT_REQUEST so the StateSync manager handles it via its
  // _handleReconnectRequest path, which sends back a RECONNECT_RESPONSE with
  // the full versioned state snapshot.
  sendTo(hostConnection, createMessage(MessageTypes.RECONNECT_REQUEST, {}));
}
