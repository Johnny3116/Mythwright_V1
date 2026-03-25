import { describe, it, expect } from 'vitest';
import {
  TurnPhase,
  initializeTurnOrder,
  advanceTurn,
  getActiveEntity,
} from '@engine/TurnManager.js';

// Functional API expects string player IDs
const players = ['p1', 'p2', 'p3'];
const BOSS_ID = 'boss';

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
    const next = advanceTurn(ts, BOSS_ID);
    expect(next.currentIndex).toBe(1);
    expect(next.phase).toBe(TurnPhase.PLAYER_TURN);
  });

  it('transitions to BOSS_TURN after last player', () => {
    const ts = { ...initializeTurnOrder(players), currentIndex: 2 };
    const next = advanceTurn(ts, BOSS_ID);
    expect(next.phase).toBe(TurnPhase.BOSS_TURN);
  });

  it('cycles through all phases: PLAYER → BOSS → ENVIRONMENT → PLAYER (round 2)', () => {
    let ts = initializeTurnOrder(['p1']);
    ts = advanceTurn(ts, BOSS_ID); // PLAYER_TURN → BOSS_TURN
    expect(ts.phase).toBe(TurnPhase.BOSS_TURN);
    ts = advanceTurn(ts, BOSS_ID); // BOSS_TURN → ENVIRONMENT
    expect(ts.phase).toBe(TurnPhase.ENVIRONMENT);
    ts = advanceTurn(ts, BOSS_ID); // ENVIRONMENT → PLAYER_TURN round 2
    expect(ts.phase).toBe(TurnPhase.PLAYER_TURN);
    expect(ts.round).toBe(2);
  });

  it('does not mutate input', () => {
    const ts = initializeTurnOrder(players);
    advanceTurn(ts, BOSS_ID);
    expect(ts.currentIndex).toBe(0);
  });
});

describe('getActiveEntity', () => {
  it('returns current player id during PLAYER_TURN', () => {
    const ts = initializeTurnOrder(players);
    expect(getActiveEntity(ts, BOSS_ID)).toBe('p1');
  });

  it('returns boss id during BOSS_TURN', () => {
    const ts = { ...initializeTurnOrder(players), phase: TurnPhase.BOSS_TURN };
    expect(getActiveEntity(ts, BOSS_ID)).toBe(BOSS_ID);
  });

  it('returns "environment" during ENVIRONMENT', () => {
    const ts = { ...initializeTurnOrder(players), phase: TurnPhase.ENVIRONMENT };
    expect(getActiveEntity(ts, BOSS_ID)).toBe('environment');
  });
});
