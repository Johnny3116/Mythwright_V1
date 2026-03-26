/**
 * PeerManager — PeerJS connection setup and room management.
 *
 * Architecture:
 *   - Host creates a Peer with ID "mw-<ROOMCODE>" so the room code IS the address.
 *   - Players create an anonymous Peer then call peer.connect("mw-<ROOMCODE>").
 *   - All message routing goes through the `message` event so upper layers stay
 *     transport-agnostic.
 *   - HEARTBEAT frames are handled internally for latency tracking and never
 *     surfaced as application messages.
 */

import Peer from 'peerjs';
import { MSG, createMessage } from './MessageTypes.js';

// ---------------------------------------------------------------------------
// Room code helpers
// ---------------------------------------------------------------------------

/** Characters used for room codes — no ambiguous 0/O/I/L/1. */
const ROOM_CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const ROOM_CODE_LENGTH = 6;
const PEER_ID_PREFIX = 'mw-';

/**
 * Generate a cryptographically random 6-character room code.
 * @returns {string} e.g. "MYT3K7"
 */
export function generateRoomCode() {
  const buf = new Uint8Array(ROOM_CODE_LENGTH);
  crypto.getRandomValues(buf);
  return Array.from(buf)
    .map(b => ROOM_CODE_CHARS[b % ROOM_CODE_CHARS.length])
    .join('');
}

/** Convert a room code to its PeerJS peer ID. */
function toPeerId(code) {
  return `${PEER_ID_PREFIX}${code.toUpperCase()}`;
}

// ---------------------------------------------------------------------------
// Minimal event emitter (no external deps)
// ---------------------------------------------------------------------------

function createEmitter() {
  /** @type {Map<string, Function[]>} */
  const listeners = new Map();

  return {
    on(event, cb) {
      if (!listeners.has(event)) listeners.set(event, []);
      listeners.get(event).push(cb);
    },
    off(event, cb) {
      if (!listeners.has(event)) return;
      listeners.set(event, listeners.get(event).filter(fn => fn !== cb));
    },
    emit(event, ...args) {
      (listeners.get(event) ?? []).forEach(cb => {
        try { cb(...args); } catch (e) { console.error(`[PeerManager] Listener error (${event}):`, e); }
      });
    },
  };
}

// ---------------------------------------------------------------------------
// PeerManager factory
// ---------------------------------------------------------------------------

/**
 * Create a PeerManager for either a host or a player.
 *
 * @param {object} options
 * @param {boolean} [options.isHost=false]
 * @param {string}  [options.roomId]       - Unused; reserved for reconnect hints.
 * @param {string}  [options.playerName='Player']
 * @param {number}  [options.maxPlayers=4]
 * @returns {PeerManager}
 */
