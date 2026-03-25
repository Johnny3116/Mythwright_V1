/**
 * Reconnect — Disconnect detection and automatic reconnection.
 *
 * Behavior timeline:
 *
 *   t=0s   Heartbeat sent every 5 s (configurable).
 *   t=15s  No ACK received → status transitions "connected" → "reconnecting".
 *          Reconnect attempts begin every 3 s.
 *   t=30s  Grace period elapsed without success → "disconnected".
 *          The player's game slot is kept open so they may rejoin later.
 *
 * On successful reconnect:
 *   - Status → "connected"
 *   - Player sends RECONNECT_REQUEST
 *   - Host replies with RECONNECT_RESPONSE (full state snapshot)
 *   - StateSync applies the snapshot and resumes the session
 *
 * Host side:
 *   - Tracks last-seen timestamps per player.
 *   - Players that miss 3 consecutive heartbeats are marked disconnected.
 *   - Their game slot (player entry) is preserved for the grace period.
 */

import { MSG, createMessage } from './MessageTypes.js';

const DEFAULT_HEARTBEAT_MS = 5000;
const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_GRACE_MS = 30000;
const RETRY_INTERVAL_MS = 3000;

/**
 * @typedef {'connected' | 'reconnecting' | 'disconnected' | 'failed'} ReconnectStatus
 */

/**
 * Create a reconnect handler.
 *
 * @param {object} peerManager  - A PeerManager instance.
 * @param {object} [stateSync]  - A StateSync instance (optional, used for resync on reconnect).
 * @returns {ReconnectHandler}
 */
