/**
 * StateSync tests.
 *
 * Uses a mock PeerManager so no real WebRTC is needed.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createStateSync } from '@network/StateSync.js';
import { MSG, createMessage } from '@network/MessageTypes.js';

// ---------------------------------------------------------------------------
// Mock PeerManager factory
// ---------------------------------------------------------------------------

function createMockPeerManager({ isHost = true } = {}) {
  const listeners = new Map();
  const broadcast = vi.fn();
  const sendTo = vi.fn();
  const sendToHost = vi.fn();

  const mock = {
    isHost,
    broadcast,
    sendTo,
    sendToHost,
    on(event, cb) {
      if (!listeners.has(event)) listeners.set(event, []);
      listeners.get(event).push(cb);
    },
    off() {},
    // Test helper — simulate an inbound message arriving
    _receive(from, message) {
      (listeners.get('message') ?? []).forEach(cb => cb({ from, message }));
    },
    getConnectedPlayers: vi.fn(() => []),
    isConnected: vi.fn(() => true),
  };

  return mock;
}

// ---------------------------------------------------------------------------
// Mock GameEngine factory
// ---------------------------------------------------------------------------

function createMockEngine(initialState = {}) {
  let state = { ...initialState };
  const dispatch = vi.fn((action) => {
    // Simulate state change on dispatch
    if (action.type === 'INVALID') throw new Error('Invalid action');
    state = { ...state, lastAction: action };
  });
  return {
    getState: () => state,
    dispatch,
    _setState: (s) => { state = s; },
  };
}

// ---------------------------------------------------------------------------
// Tests: version tracking
// ---------------------------------------------------------------------------

describe('StateSync — version tracking', () => {
  it('starts at version 0', () => {
    const pm = createMockPeerManager();
    const sync = createStateSync(pm);
    expect(sync.getVersion()).toBe(0);
  });

  it('increments version on broadcastState()', () => {
    const pm = createMockPeerManager({ isHost: true });
    const engine = createMockEngine({ turn: 1 });
    const sync = createStateSync(pm, engine);

    sync.broadcastState();
    expect(sync.getVersion()).toBe(1);

    sync.broadcastState();
    expect(sync.getVersion()).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Tests: host broadcastState
// ---------------------------------------------------------------------------

describe('StateSync — broadcastState (host)', () => {
  it('sends HOST_STATE_UPDATE via peerManager.broadcast()', () => {
    const pm = createMockPeerManager({ isHost: true });
    const engine = createMockEngine({ score: 42 });
    const sync = createStateSync(pm, engine);

    sync.broadcastState();

    expect(pm.broadcast).toHaveBeenCalledOnce();
    const msg = pm.broadcast.mock.calls[0][0];
    expect(msg.type).toBe(MSG.HOST_STATE_UPDATE);
    expect(msg.payload.state).toEqual({ score: 42 });
    expect(msg.payload.version).toBe(1);
  });

  it('serializes state to JSON-safe form', () => {
    const pm = createMockPeerManager({ isHost: true });
    const engine = createMockEngine({ items: [1, 2, 3] });
    const sync = createStateSync(pm, engine);

    sync.broadcastState();

    const msg = pm.broadcast.mock.calls[0][0];
    // Should be JSON-round-trippable
    expect(() => JSON.stringify(msg)).not.toThrow();
  });

  it('does not broadcast when there is no state', () => {
    const pm = createMockPeerManager({ isHost: true });
    const sync = createStateSync(pm, null); // no engine
    sync.broadcastState();
    expect(pm.broadcast).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Tests: handlePlayerAction (host)
// ---------------------------------------------------------------------------

describe('StateSync — handlePlayerAction (host)', () => {
  it('dispatches the action to the engine and broadcasts', () => {
    const pm = createMockPeerManager({ isHost: true });
    const engine = createMockEngine({ hp: 100 });
    const sync = createStateSync(pm, engine);

    sync.handlePlayerAction('player-1', { type: 'ATTACK', payload: {} });

    expect(engine.dispatch).toHaveBeenCalledOnce();
    expect(pm.broadcast).toHaveBeenCalledOnce();
  });

  it('sends ERROR to the player if the action throws', () => {
    const pm = createMockPeerManager({ isHost: true });
    const engine = createMockEngine({});
    const sync = createStateSync(pm, engine);

    sync.handlePlayerAction('player-bad', { type: 'INVALID', payload: {} });

    expect(pm.sendTo).toHaveBeenCalledWith(
      'player-bad',
      expect.objectContaining({ type: MSG.ERROR }),
    );
    // State should NOT have been broadcast after a failed action.
    expect(pm.broadcast).not.toHaveBeenCalled();
  });

  it('fires onPlayerAction callbacks when no engine is present', () => {
    const pm = createMockPeerManager({ isHost: true });
    const sync = createStateSync(pm, null);

    const actions = [];
    sync.onPlayerAction((playerId, action) => actions.push({ playerId, action }));

    // Simulate incoming PLAYER_ACTION message
    pm._receive('player-5', createMessage(MSG.PLAYER_ACTION, { action: { type: 'MOVE' } }));

    expect(actions).toHaveLength(1);
    expect(actions[0].playerId).toBe('player-5');
    expect(actions[0].action.type).toBe('MOVE');
  });
});

// ---------------------------------------------------------------------------
// Tests: player-side state updates
// ---------------------------------------------------------------------------

describe('StateSync — onStateUpdate (player)', () => {
  it('fires callbacks when HOST_STATE_UPDATE is received', () => {
    const pm = createMockPeerManager({ isHost: false });
    const sync = createStateSync(pm);

    const updates = [];
    sync.onStateUpdate((state, meta) => updates.push({ state, meta }));

    pm._receive('host-peer', createMessage(MSG.HOST_STATE_UPDATE, {
      state: { turn: 3 },
      version: 1,
    }));

    expect(updates).toHaveLength(1);
    expect(updates[0].state).toEqual({ turn: 3 });
    expect(updates[0].meta.version).toBe(1);
  });

  it('ignores stale updates with lower version numbers', () => {
    const pm = createMockPeerManager({ isHost: false });
    const sync = createStateSync(pm);

    const updates = [];
    sync.onStateUpdate(s => updates.push(s));

    // Deliver v2 first (out of order)
    pm._receive('host', createMessage(MSG.HOST_STATE_UPDATE, { state: { turn: 2 }, version: 2 }));
    // Then v1 — should be ignored
    pm._receive('host', createMessage(MSG.HOST_STATE_UPDATE, { state: { turn: 1 }, version: 1 }));

    expect(updates).toHaveLength(1);
    expect(updates[0]).toEqual({ turn: 2 });
  });

  it('updates getVersion() after receiving an update', () => {
    const pm = createMockPeerManager({ isHost: false });
    const sync = createStateSync(pm);

    pm._receive('host', createMessage(MSG.HOST_STATE_UPDATE, { state: {}, version: 5 }));

    expect(sync.getVersion()).toBe(5);
  });

  it('getLatestState() returns the last received state', () => {
    const pm = createMockPeerManager({ isHost: false });
    const sync = createStateSync(pm);

    pm._receive('host', createMessage(MSG.HOST_STATE_UPDATE, { state: { hp: 50 }, version: 1 }));

    expect(sync.getLatestState()).toEqual({ hp: 50 });
  });
});

// ---------------------------------------------------------------------------
// Tests: sendAction (player)
// ---------------------------------------------------------------------------

describe('StateSync — sendAction (player)', () => {
  it('sends PLAYER_ACTION to host via peerManager.sendToHost()', () => {
    const pm = createMockPeerManager({ isHost: false });
    const sync = createStateSync(pm);

    sync.sendAction({ type: 'ATTACK', payload: { target: 'boss' } });

    expect(pm.sendToHost).toHaveBeenCalledOnce();
    const msg = pm.sendToHost.mock.calls[0][0];
    expect(msg.type).toBe(MSG.PLAYER_ACTION);
    expect(msg.payload.action.type).toBe('ATTACK');
  });
});

// ---------------------------------------------------------------------------
// Tests: reconnect flow
// ---------------------------------------------------------------------------

describe('StateSync — reconnect / resync', () => {
  it('sends RECONNECT_REQUEST on requestResync()', () => {
    const pm = createMockPeerManager({ isHost: false });
    const sync = createStateSync(pm);

    sync.requestResync();

    expect(pm.sendToHost).toHaveBeenCalledWith(
      expect.objectContaining({ type: MSG.RECONNECT_REQUEST }),
    );
  });

  it('handles RECONNECT_RESPONSE and fires onStateUpdate callbacks', () => {
    const pm = createMockPeerManager({ isHost: false });
    const sync = createStateSync(pm);

    const updates = [];
    sync.onStateUpdate((state, meta) => updates.push({ state, meta }));

    pm._receive('host', createMessage(MSG.RECONNECT_RESPONSE, {
      state: { round: 7, phase: 'BOSS_TURN' },
      version: 10,
    }));

    expect(updates).toHaveLength(1);
    expect(updates[0].state.round).toBe(7);
    expect(updates[0].meta.resync).toBe(true);
    expect(sync.getVersion()).toBe(10);
  });

  it('host handles RECONNECT_REQUEST by sending current state to that player', () => {
    const pm = createMockPeerManager({ isHost: true });
    const engine = createMockEngine({ round: 4, phase: 'PLAYER_TURN' });
    const sync = createStateSync(pm, engine);

    pm._receive('player-reconnecting', createMessage(MSG.RECONNECT_REQUEST, {}));

    expect(pm.sendTo).toHaveBeenCalledWith(
      'player-reconnecting',
      expect.objectContaining({ type: MSG.RECONNECT_RESPONSE }),
    );
    const sentMsg = pm.sendTo.mock.calls[0][1];
    expect(sentMsg.payload.state.round).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// Tests: sync loop
// ---------------------------------------------------------------------------

describe('StateSync — sync loop', () => {
  it('startSyncLoop broadcasts state on interval', async () => {
    vi.useFakeTimers();
    const pm = createMockPeerManager({ isHost: true });
    const engine = createMockEngine({ foo: 1 });
    const sync = createStateSync(pm, engine);

    sync.startSyncLoop(1000);
    vi.advanceTimersByTime(3000);
    sync.stopSyncLoop();

    // Should have broadcast ~3 times
    expect(pm.broadcast.mock.calls.length).toBeGreaterThanOrEqual(3);
    vi.useRealTimers();
  });

  it('stopSyncLoop halts broadcasts', async () => {
    vi.useFakeTimers();
    const pm = createMockPeerManager({ isHost: true });
    const engine = createMockEngine({ foo: 1 });
    const sync = createStateSync(pm, engine);

    sync.startSyncLoop(1000);
    vi.advanceTimersByTime(2000);
    const countBefore = pm.broadcast.mock.calls.length;

    sync.stopSyncLoop();
    vi.advanceTimersByTime(3000);

    expect(pm.broadcast.mock.calls.length).toBe(countBefore);
    vi.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// Tests: setState (manual state injection)
// ---------------------------------------------------------------------------

describe('StateSync — setState', () => {
  it('setState updates getLatestState() and increments version', () => {
    const pm = createMockPeerManager({ isHost: true });
    const sync = createStateSync(pm);

    sync.setState({ hp: 99 });

    expect(sync.getLatestState()).toEqual({ hp: 99 });
    expect(sync.getVersion()).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Tests: destroy
// ---------------------------------------------------------------------------

describe('StateSync — destroy', () => {
  it('clears callbacks and stops sync loop', () => {
    vi.useFakeTimers();
    const pm = createMockPeerManager({ isHost: true });
    const engine = createMockEngine({});
    const sync = createStateSync(pm, engine);

    const spy = vi.fn();
    sync.onStateUpdate(spy);
    sync.startSyncLoop(1000);
    sync.destroy();

    vi.advanceTimersByTime(5000);
    expect(pm.broadcast).not.toHaveBeenCalled();

    // Simulate update after destroy — callback should not fire.
    pm._receive('host', createMessage(MSG.HOST_STATE_UPDATE, { state: {}, version: 99 }));
    expect(spy).not.toHaveBeenCalled();

    vi.useRealTimers();
  });
});
