import { describe, it, expect } from 'vitest';
import {
  TurnPhase,
  initializeTurnOrder,
  advanceTurn,
  getActiveEntity,
  skipDeadPlayers,
} from '@engine/TurnManager.js';

const players = [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }];

describe('initializeTurnOrder', () => {
  it('sets phase to PLAYER_TURN', () => {
    expect(initializeTurnOrder(players).phase).toBe(TurnPhase.PLAYER_TURN);
  });

  it('starts at index 0 round 1', () => {
    const ts = initializeTurnOrder(players);
    expect(ts.currentIndex).toBe(0);
    expect(ts.round).toBe(1);
  });

  it('captures player ids in order', () => {
    expect(initializeTurnOrder(players).order).toEqual(['p1', 'p2', 'p3']);
  });
});

describe('advanceTurn', () => {
  it('advances index within PLAYER_TURN', () => {
    const ts = initializeTurnOrder(players);
    const next = advanceTurn(ts, 3);
    expect(next.currentIndex).toBe(1);
    expect(next.phase).toBe(TurnPhase.PLAYER_TURN);
  });

  it('transitions to BOSS_TURN after last player', () => {
    const ts = { ...initializeTurnOrder(players), currentIndex: 2 };
    const next = advanceTurn(ts, 3);
    expect(next.phase).toBe(TurnPhase.BOSS_TURN);
  });

  it('cycles through all phases', () => {
    let ts = initializeTurnOrder([{ id: 'p1' }]);
    ts = advanceTurn(ts, 1); // PLAYER_TURN → BOSS_TURN
    expect(ts.phase).toBe(TurnPhase.BOSS_TURN);
    ts = advanceTurn(ts, 1); // BOSS_TURN → ENVIRONMENT
    expect(ts.phase).toBe(TurnPhase.ENVIRONMENT);
    ts = advanceTurn(ts, 1); // ENVIRONMENT → CHECK_WIN
    expect(ts.phase).toBe(TurnPhase.CHECK_WIN);
    ts = advanceTurn(ts, 1); // CHECK_WIN → NEXT_ROUND
    expect(ts.phase).toBe(TurnPhase.NEXT_ROUND);
    ts = advanceTurn(ts, 1); // NEXT_ROUND → PLAYER_TURN (round 2)
    expect(ts.phase).toBe(TurnPhase.PLAYER_TURN);
    expect(ts.round).toBe(2);
  });

  it('does not mutate input', () => {
    const ts = initializeTurnOrder(players);
    advanceTurn(ts, 3);
    expect(ts.currentIndex).toBe(0);
  });
});

describe('getActiveEntity', () => {
  it('returns current player id during PLAYER_TURN', () => {
    const ts = initializeTurnOrder(players);
    expect(getActiveEntity(ts)).toBe('p1');
  });

  it('returns "boss" during BOSS_TURN', () => {
    const ts = { ...initializeTurnOrder(players), phase: TurnPhase.BOSS_TURN };
    expect(getActiveEntity(ts)).toBe('boss');
  });

  it('returns "environment" during ENVIRONMENT', () => {
    const ts = { ...initializeTurnOrder(players), phase: TurnPhase.ENVIRONMENT };
    expect(getActiveEntity(ts)).toBe('environment');
  });

  it('returns null during CHECK_WIN and NEXT_ROUND', () => {
    const ts1 = { ...initializeTurnOrder(players), phase: TurnPhase.CHECK_WIN };
    const ts2 = { ...initializeTurnOrder(players), phase: TurnPhase.NEXT_ROUND };
    expect(getActiveEntity(ts1)).toBeNull();
    expect(getActiveEntity(ts2)).toBeNull();
  });
});

describe('skipDeadPlayers', () => {
  it('skips dead player and advances to next alive', () => {
    const ts = initializeTurnOrder(players); // index 0 = p1
    const playersState = [
      { id: 'p1', isAlive: false },
      { id: 'p2', isAlive: true },
      { id: 'p3', isAlive: true },
    ];
    const result = skipDeadPlayers(ts, playersState);
    expect(getActiveEntity(result)).toBe('p2');
  });

  it('does nothing during non-PLAYER_TURN phases', () => {
    const ts = { ...initializeTurnOrder(players), phase: TurnPhase.BOSS_TURN };
    const result = skipDeadPlayers(ts, [{ id: 'p1', isAlive: false }]);
    expect(result.phase).toBe(TurnPhase.BOSS_TURN);
  });

  it('moves to BOSS_TURN when all players are dead', () => {
    const ts = initializeTurnOrder([{ id: 'p1' }, { id: 'p2' }]);
    const dead = [{ id: 'p1', isAlive: false }, { id: 'p2', isAlive: false }];
    const result = skipDeadPlayers(ts, dead);
    expect(result.phase).toBe(TurnPhase.BOSS_TURN);
  });
});
