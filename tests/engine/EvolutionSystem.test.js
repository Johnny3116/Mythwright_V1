import { describe, it, expect } from 'vitest';
import {
  checkEvolutionThreshold,
  applyEvolution,
  getEvolutionNarrative,
  isFinalForm,
} from '@engine/EvolutionSystem.js';

const stages = [
  { stage: 1, name: 'Tzorath', maxHp: 400, retreatThreshold: 300, retreatRecovery: 50, damage: [20, 30], defense: 5 },
  { stage: 2, name: 'Tzorath (Enraged)', maxHp: 350, retreatThreshold: 200, retreatRecovery: 30, damage: [25, 35], defense: 8 },
  { stage: 3, name: 'Ancient Tzorath', maxHp: 300, retreatThreshold: null, retreatRecovery: 0, damage: [30, 45], defense: 10 },
];

describe('checkEvolutionThreshold', () => {
  it('returns shouldEvolve true when hp <= retreatThreshold', () => {
    const boss = { hp: 290, currentStage: 1 };
    const result = checkEvolutionThreshold(boss, stages);
    expect(result.shouldEvolve).toBe(true);
    expect(result.nextStageIndex).toBe(1);
  });

  it('returns shouldEvolve false when hp above threshold', () => {
    const boss = { hp: 350, currentStage: 1 };
    expect(checkEvolutionThreshold(boss, stages).shouldEvolve).toBe(false);
  });

  it('returns shouldEvolve false for final stage (null threshold)', () => {
    const boss = { hp: 10, currentStage: 3 };
    expect(checkEvolutionThreshold(boss, stages).shouldEvolve).toBe(false);
  });

  it('returns shouldEvolve false when on last stage with threshold', () => {
    // No next stage beyond index 2
    const boss = { hp: 10, currentStage: 2 };
    const twoStages = stages.slice(0, 2);
    expect(checkEvolutionThreshold(boss, twoStages).shouldEvolve).toBe(false);
  });
});

describe('applyEvolution', () => {
  it('advances stage number and name', () => {
    const boss = { hp: 280, currentStage: 1, zoneId: 'zone-a' };
    const next = applyEvolution(boss, stages[1]);
    expect(next.currentStage).toBe(2);
    expect(next.name).toBe('Tzorath (Enraged)');
  });

  it('recovers HP up to nextStage.maxHp', () => {
    const boss = { hp: 280, currentStage: 1, zoneId: 'zone-a' };
    const next = applyEvolution(boss, stages[1]);
    // 280 + 30 = 310, but maxHp is 350, so 310
    expect(next.hp).toBe(310);
    expect(next.maxHp).toBe(350);
  });

  it('does not exceed maxHp', () => {
    const boss = { hp: 330, currentStage: 1, zoneId: 'zone-a' };
    const next = applyEvolution(boss, stages[1]);
    // 330 + 30 = 360 > 350, clamped to 350
    expect(next.hp).toBe(350);
  });

  it('updates damage and defense stats', () => {
    const boss = { hp: 280, currentStage: 1, zoneId: 'zone-a' };
    const next = applyEvolution(boss, stages[1]);
    expect(next.damage).toEqual([25, 35]);
    expect(next.defense).toBe(8);
  });
});

describe('getEvolutionNarrative', () => {
  const narrative = {
    bossEvolutionNarrative: {
      stage1to2: 'It enrages!',
      stage2to3: 'Ancient form rises!',
    },
  };

  it('returns narrative text for stage 1→2', () => {
    expect(getEvolutionNarrative(1, narrative)).toBe('It enrages!');
  });

  it('returns fallback when key not found', () => {
    const result = getEvolutionNarrative(3, narrative);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('isFinalForm', () => {
  it('returns false for non-final stages', () => {
    expect(isFinalForm({ currentStage: 1 }, stages)).toBe(false);
    expect(isFinalForm({ currentStage: 2 }, stages)).toBe(false);
  });

  it('returns true for final stage (null retreatThreshold)', () => {
    expect(isFinalForm({ currentStage: 3 }, stages)).toBe(true);
  });
});