export function createPeerManager(options = {}) {
  const {
    isHost = false,
    playerName = 'Player',
    maxPlayers = 4,
  } = options;

  const emitter = createEmitter();

  /** @type {import('peerjs').Peer | null} */
  let peer = null;
  let myPeerId = null;
  let roomCode = null;

  // Host state
  /** @type {Map<string, { id: string, name: string, conn: any, connected: boolean, latency: number, lastSeen: number }>} */
  const players = new Map();

  // Player state
  let hostConn = null;
  let playerLatency = 0;

  // Latency ping tracking: pingId → sentTimestamp
  const pendingPings = new Map();

  // ---------------------------------------------------------------------------
  // Internal data handler — called for every inbound frame
  // ---------------------------------------------------------------------------

  function handleData(fromId, message) {
    // Internal: HEARTBEAT is handled here and NOT forwarded as a user message.
    if (message && message.type === MSG.HEARTBEAT) {
      const { ack, id: pingId, timestamp } = message.payload ?? {};

      if (ack) {
        // We sent the ping; this is the ACK.
        if (pendingPings.has(pingId)) {
          const rtt = Date.now() - pendingPings.get(pingId);
          pendingPings.delete(pingId);

          if (isHost && players.has(fromId)) {
            players.get(fromId).latency = rtt;
          } else {
            playerLatency = rtt;
          }
        }
      } else {
        // We received a ping; send ACK back.
        const ackMsg = createMessage(MSG.HEARTBEAT, { ack: true, id: pingId, timestamp });
        if (isHost) {
          const player = players.get(fromId);
          if (player?.conn?.open) player.conn.send(ackMsg);
        } else {
          if (hostConn?.open) hostConn.send(ackMsg);
        }
      }
      return; // Do NOT emit HEARTBEAT to upper layers.
    }

    emitter.emit('message', { from: fromId, message });
  }

  // ---------------------------------------------------------------------------
  // Wire a DataConnection with standard lifecycle events
  // ---------------------------------------------------------------------------

  function wireConnection(conn) {
    conn.on('open', () => {
      if (isHost) {
        const name = conn.metadata?.playerName ?? 'Player';
        players.set(conn.peer, {
          id: conn.peer,
          name,
          conn,
          connected: true,
          latency: 0,
          lastSeen: Date.now(),
        });
        emitter.emit('playerJoined', { id: conn.peer, name });
      }
    });

    conn.on('data', (data) => {
      if (isHost && players.has(conn.peer)) {
        players.get(conn.peer).lastSeen = Date.now();
      }
      handleData(conn.peer, data);
    });

    conn.on('close', () => {
      if (isHost) {
        const player = players.get(conn.peer);
        if (player) {
          player.connected = false;
          emitter.emit('playerLeft', { id: conn.peer, name: player.name });
        }
      } else {
        emitter.emit('disconnected', { reason: 'connection closed' });
      }
    });

    conn.on('error', (err) => {
      emitter.emit('error', { source: conn.peer, error: err });
    });
  }

  // ---------------------------------------------------------------------------
  // Shared heartbeat ping helper (called by Reconnect layer)
  // ---------------------------------------------------------------------------

  function sendPing(targetConn) {
    if (!targetConn?.open) return;
    const pingId = crypto.randomUUID();
    pendingPings.set(pingId, Date.now());
    targetConn.send(createMessage(MSG.HEARTBEAT, { id: pingId, timestamp: Date.now() }));
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  const manager = {
    // --- Event subscription ---

    on: (event, cb) => emitter.on(event, cb),
    off: (event, cb) => emitter.off(event, cb),

    // --- Host methods ---

    /**
     * Create a room. Returns the 6-character room code when ready.
     * @returns {Promise<string>}
     */
    createRoom() {
      if (!isHost) return Promise.reject(new Error('createRoom() is host-only'));

      return new Promise((resolve, reject) => {
        roomCode = generateRoomCode();
        const peerId = toPeerId(roomCode);

        peer = new Peer(peerId, { debug: 0 });

        peer.on('open', (id) => {
          myPeerId = id;
          resolve(roomCode);
        });

        peer.on('connection', (conn) => {
          if (players.size >= maxPlayers) {
            conn.close();
            return;
          }
          wireConnection(conn);
        });

        peer.on('error', (err) => {
          emitter.emit('error', err);
          // If our chosen ID is taken, surface the error so callers can retry.
          reject(err);
        });

        peer.on('disconnected', () => {
          emitter.emit('disconnected', { reason: 'peer server disconnected' });
        });
      });
    },

    /** @returns {string | null} Current room code. */
    getRoomCode() {
      return roomCode;
    },

    /**
     * @returns {{ id: string, name: string, connected: boolean, latency: number }[]}
     */
    getConnectedPlayers() {
      return Array.from(players.values()).map(({ id, name, connected, latency }) => ({
        id, name, connected, latency,
      }));
    },

    /**
     * Broadcast a message to all connected players.
     * @param {object} message
     */
    broadcast(message) {
      if (!isHost) throw new Error('broadcast() is host-only');
      players.forEach(({ conn, connected }) => {
        if (connected && conn?.open) conn.send(message);
      });
    },

    /**
     * Send a message to a specific player.
     * @param {string} playerId
     * @param {object} message
     */
    sendTo(playerId, message) {
      if (!isHost) throw new Error('sendTo() is host-only');
      const player = players.get(playerId);
      if (player?.conn?.open) player.conn.send(message);
    },

    /**
     * Kick a player from the room.
     * @param {string} playerId
     */
    kickPlayer(playerId) {
      const player = players.get(playerId);
      if (player) {
        player.conn?.close();
        players.delete(playerId);
      }
    },

    /** Disconnect all players and destroy the host peer. */
    closeRoom() {
      players.forEach(({ conn }) => conn?.close());
      players.clear();
      if (peer) {
        peer.destroy();
        peer = null;
      }
    },

    // --- Player methods ---

    /**
     * Join a room by its 6-character code.
     * @param {string} code
     * @returns {Promise<{ success: boolean, error?: string }>}
     */
    joinRoom(code) {
      if (isHost) return Promise.reject(new Error('joinRoom() is player-only'));

      return new Promise((resolve) => {
        roomCode = code.toUpperCase();
        peer = new Peer({ debug: 0 });

        peer.on('open', (id) => {
          myPeerId = id;
          const hostPeerId = toPeerId(roomCode);

          hostConn = peer.connect(hostPeerId, {
            reliable: true,
            metadata: { playerName },
          });

          hostConn.on('open', () => {
            emitter.emit('reconnected', {});
            resolve({ success: true });
          });

          hostConn.on('data', (data) => {
            handleData(hostPeerId, data);
          });

          hostConn.on('close', () => {
            emitter.emit('disconnected', { reason: 'host disconnected' });
          });

          hostConn.on('error', (err) => {
            emitter.emit('error', err);
            resolve({ success: false, error: String(err.message ?? err) });
          });
        });

        peer.on('error', (err) => {
          emitter.emit('error', err);
          resolve({ success: false, error: String(err.message ?? err) });
        });
      });
    },

    /**
     * Send a message to the host.
     * @param {object} message
     */
    sendToHost(message) {
      if (isHost) throw new Error('sendToHost() is player-only');
      if (hostConn?.open) hostConn.send(message);
    },

    /**
     * @returns {'connected' | 'disconnected' | 'not-connected'}
     */
    getHostConnection() {
      if (isHost) return 'not-connected';
      if (!hostConn) return 'not-connected';
      return hostConn.open ? 'connected' : 'disconnected';
    },

    // --- Shared ---

    /** Disconnect and clean up. */
    disconnect() {
      if (peer) {
        peer.destroy();
        peer = null;
      }
      hostConn = null;
    },

    /**
     * Current round-trip latency in milliseconds.
     * Host: returns average across all players.
     * Player: returns latency to host.
     * @returns {number}
     */
    getLatency() {
      if (isHost) {
        const vals = Array.from(players.values())
          .filter(p => p.connected)
          .map(p => p.latency);
        if (vals.length === 0) return 0;
        return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
      }
      return playerLatency;
    },

    /** @returns {boolean} */
    isConnected() {
      if (isHost) return peer !== null && !peer.destroyed;
      return hostConn !== null && hostConn.open;
    },

    /** @returns {string | null} This peer's own PeerJS ID. */
    getMyId() {
      return myPeerId;
    },

    // --- Internal helpers (used by Reconnect layer) ---

    /** Send a heartbeat ping to a single connection. */
    _ping(conn) { sendPing(conn); },

    /** Ping the host (player side). */
    _pingHost() { sendPing(hostConn); },

    /**
     * Ping a specific player (host side).
     * @param {string} playerId
     */
    _pingPlayer(playerId) {
      const player = players.get(playerId);
      if (player) sendPing(player.conn);
    },

    /** @returns {Map} Internal players map (read-only reference). */
    _getPlayers() { return players; },

    /** @returns {any} Current host DataConnection (player side). */
    _getHostConn() { return hostConn; },

    /**
     * Replace the host connection (used during reconnect).
     * @param {any} conn
     */
    _setHostConn(conn) {
      hostConn = conn;
      if (conn) wireConnection(conn);
    },

    /** @returns {import('peerjs').Peer | null} */
    _getPeer() { return peer; },
  };

  return manager;
}

// ── Standalone functional API (for NetworkContext / Reconnect compatibility) ──

/**
 * Create a host room using a raw PeerJS Peer.
 * Returns the Peer instance and the 6-character room code.
 * @returns {Promise<{ peer: import('peerjs').Peer, roomCode: string }>}
 */
export function createRoom() {
  const roomCode = generateRoomCode();
  const peerId = toPeerId(roomCode);
  return new Promise((resolve, reject) => {
    const peer = new Peer(peerId, { debug: 0 });
    peer.on('open', () => resolve({ peer, roomCode }));
    peer.on('error', reject);
  });
}

/**
 * Join a room by its 6-character code using a raw PeerJS Peer.
 * Returns the Peer instance and the DataConnection to the host.
 * @param {string} code
 * @returns {Promise<{ peer: import('peerjs').Peer, hostConnection: object }>}
 */
export function joinRoom(code) {
  const roomCode = code.toUpperCase();
  return new Promise((resolve, reject) => {
    const peer = new Peer({ debug: 0 });
    peer.on('open', () => {
      const hostConnection = peer.connect(toPeerId(roomCode), { reliable: true });
      hostConnection.on('open', () => resolve({ peer, hostConnection }));
      hostConnection.on('error', reject);
    });
    peer.on('error', reject);
  });
}

/**
 * Broadcast a message to an array of raw PeerJS DataConnections.
 * @param {object[]} connections
 * @param {object} message
 */
export function broadcast(connections, message) {
  connections.forEach(conn => {
    if (conn?.open) conn.send(message);
  });
}

/**
 * Send a message to a single raw PeerJS DataConnection.
 * @param {object} connection
 * @param {object} message
 */
export function sendTo(connection, message) {
  if (connection?.open) connection.send(message);
}

/**
 * Destroy a raw PeerJS Peer instance.
 * @param {import('peerjs').Peer} peer
 */
export function destroyPeer(peer) {
  if (peer && !peer.destroyed) peer.destroy();
}
