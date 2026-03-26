import { describe, it, expect } from 'vitest';
import { MSG, createMessage, validateMessage } from '@network/MessageTypes.js';

// ---------------------------------------------------------------------------
// MSG constants
// ---------------------------------------------------------------------------

describe('MSG', () => {
  it('exports all required host-to-all message types', () => {
    expect(MSG.HOST_STATE_UPDATE).toBe('HOST_STATE_UPDATE');
    expect(MSG.DICE_ROLL_RESULT).toBe('DICE_ROLL_RESULT');
    expect(MSG.NARRATIVE_UPDATE).toBe('NARRATIVE_UPDATE');
    expect(MSG.GAME_START).toBe('GAME_START');
    expect(MSG.GAME_OVER).toBe('GAME_OVER');
    expect(MSG.PLAYER_LIST_UPDATE).toBe('PLAYER_LIST_UPDATE');
    expect(MSG.TURN_CHANGE).toBe('TURN_CHANGE');
    expect(MSG.EVOLUTION_EVENT).toBe('EVOLUTION_EVENT');
    expect(MSG.ERROR).toBe('ERROR');
  });

  it('exports all required player-to-host message types', () => {
    expect(MSG.PLAYER_ACTION).toBe('PLAYER_ACTION');
    expect(MSG.PLAYER_JOIN).toBe('PLAYER_JOIN');
    expect(MSG.PLAYER_READY).toBe('PLAYER_READY');
    expect(MSG.PLAYER_CHARACTER).toBe('PLAYER_CHARACTER');
    expect(MSG.CHAT_MESSAGE).toBe('CHAT_MESSAGE');
  });

  it('exports all bidirectional message types', () => {
    expect(MSG.HEARTBEAT).toBe('HEARTBEAT');
    expect(MSG.RECONNECT_REQUEST).toBe('RECONNECT_REQUEST');
    expect(MSG.RECONNECT_RESPONSE).toBe('RECONNECT_RESPONSE');
  });

  it('has no duplicate values', () => {
    const values = Object.values(MSG);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });

  it('has exactly 18 message types', () => {
    expect(Object.keys(MSG).length).toBe(18);
  });
});

// ---------------------------------------------------------------------------
// createMessage
// ---------------------------------------------------------------------------

describe('createMessage', () => {
  it('creates a message with the correct type', () => {
    const msg = createMessage(MSG.GAME_START, {});
    expect(msg.type).toBe(MSG.GAME_START);
  });

  it('includes the provided payload', () => {
    const payload = { round: 3, player: 'hero' };
    const msg = createMessage(MSG.HOST_STATE_UPDATE, payload);
    expect(msg.payload).toEqual(payload);
  });

  it('defaults payload to an empty object', () => {
    const msg = createMessage(MSG.HEARTBEAT);
    expect(msg.payload).toEqual({});
  });

  it('includes a numeric timestamp', () => {
    const before = Date.now();
    const msg = createMessage(MSG.HEARTBEAT);
    const after = Date.now();
    expect(msg.timestamp).toBeGreaterThanOrEqual(before);
    expect(msg.timestamp).toBeLessThanOrEqual(after);
  });

  it('includes a unique UUID id', () => {
    const a = createMessage(MSG.HEARTBEAT);
    const b = createMessage(MSG.HEARTBEAT);
    expect(typeof a.id).toBe('string');
    expect(a.id.length).toBeGreaterThan(0);
    expect(a.id).not.toBe(b.id);
  });

  it('produces a plain-object message', () => {
    const msg = createMessage(MSG.GAME_START, { foo: 1 });
    expect(JSON.parse(JSON.stringify(msg))).toEqual(msg);
  });
});

// ---------------------------------------------------------------------------
// validateMessage
// ---------------------------------------------------------------------------

describe('validateMessage', () => {
  function validMsg(overrides = {}) {
    return {
      type: MSG.HEARTBEAT,
      payload: {},
      timestamp: Date.now(),
      id: crypto.randomUUID(),
      ...overrides,
    };
  }

  it('accepts a well-formed message', () => {
    const result = validateMessage(validMsg());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects null', () => {
    const result = validateMessage(null);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('rejects a string', () => {
    const result = validateMessage('not-an-object');
    expect(result.valid).toBe(false);
  });

  it('rejects an array', () => {
    const result = validateMessage([]);
    expect(result.valid).toBe(false);
  });

  it('rejects an unknown type', () => {
    const result = validateMessage(validMsg({ type: 'FAKE_TYPE' }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('type') || e.includes('FAKE_TYPE'))).toBe(true);
  });

  it('rejects missing type', () => {
    const msg = validMsg();
    delete msg.type;
    expect(validateMessage(msg).valid).toBe(false);
  });

  it('rejects null payload', () => {
    const result = validateMessage(validMsg({ payload: null }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('payload'))).toBe(true);
  });

  it('rejects array payload', () => {
    const result = validateMessage(validMsg({ payload: [] }));
    expect(result.valid).toBe(false);
  });

  it('rejects non-numeric timestamp', () => {
    const result = validateMessage(validMsg({ timestamp: 'now' }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('timestamp'))).toBe(true);
  });

  it('rejects missing id', () => {
    const msg = validMsg();
    delete msg.id;
    const result = validateMessage(msg);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('id'))).toBe(true);
  });

  it('rejects empty-string id', () => {
    const result = validateMessage(validMsg({ id: '' }));
    expect(result.valid).toBe(false);
  });

  it('returns multiple errors when multiple fields are invalid', () => {
    const result = validateMessage(validMsg({ type: 'BAD', payload: null, id: '' }));
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });

  it('validates messages created by createMessage', () => {
    Object.values(MSG).forEach(type => {
      const msg = createMessage(type, { data: 'ok' });
      const result = validateMessage(msg);
      expect(result.valid).toBe(true);
    });
  });
});
