import { describe, it, expect } from 'vitest';
import {
  evaluateBehaviorTree,
  selectTarget,
  shouldBossRetreat,
  getRetreatZone,
} from '@engine/BehaviorTree.js';

const alivePlayers = [
  { id: 'p1', hp: 80, isAlive: true, damageDealt: 50 },
  { id: 'p2', hp: 30, isAlive: true, damageDealt: 20 },
];

const deadPlayers = [
  { id: 'p1', hp: 0, isAlive: false },
  { id: 'p2', hp: 0, isAlive: false },
];

describe('evaluateBehaviorTree', () => {
  it('returns dodge when roll triggers dodgeChance', () => {
    const stage = { behavior: { dodgeChance: 0.25 } }; // ≤ 5
    const result = evaluateBehaviorTree(stage, { players: alivePlayers }, 3);
    expect(result.action).toBe('dodge');
  });

  it('returns attack when roll does not trigger any special', () => {
    const stage = { behavior: { dodgeChance: 0.1, extraAttacks: 0 } }; // dodge threshold = 2
    const result = evaluateBehaviorTree(stage, { players: alivePlayers }, 15);
    expect(result.action).toBe('attack');
  });

  it('returns aoe_attack when aoeAttack is true', () => {
    const stage = { behavior: { aoeAttack: true, extraAttacks: 1 } };
    const result = evaluateBehaviorTree(stage, { players: alivePlayers }, 15);
    expect(result.action).toBe('aoe_attack');
    expect(result.target).toBe('all');
  });

  it('returns null target when no alive players', () => {
    const stage = { behavior: {} };
    const result = evaluateBehaviorTree(stage, { players: deadPlayers }, 10);
    expect(result.target).toBeNull();
  });
});

describe('selectTarget', () => {
  it('returns lowest HP player for lowest_hp strategy', () => {
    const target = selectTarget('lowest_hp', alivePlayers);
    expect(target.id).toBe('p2');
  });

  it('returns highest damage player for highest-damage-dealt strategy', () => {
    const target = selectTarget('highest-damage-dealt', alivePlayers);
    expect(target.id).toBe('p1');
  });

  it('returns null when no alive players', () => {
    expect(selectTarget('random', [])).toBeNull();
    expect(selectTarget('random', [{ id: 'x', hp: 0, isAlive: false }])).toBeNull();
  });

  it('returns a valid player for random strategy', () => {
    const target = selectTarget('random', alivePlayers);
    expect(['p1', 'p2']).toContain(target.id);
  });
});

describe('shouldBossRetreat', () => {
  it('returns true when hp is at or below retreatThreshold', () => {
    const stage = { retreatThreshold: 50 };
    expect(shouldBossRetreat({ hp: 50 }, stage)).toBe(true);
    expect(shouldBossRetreat({ hp: 30 }, stage)).toBe(true);
  });

  it('returns false when hp is above retreatThreshold', () => {
    expect(shouldBossRetreat({ hp: 100 }, { retreatThreshold: 50 })).toBe(false);
  });

  it('returns false when retreatThreshold is null (final form)', () => {
    expect(shouldBossRetreat({ hp: 5 }, { retreatThreshold: null })).toBe(false);
  });
});

describe('getRetreatZone', () => {
  it('returns retreatZone from behavior', () => {
    expect(getRetreatZone({ behavior: { retreatZone: 'deep-jungle' } })).toBe('deep-jungle');
  });

  it('returns null when no retreatZone', () => {
    expect(getRetreatZone({ behavior: {} })).toBeNull();
    expect(getRetreatZone({})).toBeNull();
  });
});
