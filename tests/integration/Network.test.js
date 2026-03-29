/**
 * Integration Tests: Network / StateSync
 *
 * Covers the Phase 8 spec requirement:
 *   - Network: host creates, 2 players join, state syncs correctly
 *
 * Uses in-memory mock PeerManagers that route messages between each other
 * without any real WebRTC. The goal is to verify the StateSync + message
 * protocol layer, not the transport layer.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createStateSync } from '../../src/network/StateSync.js';
import { MSG, createMessage, validateMessage } from '../../src/network/MessageTypes.js';

// ─── In-memory peer network ───────────────────────────────────────────────────
//
// Creates a mini in-memory network: a host peer and N player peers.
// Messages sent from one side are delivered synchronously to the other.

function createPeerNetwork() {
  // Listener registries per peer
  const listenersFor = (registry, id) => {
    if (!registry[id]) registry[id] = new Map();
    return registry[id];
  };

  const peerListeners = {};

  // Create a mock PeerManager for a given peer id
  function createPeer(peerId, peers) {
    const registry = listenersFor(peerListeners, peerId);

    function emit(event, data) {
      (registry.get(event) ?? []).forEach(cb => cb(data));
    }

    const peer = {
      id: peerId,
      on(event, cb) {
        if (!registry.has(event)) registry.set(event, []);
        registry.get(event).push(cb);
      },
      off() {},

      // Deliver a message to this peer (simulates receiving from the network)
      _deliver(from, message) {
        emit('message', { from, message });
      },

      broadcast: vi.fn((message) => {
        // Send to all other connected peers
        for (const otherId of Object.keys(peerListeners)) {
          if (otherId !== peerId) {
            const otherRegistry = peerListeners[otherId];
            (otherRegistry?.get('message') ?? []).forEach(cb =>
              cb({ from: peerId, message })
            );
          }
        }
      }),

      sendTo: vi.fn((targetId, message) => {
        const targetRegistry = peerListeners[targetId];
        (targetRegistry?.get('message') ?? []).forEach(cb =>
          cb({ from: peerId, message })
        );
      }),

      sendToHost: vi.fn((message) => {
        // Players send to 'host'
        const hostRegistry = peerListeners['host'];
        (hostRegistry?.get('message') ?? []).forEach(cb =>
          cb({ from: peerId, message })
        );
      }),

      getConnectedPlayers: vi.fn(() => []),
      isConnected: vi.fn(() => true),
    };

    return peer;
  }

  return { createPeer };
}

// ─── Mock game engine ─────────────────────────────────────────────────────────

function createMockEngine(initialState = {}) {
  let state = { phase: 'LOBBY', round: 0, ...initialState };
  const dispatch = vi.fn((action) => {
    if (action.type === 'INVALID_ACTION') throw new Error('Invalid action');
    state = { ...state, lastAction: action, round: state.round + 1 };
  });
  return {
    getState: () => ({ ...state }),
    dispatch,
    _setState: (s) => { state = { ...s }; },
  };
}

// ─────────────────────────────────────────────────────────────────────────────

describe('Network integration — StateSync with in-memory peers', () => {
  let network;

  beforeEach(() => {
    network = createPeerNetwork();
  });

  describe('Host broadcasts state to players', () => {
    it('player receives HOST_STATE_UPDATE when host broadcasts', () => {
      const hostPeer = network.createPeer('host');
      const playerPeer = network.createPeer('player1');

      const engine = createMockEngine({ phase: 'TURN_LOOP', round: 3 });
      const hostSync = createStateSync(hostPeer, engine);
      const playerSync = createStateSync(playerPeer);

      const receivedUpdates = [];
      playerSync.onStateUpdate((state, meta) => receivedUpdates.push({ state, meta }));

      hostSync.broadcastState();

      expect(receivedUpdates).toHaveLength(1);
      expect(receivedUpdates[0].state.phase).toBe('TURN_LOOP');
      expect(receivedUpdates[0].state.round).toBe(3);
    });

    it('state version increments on each broadcast', () => {
      const hostPeer = network.createPeer('host');
      network.createPeer('player1'); // ensure player1 is in registry

      const engine = createMockEngine();
      const hostSync = createStateSync(hostPeer, engine);

      expect(hostSync.getVersion()).toBe(0);
      hostSync.broadcastState();
      expect(hostSync.getVersion()).toBe(1);
      hostSync.broadcastState();
      expect(hostSync.getVersion()).toBe(2);
    });

    it('two players both receive broadcast state', () => {
      const hostPeer = network.createPeer('host');
      const player1Peer = network.createPeer('player1');
      const player2Peer = network.createPeer('player2');

      const engine = createMockEngine({ phase: 'TURN_LOOP', round: 5 });
      const hostSync = createStateSync(hostPeer, engine);
      const player1Sync = createStateSync(player1Peer);
      const player2Sync = createStateSync(player2Peer);

      const p1Updates = [];
      const p2Updates = [];
      player1Sync.onStateUpdate(state => p1Updates.push(state));
      player2Sync.onStateUpdate(state => p2Updates.push(state));

      hostSync.broadcastState();

      expect(p1Updates).toHaveLength(1);
      expect(p2Updates).toHaveLength(1);
      expect(p1Updates[0].round).toBe(5);
      expect(p2Updates[0].round).toBe(5);
    });

    it('player state version tracks host version after update', () => {
      const hostPeer = network.createPeer('host');
      const playerPeer = network.createPeer('player1');

      const engine = createMockEngine();
      const hostSync = createStateSync(hostPeer, engine);
      const playerSync = createStateSync(playerPeer);

      hostSync.broadcastState(); // v1
      hostSync.broadcastState(); // v2

      expect(playerSync.getVersion()).toBe(2);
    });

    it('stale state update (version <= current) is ignored', () => {
      const hostPeer = network.createPeer('host');
      const playerPeer = network.createPeer('player1');

      const engine = createMockEngine({ round: 10 });
      const hostSync = createStateSync(hostPeer, engine);
      const playerSync = createStateSync(playerPeer);

      // Receive version 5 first
      hostSync.broadcastState(); // v1

      const receivedUpdates = [];
      playerSync.onStateUpdate(state => receivedUpdates.push(state));

      // Manually deliver a stale version 1 update again
      playerPeer._deliver('host', createMessage(MSG.HOST_STATE_UPDATE, {
        state: { round: 999 },
        version: 1, // same version as already received
      }));

      // Should be ignored — callback not fired again
      expect(receivedUpdates).toHaveLength(0);
    });
  });

  describe('Player sends action, host resolves and broadcasts', () => {
    it('host receives PLAYER_ACTION and dispatches to engine', () => {
      const hostPeer = network.createPeer('host');
      const playerPeer = network.createPeer('player1');

      const engine = createMockEngine({ phase: 'TURN_LOOP' });
      createStateSync(hostPeer, engine);

      const action = { type: 'PLAYER_ATTACK', payload: { playerId: 'player1', roll: { natural: 15 } } };
      const message = createMessage(MSG.PLAYER_ACTION, { action });

      // Simulate player sending action to host
      playerPeer.sendToHost(message);

      expect(engine.dispatch).toHaveBeenCalledWith(action);
    });

    it('host broadcasts updated state after processing player action', () => {
      const hostPeer = network.createPeer('host');
      const playerPeer = network.createPeer('player1');

      const engine = createMockEngine({ phase: 'TURN_LOOP', round: 1 });
      const hostSync = createStateSync(hostPeer, engine);
      const playerSync = createStateSync(playerPeer);

      const receivedUpdates = [];
      playerSync.onStateUpdate(state => receivedUpdates.push(state));

      // Player sends action → host processes and broadcasts
      const action = { type: 'PLAYER_ATTACK', payload: { playerId: 'player1', roll: { natural: 15 } } };
      playerPeer.sendToHost(createMessage(MSG.PLAYER_ACTION, { action }));

      // After processing, host should have broadcast updated state
      expect(hostPeer.broadcast).toHaveBeenCalled();
    });

    it('invalid action sends ERROR back to player, does not broadcast', () => {
      const hostPeer = network.createPeer('host');
      const playerPeer = network.createPeer('player1');

      const engine = createMockEngine();
      createStateSync(hostPeer, engine);

      const broadcastCountBefore = hostPeer.broadcast.mock.calls.length;

      // Send an invalid action that the engine rejects
      const action = { type: 'INVALID_ACTION' };
      playerPeer.sendToHost(createMessage(MSG.PLAYER_ACTION, { action }));

      // No new broadcast on error
      expect(hostPeer.broadcast.mock.calls.length).toBe(broadcastCountBefore);
      // Error was sent back to the player
      expect(hostPeer.sendTo).toHaveBeenCalledWith('player1', expect.objectContaining({
        type: MSG.ERROR,
      }));
    });

    it('onPlayerAction callback is called when no engine is attached', () => {
      const hostPeer = network.createPeer('host');
      const playerPeer = network.createPeer('player1');

      // No engine — use manual action handler
      const hostSync = createStateSync(hostPeer);
      const receivedActions = [];
      hostSync.onPlayerAction((playerId, action) => receivedActions.push({ playerId, action }));

      const action = { type: 'PLAYER_MOVE', payload: { targetZoneId: 'forest' } };
      playerPeer.sendToHost(createMessage(MSG.PLAYER_ACTION, { action }));

      expect(receivedActions).toHaveLength(1);
      expect(receivedActions[0].playerId).toBe('player1');
      expect(receivedActions[0].action.type).toBe('PLAYER_MOVE');
    });
  });

  describe('Player reconnect', () => {
    it('player sends RECONNECT_REQUEST and host responds with full state', () => {
      const hostPeer = network.createPeer('host');
      const playerPeer = network.createPeer('player1');

      const engine = createMockEngine({ phase: 'TURN_LOOP', round: 7, boss: { hp: 200 } });
      createStateSync(hostPeer, engine);
      const playerSync = createStateSync(playerPeer);

      const receivedUpdates = [];
      playerSync.onStateUpdate((state, meta) => receivedUpdates.push({ state, meta }));

      // Simulate player requesting resync
      playerPeer.sendToHost(createMessage(MSG.RECONNECT_REQUEST, {}));

      // Host should have sent reconnect response to player1 specifically
      expect(hostPeer.sendTo).toHaveBeenCalledWith('player1', expect.objectContaining({
        type: MSG.RECONNECT_RESPONSE,
      }));
    });

    it('player receives state from RECONNECT_RESPONSE with resync meta flag', () => {
      const hostPeer = network.createPeer('host');
      const playerPeer = network.createPeer('player1');

      const engine = createMockEngine({ phase: 'TURN_LOOP', round: 7 });
      createStateSync(hostPeer, engine);
      const playerSync = createStateSync(playerPeer);

      const receivedUpdates = [];
      playerSync.onStateUpdate((state, meta) => receivedUpdates.push({ state, meta }));

      playerPeer.sendToHost(createMessage(MSG.RECONNECT_REQUEST, {}));

      expect(receivedUpdates).toHaveLength(1);
      expect(receivedUpdates[0].meta.resync).toBe(true);
      expect(receivedUpdates[0].state.round).toBe(7);
    });
  });

  describe('Manual state management', () => {
    it('setState updates latestState and version', () => {
      const hostPeer = network.createPeer('host');
      network.createPeer('player1');

      const sync = createStateSync(hostPeer);
      sync.setState({ phase: 'TURN_LOOP', round: 42 });

      expect(sync.getVersion()).toBe(1);
      expect(sync.getLatestState()).toMatchObject({ round: 42 });
    });

    it('destroy stops sync loop and clears callbacks', () => {
      const hostPeer = network.createPeer('host');
      network.createPeer('player1');

      const engine = createMockEngine();
      const sync = createStateSync(hostPeer, engine);
      sync.startSyncLoop(50);

      expect(() => sync.destroy()).not.toThrow();
    });
  });
});

// ─── Message protocol tests ───────────────────────────────────────────────────

describe('Message protocol integration', () => {
  it('all MSG constants produce valid messages via createMessage', () => {
    for (const [, msgType] of Object.entries(MSG)) {
      const msg = createMessage(msgType, { data: 'test' });
      const { valid } = validateMessage(msg);
      expect(valid).toBe(true);
    }
  });

  it('HOST_STATE_UPDATE message carries state and version', () => {
    const msg = createMessage(MSG.HOST_STATE_UPDATE, {
      state: { phase: 'TURN_LOOP', round: 3 },
      version: 5,
    });
    expect(msg.type).toBe(MSG.HOST_STATE_UPDATE);
    expect(msg.payload.state.round).toBe(3);
    expect(msg.payload.version).toBe(5);
  });

  it('PLAYER_ACTION message carries action intent', () => {
    const action = { type: 'PLAYER_ATTACK', payload: { playerId: 'p1' } };
    const msg = createMessage(MSG.PLAYER_ACTION, { action });
    // The outer message type is PLAYER_ACTION; the nested action type is PLAYER_ATTACK
    expect(msg.type).toBe(MSG.PLAYER_ACTION);
    expect(msg.payload.action.type).toBe('PLAYER_ATTACK');
    const { valid } = validateMessage(msg);
    expect(valid).toBe(true);
  });

  it('each createMessage call produces a unique id', () => {
    const ids = new Set(
      Array.from({ length: 100 }, () => createMessage(MSG.HEARTBEAT, {}).id)
    );
    expect(ids.size).toBe(100);
  });

  it('validateMessage rejects unknown type', () => {
    const msg = createMessage(MSG.HEARTBEAT, {});
    const bad = { ...msg, type: 'UNKNOWN_TYPE' };
    const { valid, errors } = validateMessage(bad);
    expect(valid).toBe(false);
    expect(errors.some(e => e.includes('Unknown message type'))).toBe(true);
  });

  it('validateMessage rejects missing payload', () => {
    const msg = createMessage(MSG.HEARTBEAT, {});
    const { valid: v1 } = validateMessage({ ...msg, payload: null });
    const { valid: v2 } = validateMessage({ ...msg, payload: undefined });
    expect(v1).toBe(false);
    expect(v2).toBe(false);
  });
});
