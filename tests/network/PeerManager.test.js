/**
 * PeerManager tests.
 *
 * PeerJS requires real WebRTC which is not available in jsdom.  We mock the
 * peerjs module entirely and exercise PeerManager's business logic.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// PeerJS mock factory
// ---------------------------------------------------------------------------

/**
 * Returns a factory for mock Peer instances.
 * Each instance exposes `.simulateOpen()`, `.simulateConnection(conn)`,
 * `.simulateError(err)`, and `.simulateDisconnected()` for test control.
 */
function createMockPeerClass() {
  const instances = [];

  class MockPeer {
    constructor(id, _opts) {
      this.id = typeof id === 'string' ? id : null;
      this.destroyed = false;
      this._listeners = new Map();
      instances.push(this);
    }

    on(event, cb) {
      if (!this._listeners.has(event)) this._listeners.set(event, []);
      this._listeners.get(event).push(cb);
    }

    _emit(event, ...args) {
      (this._listeners.get(event) ?? []).forEach(cb => cb(...args));
    }

    connect(peerId, opts) {
      const conn = createMockConnection(peerId, opts);
      return conn;
    }

    destroy() {
      this.destroyed = true;
    }

    // Test helpers
    simulateOpen(id) { this._emit('open', id ?? this.id ?? 'peer-123'); }
    simulateConnection(conn) { this._emit('connection', conn); }
    simulateError(err) { this._emit('error', err); }
    simulateDisconnected() { this._emit('disconnected'); }
  }

  MockPeer._instances = instances;
  return MockPeer;
}

function createMockConnection(peerId = 'remote-peer', metadata = {}) {
  const listeners = new Map();
  const sent = [];

  const conn = {
    peer: peerId,
    open: false,
    metadata: metadata?.metadata ?? metadata,
    _sent: sent,
    on(event, cb) {
      if (!listeners.has(event)) listeners.set(event, []);
      listeners.get(event).push(cb);
    },
    _emit(event, ...args) {
      (listeners.get(event) ?? []).forEach(cb => cb(...args));
    },
    send(data) { sent.push(data); },
    close() { this.open = false; this._emit('close'); },
    // Test helpers
    simulateOpen() { this.open = true; this._emit('open'); },
    simulateData(data) { this._emit('data', data); },
    simulateError(err) { this._emit('error', err); },
    simulateClose() { this.open = false; this._emit('close'); },
  };

  return conn;
}

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------

let MockPeerClass;

