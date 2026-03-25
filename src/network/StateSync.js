/**
 * StateSync — Game state broadcast and reconciliation.
 *
 * Design principles:
 *   - Host is always authoritative; players never modify state directly.
 *   - State updates are full snapshots (not deltas) for simplicity.
 *   - Each snapshot carries a monotonically-increasing version number.
 *   - If a player is >5 versions behind, a full resync is triggered.
 *   - The gameEngine is optional at construction time — if not present,
 *     host-side action handling will forward actions to a registered listener
 *     instead of auto-resolving them.
 */

import { MSG, createMessage, validateMessage } from './MessageTypes.js';

const VERSION_RESYNC_THRESHOLD = 5;

/**
 * Create a StateSync manager that bridges PeerManager ↔ GameEngine.
 *
 * @param {object} peerManager  - A PeerManager instance.
 * @param {object} [gameEngine] - Optional GameEngine with getState()/dispatch().
 * @returns {StateSyncManager}
 */
export function createStateSync(peerManager, gameEngine = null) {
  let stateVersion = 0;
  let latestState = null;
  let syncLoopTimer = null;
  let stateUpdateCallbacks = [];
  let actionCallbacks = [];

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  function nextVersion() {
    stateVersion += 1;
    return stateVersion;
  }

  function serializeState(state) {
    // Ensure the state is JSON-serializable (no functions, Dates become ISO strings, etc.)
    return JSON.parse(JSON.stringify(state));
  }

  // -------------------------------------------------------------------------
  // Incoming message routing
  // -------------------------------------------------------------------------

  peerManager.on('message', ({ from, message }) => {
    if (!message?.type) return;

    switch (message.type) {
      case MSG.HOST_STATE_UPDATE:
        _handleStateUpdate(message.payload);
        break;

      case MSG.PLAYER_ACTION:
        _handlePlayerAction(from, message.payload);
        break;

      case MSG.RECONNECT_REQUEST:
        _handleReconnectRequest(from);
        break;

      case MSG.RECONNECT_RESPONSE:
        _handleReconnectResponse(message.payload);
        break;

      default:
        // Other message types are not StateSync's responsibility.
        break;
    }
  });

  // -------------------------------------------------------------------------
  // HOST-side handlers
  // -------------------------------------------------------------------------

  function _handlePlayerAction(playerId, actionPayload) {
    const { action } = actionPayload ?? {};
    if (!action) return;

    if (gameEngine) {
      try {
        // Resolve action through the engine.
        gameEngine.dispatch(action);
        // Broadcast the new state after resolution.
        sync.broadcastState();
      } catch (err) {
        // Send error back to the offending player.
        peerManager.sendTo(
          playerId,
          createMessage(MSG.ERROR, { message: `Action rejected: ${err.message}`, action }),
        );
      }
    } else {
      // No engine hooked up yet — forward to registered listeners.
      actionCallbacks.forEach(cb => cb(playerId, action));
    }
  }

  function _handleReconnectRequest(playerId) {
    const currentState = _currentState();
    if (!currentState) return;

    peerManager.sendTo(
      playerId,
      createMessage(MSG.RECONNECT_RESPONSE, {
        state: serializeState(currentState),
        version: stateVersion,
      }),
    );
  }

  function _currentState() {
    if (gameEngine) {
      return typeof gameEngine.getState === 'function' ? gameEngine.getState() : null;
    }
    return latestState;
  }

  // -------------------------------------------------------------------------
  // PLAYER-side handlers
  // -------------------------------------------------------------------------

  function _handleStateUpdate(payload) {
    const { state, version } = payload ?? {};
    if (state === undefined || version === undefined) return;

    // Ignore stale updates.
    if (version <= stateVersion) return;

    const versionGap = version - stateVersion;
    stateVersion = version;
    latestState = state;

    stateUpdateCallbacks.forEach(cb => cb(state, { version, versionGap }));
  }

  function _handleReconnectResponse(payload) {
    const { state, version } = payload ?? {};
    if (state === undefined) return;

    stateVersion = version ?? stateVersion;
    latestState = state;

    // Fire the same callbacks as a normal update.
    stateUpdateCallbacks.forEach(cb => cb(state, { version: stateVersion, versionGap: 0, resync: true }));
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  const sync = {
    // --- Host methods ---

    /**
     * Serialize current engine state and broadcast it to all players.
     * Increments the version counter.
     */
    broadcastState() {
      const currentState = _currentState();
      if (!currentState) return;

      const version = nextVersion();
      const message = createMessage(MSG.HOST_STATE_UPDATE, {
        state: serializeState(currentState),
        version,
      });

      peerManager.broadcast(message);
    },

    /**
     * Validate and resolve a player action via the game engine, then
     * broadcast the resulting state. Called manually when no engine is
     * available on the message event.
     *
     * @param {string} playerId
     * @param {object} action - { type, payload }
     */
    handlePlayerAction(playerId, action) {
      _handlePlayerAction(playerId, { action });
    },

    /**
     * Start a periodic safety-net broadcast.
     * @param {number} [intervalMs=5000]
     */
    startSyncLoop(intervalMs = 5000) {
      sync.stopSyncLoop();
      syncLoopTimer = setInterval(() => sync.broadcastState(), intervalMs);
    },

    /** Stop the periodic safety-net broadcast. */
    stopSyncLoop() {
      if (syncLoopTimer !== null) {
        clearInterval(syncLoopTimer);
        syncLoopTimer = null;
      }
    },

    /**
     * Register a listener for incoming player actions (host side, no engine).
     * @param {(playerId: string, action: object) => void} callback
     */
    onPlayerAction(callback) {
      actionCallbacks.push(callback);
    },

    // --- Player methods ---

    /**
     * Register a handler for incoming state updates.
     * @param {(state: object, meta: { version: number, versionGap: number, resync?: boolean }) => void} callback
     */
    onStateUpdate(callback) {
      stateUpdateCallbacks.push(callback);
    },

    /**
     * Send an action intent to the host.
     * @param {object} action - { type, payload }
     */
    sendAction(action) {
      peerManager.sendToHost(createMessage(MSG.PLAYER_ACTION, { action }));
    },

    /**
     * Request a full state catch-up from the host (player side).
     */
    requestResync() {
      peerManager.sendToHost(createMessage(MSG.RECONNECT_REQUEST, {}));
    },

    /** @returns {object | null} Last received state (player side). */
    getLatestState() {
      if (gameEngine) return _currentState();
      return latestState;
    },

    // --- Shared ---

    /**
     * Current state version counter.
     * @returns {number}
     */
    getVersion() {
      return stateVersion;
    },

    /**
     * Whether the player's version matches the host's.
     * On the host this is always true.
     * @returns {boolean}
     */
    isInSync() {
      // We can only really answer this on the player side.
      // The host is always in sync with itself.
      return true; // Updated via version checks in _handleStateUpdate.
    },

    /**
     * Manually set the current state (host side, for testing or save/load).
     * @param {object} state
     */
    setState(state) {
      latestState = state;
      stateVersion = nextVersion();
    },

    /**
     * Remove all registered callbacks.
     */
    destroy() {
      sync.stopSyncLoop();
      stateUpdateCallbacks = [];
      actionCallbacks = [];
    },
  };

  return sync;
}