export function createReconnectHandler(peerManager, stateSync = null) {
  let heartbeatTimer = null;
  let reconnectTimer = null;
  let gracePeriodMs = DEFAULT_GRACE_MS;
  let status = 'connected';
  let lastHeartbeatSent = null;
  let lastHeartbeatAck = null;
  let reconnectStart = null;
  let statusCallbacks = [];

  // Host side: peerId → last-seen timestamp
  const playerLastSeen = new Map();

  // -------------------------------------------------------------------------
  // Status management
  // -------------------------------------------------------------------------

  function setStatus(newStatus) {
    if (status === newStatus) return;
    status = newStatus;
    statusCallbacks.forEach(cb => {
      try { cb(newStatus); } catch (e) { /* swallow */ }
    });
  }

  // -------------------------------------------------------------------------
  // Heartbeat — PLAYER side
  // -------------------------------------------------------------------------

  function sendHeartbeatToHost() {
    if (!peerManager.isConnected()) return;

    lastHeartbeatSent = Date.now();
    peerManager._pingHost();
  }

  function sendHeartbeatToPlayers() {
    if (!peerManager.isConnected()) return;

    const players = peerManager.getConnectedPlayers();
    players.forEach(({ id, connected }) => {
      if (connected) peerManager._pingPlayer(id);
    });
  }

  function checkHeartbeatTimeout() {
    if (lastHeartbeatSent === null) return;

    const now = Date.now();
    const elapsed = now - (lastHeartbeatAck ?? lastHeartbeatSent);

    if (elapsed > DEFAULT_TIMEOUT_MS && status === 'connected') {
      setStatus('reconnecting');
      reconnectStart = now;
      scheduleReconnectAttempt();
    }
  }

  // -------------------------------------------------------------------------
  // Reconnection — PLAYER side
  // -------------------------------------------------------------------------

  function scheduleReconnectAttempt() {
    if (reconnectTimer) return; // already scheduled

    reconnectTimer = setInterval(() => {
      const elapsed = Date.now() - (reconnectStart ?? Date.now());

      if (peerManager.isConnected()) {
        // Connection restored!
        clearInterval(reconnectTimer);
        reconnectTimer = null;
        lastHeartbeatAck = Date.now();
        setStatus('connected');

        // Request state catch-up.
        if (stateSync) {
          stateSync.requestResync();
        } else {
          peerManager.sendToHost(createMessage(MSG.RECONNECT_REQUEST, {}));
        }
        return;
      }

      if (elapsed >= gracePeriodMs) {
        // Grace period exhausted.
        clearInterval(reconnectTimer);
        reconnectTimer = null;
        setStatus('disconnected');
      }
    }, RETRY_INTERVAL_MS);
  }

  // -------------------------------------------------------------------------
  // Incoming message: update last-seen / ack timestamps
  // -------------------------------------------------------------------------

  peerManager.on('message', ({ from, message }) => {
    if (!message) return;

    // Track host-side last-seen per player.
    playerLastSeen.set(from, Date.now());

    // Player side: any message from host counts as proof of life.
    if (message.type === MSG.RECONNECT_RESPONSE) {
      lastHeartbeatAck = Date.now();
      if (status !== 'connected') setStatus('connected');
    }
  });

  // Heartbeat ACK updates last-ack time (PeerManager handles latency; we
  // track timing separately here for disconnect detection purposes).
  peerManager.on('message', ({ from, message }) => {
    if (message?.type === MSG.HEARTBEAT && message.payload?.ack) {
      lastHeartbeatAck = Date.now();
      playerLastSeen.set(from, Date.now());
      if (status !== 'connected') {
        setStatus('connected');
        // Resync after reconnect.
        if (stateSync) stateSync.requestResync();
      }
    }
  });

  peerManager.on('disconnected', () => {
    if (status === 'connected') {
      setStatus('reconnecting');
      reconnectStart = Date.now();
      scheduleReconnectAttempt();
    }
  });

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  const handler = {
    /**
     * Start the heartbeat loop.
     * @param {number} [intervalMs=5000]
     */
    startHeartbeat(intervalMs = DEFAULT_HEARTBEAT_MS) {
      handler.stopHeartbeat();

      heartbeatTimer = setInterval(() => {
        const isHost = peerManager.getHostConnection() === 'not-connected';

        if (isHost) {
          // Host pings all players.
          sendHeartbeatToPlayers();
          _checkHostSideTimeouts();
        } else {
          // Player pings host.
          sendHeartbeatToHost();
          checkHeartbeatTimeout();
        }
      }, intervalMs);
    },

    /** Stop the heartbeat loop. */
    stopHeartbeat() {
      if (heartbeatTimer !== null) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
    },

    /**
     * Current connection status.
     * @returns {ReconnectStatus}
     */
    getStatus() {
      return status;
    },

    /**
     * Last-seen timestamp for a player (host side).
     * @param {string} playerId
     * @returns {number | null} Unix ms timestamp or null if unknown.
     */
    getLastSeen(playerId) {
      return playerLastSeen.get(playerId) ?? null;
    },

    /**
     * Change the grace period before a player is marked fully disconnected.
     * @param {number} [ms=30000]
     */
    setGracePeriod(ms = DEFAULT_GRACE_MS) {
      gracePeriodMs = ms;
    },

    /**
     * Register a callback for status changes.
     * @param {(status: ReconnectStatus) => void} callback
     */
    onStatusChange(callback) {
      statusCallbacks.push(callback);
    },

    /** Force-override the connection status (useful for testing). */
    _setStatus(s) { setStatus(s); },

    /** Stop all timers and clean up. */
    destroy() {
      handler.stopHeartbeat();
      if (reconnectTimer) {
        clearInterval(reconnectTimer);
        reconnectTimer = null;
      }
      statusCallbacks = [];
    },
  };

  // -------------------------------------------------------------------------
  // Host-side: detect players that have gone silent
  // -------------------------------------------------------------------------

  function _checkHostSideTimeouts() {
    const now = Date.now();
    const players = peerManager.getConnectedPlayers();

    players.forEach(({ id, connected }) => {
      if (!connected) return;
      const last = playerLastSeen.get(id);
      if (last !== undefined && now - last > DEFAULT_TIMEOUT_MS) {
        // Player has gone silent — emit as if they disconnected.
        // The PeerManager will fire playerLeft when the DataChannel closes,
        // but this handles the "silent" case where the channel stays open.
        peerManager.emit?.('playerLeft', { id, reason: 'heartbeat timeout' });
      }
    });
  }

  return handler;
}