vi.mock('peerjs', () => {
  // We return the class set in MockPeerClass so tests can swap it per-suite.
  return {
    default: class ProxyPeer {
      constructor(id, opts) {
        return new MockPeerClass(id, opts);
      }
    },
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function flushPromises() {
  await new Promise(resolve => setTimeout(resolve, 0));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

import { createPeerManager, generateRoomCode } from '@network/PeerManager.js';
import { MSG } from '@network/MessageTypes.js';

// ---------------------------------------------------------------------------
// generateRoomCode
// ---------------------------------------------------------------------------

describe('generateRoomCode', () => {
  it('returns a 6-character string', () => {
    expect(generateRoomCode()).toHaveLength(6);
  });

  it('uses only allowed characters (no 0/O/I/L/1)', () => {
    const forbidden = new Set(['0', 'O', 'I', 'L', '1']);
    for (let i = 0; i < 50; i++) {
      const code = generateRoomCode();
      for (const ch of code) {
        expect(forbidden.has(ch)).toBe(false);
      }
    }
  });

  it('produces uppercase alphanumeric characters', () => {
    for (let i = 0; i < 50; i++) {
      expect(generateRoomCode()).toMatch(/^[A-Z2-9]{6}$/);
    }
  });

  it('produces unique codes', () => {
    const codes = new Set(Array.from({ length: 100 }, generateRoomCode));
    // Not guaranteed, but collision probability over 31^6 space is negligible.
    expect(codes.size).toBeGreaterThan(90);
  });
});

// ---------------------------------------------------------------------------
// createPeerManager — host
// ---------------------------------------------------------------------------

describe('createPeerManager (host)', () => {
  beforeEach(() => {
    MockPeerClass = createMockPeerClass();
  });

  it('creates the manager without throwing', () => {
    expect(() => createPeerManager({ isHost: true })).not.toThrow();
  });

  it('createRoom() resolves with a 6-char room code', async () => {
    const manager = createPeerManager({ isHost: true });
    const roomPromise = manager.createRoom();

    const peer = MockPeerClass._instances[0];
    peer.simulateOpen('mw-' + generateRoomCode());

    const code = await roomPromise;
    expect(code).toHaveLength(6);
    expect(code).toMatch(/^[A-Z2-9]{6}$/);
  });

  it('getRoomCode() returns the same code after createRoom()', async () => {
    const manager = createPeerManager({ isHost: true });
    const roomPromise = manager.createRoom();

    MockPeerClass._instances[0].simulateOpen('mw-ABC123');
    const code = await roomPromise;

    expect(manager.getRoomCode()).toBe(code);
  });

  it('createRoom() rejects when PeerJS emits an error', async () => {
    const manager = createPeerManager({ isHost: true });
    const roomPromise = manager.createRoom();

    MockPeerClass._instances[0].simulateError(new Error('id-taken'));

    await expect(roomPromise).rejects.toThrow('id-taken');
  });

  it('emits playerJoined when a player connects', async () => {
    const manager = createPeerManager({ isHost: true });
    const roomPromise = manager.createRoom();
    MockPeerClass._instances[0].simulateOpen('mw-XYZ789');
    await roomPromise;

    const joined = [];
    manager.on('playerJoined', info => joined.push(info));

    const conn = createMockConnection('player-peer-1', { playerName: 'Alice' });
    MockPeerClass._instances[0].simulateConnection(conn);
    conn.simulateOpen();

    expect(joined).toHaveLength(1);
    expect(joined[0].id).toBe('player-peer-1');
  });

  it('getConnectedPlayers() returns connected player info', async () => {
    const manager = createPeerManager({ isHost: true });
    const roomPromise = manager.createRoom();
    MockPeerClass._instances[0].simulateOpen('mw-XYZ789');
    await roomPromise;

    const conn = createMockConnection('player-peer-2', { playerName: 'Bob' });
    MockPeerClass._instances[0].simulateConnection(conn);
    conn.simulateOpen();

    const players = manager.getConnectedPlayers();
    expect(players).toHaveLength(1);
    expect(players[0].id).toBe('player-peer-2');
    expect(players[0].connected).toBe(true);
  });

  it('emits playerLeft when a player disconnects', async () => {
    const manager = createPeerManager({ isHost: true });
    const roomPromise = manager.createRoom();
    MockPeerClass._instances[0].simulateOpen('mw-XYZ789');
    await roomPromise;

    const conn = createMockConnection('player-peer-3', { playerName: 'Carol' });
    MockPeerClass._instances[0].simulateConnection(conn);
    conn.simulateOpen();

    const left = [];
    manager.on('playerLeft', info => left.push(info));
    conn.simulateClose();

    expect(left).toHaveLength(1);
    expect(left[0].id).toBe('player-peer-3');
  });

  it('broadcast() sends to all open connections', async () => {
    const manager = createPeerManager({ isHost: true });
    const roomPromise = manager.createRoom();
    MockPeerClass._instances[0].simulateOpen('mw-XYZ789');
    await roomPromise;

    const conn1 = createMockConnection('p1');
    const conn2 = createMockConnection('p2');
    MockPeerClass._instances[0].simulateConnection(conn1);
    conn1.simulateOpen();
    MockPeerClass._instances[0].simulateConnection(conn2);
    conn2.simulateOpen();

    const msg = { type: MSG.GAME_START, payload: {}, timestamp: Date.now(), id: 'test-1' };
    manager.broadcast(msg);

    expect(conn1._sent).toContain(msg);
    expect(conn2._sent).toContain(msg);
  });

  it('sendTo() sends only to the specified player', async () => {
    const manager = createPeerManager({ isHost: true });
    const roomPromise = manager.createRoom();
    MockPeerClass._instances[0].simulateOpen('mw-XYZ789');
    await roomPromise;

    const conn1 = createMockConnection('p1');
    const conn2 = createMockConnection('p2');
    MockPeerClass._instances[0].simulateConnection(conn1);
    conn1.simulateOpen();
    MockPeerClass._instances[0].simulateConnection(conn2);
    conn2.simulateOpen();

    const msg = { type: MSG.ERROR, payload: {}, timestamp: Date.now(), id: 'err-1' };
    manager.sendTo('p1', msg);

    expect(conn1._sent).toContain(msg);
    expect(conn2._sent).not.toContain(msg);
  });

  it('enforces maxPlayers limit', async () => {
    const manager = createPeerManager({ isHost: true, maxPlayers: 1 });
    const roomPromise = manager.createRoom();
    MockPeerClass._instances[0].simulateOpen('mw-XYZ789');
    await roomPromise;

    const conn1 = createMockConnection('p1');
    MockPeerClass._instances[0].simulateConnection(conn1);
    conn1.simulateOpen();

    // 2nd connection should be closed immediately.
    const conn2 = createMockConnection('p2');
    const closeSpy = vi.spyOn(conn2, 'close');
    MockPeerClass._instances[0].simulateConnection(conn2);

    expect(closeSpy).toHaveBeenCalled();
  });

  it('getMyId() returns the peer ID after createRoom()', async () => {
    const manager = createPeerManager({ isHost: true });
    const roomPromise = manager.createRoom();
    MockPeerClass._instances[0].simulateOpen('mw-TST123');
    await roomPromise;

    expect(manager.getMyId()).toBe('mw-TST123');
  });
});

// ---------------------------------------------------------------------------
// createPeerManager — player
// ---------------------------------------------------------------------------

describe('createPeerManager (player)', () => {
  beforeEach(() => {
    MockPeerClass = createMockPeerClass();
  });

  it('joinRoom() resolves with success when host connection opens', async () => {
    const manager = createPeerManager({ isHost: false, playerName: 'Dave' });
    const joinPromise = manager.joinRoom('ABC123');

    const peer = MockPeerClass._instances[0];
    peer.simulateOpen('anonymous-player-id');

    // The mock Peer.connect() returns a mock connection; simulate it opening.
    await flushPromises();
    // The hostConn was created inside joinRoom after 'open'.  Access via internal.
    const hostConn = manager._getHostConn();
    expect(hostConn).not.toBeNull();
    hostConn.simulateOpen();

    const result = await joinPromise;
    expect(result.success).toBe(true);
  });

  it('joinRoom() resolves with success:false on error', async () => {
    const manager = createPeerManager({ isHost: false });
    const joinPromise = manager.joinRoom('BAD000');

    const peer = MockPeerClass._instances[0];
    peer.simulateError(new Error('peer-unavailable'));

    const result = await joinPromise;
    expect(result.success).toBe(false);
    expect(result.error).toContain('peer-unavailable');
  });

  it('emits disconnected when host connection closes', async () => {
    const manager = createPeerManager({ isHost: false });
    const joinPromise = manager.joinRoom('ABC123');

    MockPeerClass._instances[0].simulateOpen('me');
    await flushPromises();
    const hostConn = manager._getHostConn();
    hostConn.simulateOpen();
    await joinPromise;

    const events = [];
    manager.on('disconnected', e => events.push(e));
    hostConn.simulateClose();

    expect(events).toHaveLength(1);
    expect(events[0].reason).toBeTruthy();
  });

  it('sendToHost() sends data on the host connection', async () => {
    const manager = createPeerManager({ isHost: false });
    const joinPromise = manager.joinRoom('ABC123');

    MockPeerClass._instances[0].simulateOpen('me');
    await flushPromises();
    const hostConn = manager._getHostConn();
    hostConn.simulateOpen();
    await joinPromise;

    const msg = { type: MSG.PLAYER_ACTION, payload: {}, timestamp: Date.now(), id: 'act-1' };
    manager.sendToHost(msg);

    expect(hostConn._sent).toContain(msg);
  });

  it('emits message events from host data', async () => {
    const manager = createPeerManager({ isHost: false });
    const joinPromise = manager.joinRoom('ABC123');

    MockPeerClass._instances[0].simulateOpen('me');
    await flushPromises();
    const hostConn = manager._getHostConn();
    hostConn.simulateOpen();
    await joinPromise;

    const received = [];
    manager.on('message', evt => received.push(evt));

    const msg = { type: MSG.HOST_STATE_UPDATE, payload: { state: {} }, timestamp: Date.now(), id: 'upd-1' };
    hostConn.simulateData(msg);

    expect(received).toHaveLength(1);
    expect(received[0].message).toEqual(msg);
  });

  it('does not emit HEARTBEAT as a user message', async () => {
    const manager = createPeerManager({ isHost: false });
    const joinPromise = manager.joinRoom('ABC123');

    MockPeerClass._instances[0].simulateOpen('me');
    await flushPromises();
    const hostConn = manager._getHostConn();
    hostConn.simulateOpen();
    await joinPromise;

    const received = [];
    manager.on('message', evt => received.push(evt));

    // Simulate incoming heartbeat ACK
    const ack = { type: MSG.HEARTBEAT, payload: { ack: true, id: 'hb-1', timestamp: Date.now() - 50 }, timestamp: Date.now(), id: 'x' };
    hostConn.simulateData(ack);

    expect(received).toHaveLength(0);
  });

  it('isConnected() reflects connection state', async () => {
    const manager = createPeerManager({ isHost: false });
    expect(manager.isConnected()).toBe(false);

    const joinPromise = manager.joinRoom('ABC123');
    MockPeerClass._instances[0].simulateOpen('me');
    await flushPromises();
    const hostConn = manager._getHostConn();
    hostConn.simulateOpen();
    await joinPromise;

    expect(manager.isConnected()).toBe(true);
  });
});
