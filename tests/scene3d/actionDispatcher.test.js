import { describe, it, expect } from 'vitest';
import { buildEngineAction } from '../../src/hooks/useActionDispatcher.js';
import { ActionTypes } from '../../src/utils/constants.js';

const mkPending = (action, targetId = null) => ({
  attackerId: 'p1',
  targetId,
  action,
});

const fixedRoll = { natural: 17, modified: 17 };

describe('buildEngineAction', () => {
  it('returns null when there is no pending action', () => {
    expect(buildEngineAction(null)).toBeNull();
  });

  it('returns null for an unknown action kind', () => {
    expect(
      buildEngineAction(mkPending({ kind: 'mystery', requiresRoll: false })),
    ).toBeNull();
  });

  it('attack on the boss → PLAYER_ATTACK with targetId null', () => {
    const out = buildEngineAction(
      mkPending({ kind: 'attack', requiresRoll: true }, null),
      { rollOverride: fixedRoll },
    );
    expect(out.type).toBe(ActionTypes.PLAYER_ATTACK);
    expect(out.payload.playerId).toBe('p1');
    expect(out.payload.targetId).toBeNull();
    expect(out.payload.roll).toBe(fixedRoll);
  });

  it('attack on a mob → PLAYER_ATTACK with mob:<zoneId> targetId', () => {
    const out = buildEngineAction(
      mkPending({ kind: 'attack', requiresRoll: true }, 'mob:verdant-maw'),
      { rollOverride: fixedRoll },
    );
    expect(out.payload.targetId).toBe('mob:verdant-maw');
  });

  it('heal action → PLAYER_HEAL with healerId/targetId', () => {
    const out = buildEngineAction(
      mkPending({ kind: 'heal', requiresRoll: true }, 'p2'),
      { rollOverride: fixedRoll },
    );
    expect(out.type).toBe(ActionTypes.PLAYER_HEAL);
    expect(out.payload).toEqual({ healerId: 'p1', targetId: 'p2', roll: fixedRoll });
  });

  it('move action → PLAYER_SET_ANCHOR with anchorId from targetId', () => {
    const out = buildEngineAction(
      mkPending({ kind: 'move', requiresRoll: false }, 'mid-center'),
    );
    expect(out.type).toBe(ActionTypes.PLAYER_SET_ANCHOR);
    expect(out.payload).toEqual({ playerId: 'p1', anchorId: 'mid-center' });
    expect(out.payload).not.toHaveProperty('roll');
  });

  it('endTurn → ADVANCE_PHASE with empty payload', () => {
    const out = buildEngineAction(
      mkPending({ kind: 'endTurn', requiresRoll: false }),
    );
    expect(out.type).toBe(ActionTypes.ADVANCE_PHASE);
    expect(out.payload).toEqual({});
  });

  it('search → PLAYER_SEARCH with a roll', () => {
    const out = buildEngineAction(
      mkPending({ kind: 'search', requiresRoll: true }),
      { rollOverride: fixedRoll },
    );
    expect(out.type).toBe(ActionTypes.PLAYER_SEARCH);
    expect(out.payload.roll).toBe(fixedRoll);
  });

  it('setTrap defaults to spiked-pit when no payload override', () => {
    const out = buildEngineAction(
      mkPending({ kind: 'setTrap', requiresRoll: true }),
      { rollOverride: fixedRoll },
    );
    expect(out.type).toBe(ActionTypes.PLAYER_SET_TRAP);
    expect(out.payload.trapTypeId).toBe('spiked-pit');
  });

  it('ability action → PLAYER_USE_ABILITY with target', () => {
    const out = buildEngineAction(
      mkPending({ kind: 'ability', requiresRoll: true }, 'tzorath'),
      { rollOverride: fixedRoll },
    );
    expect(out.type).toBe(ActionTypes.PLAYER_USE_ABILITY);
    expect(out.payload.targetId).toBe('tzorath');
  });

  it('an action that does not require a roll passes roll=null', () => {
    const out = buildEngineAction(
      mkPending({ kind: 'attack', requiresRoll: false }, null),
    );
    expect(out.payload.roll).toBeNull();
  });
});
