import { describe, it, expect } from 'vitest';
import {
  checkEvolution,
  evolve,
  isFinalForm,
  getEvolutionNarrative,
  checkEvolutionThreshold,
  applyEvolution,
} from '../../src/engine/EvolutionSystem.js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const blueprint = JSON.parse(
  readFileSync(resolve(process.cwd(), 'campaigns/monster-hunt-tzorath.json'), 'utf-8')
);

describe('EvolutionSystem', () => {
  describe('checkEvolution', () => {
    it('triggers evolution when HP equals retreatThreshold for stage 1', () => {
      const boss = { hp: 100, stage: 1 };
      const result = checkEvolution(boss, blueprint);
      expect(result.shouldEvolve).toBe(true);
      expect(result.currentStage).toBe(1);
      expect(result.nextStage).toBe(2);
    });

    it('triggers when HP is below retreatThreshold', () => {
      const boss = { hp: 50, stage: 1 };
      const result = checkEvolution(boss, blueprint);
      expect(result.shouldEvolve).toBe(true);
    });

    it('does not trigger when HP is above retreatThreshold', () => {
      const boss = { hp: 150, stage: 1 };
      const result = checkEvolution(boss, blueprint);
      expect(result.shouldEvolve).toBe(false);
    });

    it('does not trigger for final form (stage 5, null threshold)', () => {
      const boss = { hp: 10, stage: 5 };
      const result = checkEvolution(boss, blueprint);
      expect(result.shouldEvolve).toBe(false);
      expect(result.nextStage).toBeNull();
    });

    it('returns correct thresholds for all stages', () => {
      const thresholds = [100, 150, 200, 250, null];
      thresholds.forEach((threshold, i) => {
        const stage = i + 1;
        const boss = { hp: threshold === null ? 10 : threshold, stage };
        const result = checkEvolution(boss, blueprint);
        if (threshold === null) {
          expect(result.shouldEvolve).toBe(false);
        } else {
          expect(result.shouldEvolve).toBe(true);
        }
      });
    });
  });

  describe('evolve', () => {
    it('transitions boss from stage 1 to stage 2', () => {
      const boss = { hp: 80, stage: 1, maxHp: 200, currentZoneId: 'verdant-maw', effects: [] };
      const { newState, narrative, retreatZone } = evolve(boss, blueprint);
      expect(newState.stage).toBe(2);
      expect(newState.maxHp).toBe(300);
      expect(newState.hp).toBeGreaterThan(0);
      expect(typeof narrative).toBe('string');
      expect(retreatZone).toBe('obsidian-grotto');
    });

    it('applies retreatRecovery HP', () => {
      const boss = { hp: 80, stage: 1, maxHp: 200, currentZoneId: 'verdant-maw', effects: [] };
      const { newState } = evolve(boss, blueprint);
      // Stage 2 retreatRecovery is 75, should have significant HP
      expect(newState.hp).toBeGreaterThan(50);
    });

    it('updates damage and defense values', () => {
      const boss = { hp: 80, stage: 1, maxHp: 200, currentZoneId: 'verdant-maw', effects: [] };
      const { newState } = evolve(boss, blueprint);
      // Stage 2 damage is [20, 30]
      expect(newState.damage).toEqual([20, 30]);
      expect(newState.defense).toBe(15);
    });

    it('moves boss to retreat zone', () => {
      const boss = { hp: 80, stage: 1, maxHp: 200, currentZoneId: 'verdant-maw', effects: [] };
      const { newState } = evolve(boss, blueprint);
      expect(newState.currentZoneId).toBe('obsidian-grotto');
    });

    it('returns current state with message when already at final form', () => {
      const boss = { hp: 100, stage: 5, maxHp: 700, currentZoneId: 'tzorath-throne', effects: [] };
      const { newState, narrative } = evolve(boss, blueprint);
      expect(newState.stage).toBe(5); // No change
      expect(typeof narrative).toBe('string');
    });
  });

  describe('isFinalForm', () => {
    it('returns false for stage 1', () => {
      expect(isFinalForm({ stage: 1 }, blueprint)).toBe(false);
    });

    it('returns false for stage 4', () => {
      expect(isFinalForm({ stage: 4 }, blueprint)).toBe(false);
    });

    it('returns true for stage 5', () => {
      expect(isFinalForm({ stage: 5 }, blueprint)).toBe(true);
    });
  });

  describe('getEvolutionNarrative', () => {
    it('returns stage1to2 narrative', () => {
      const narrative = getEvolutionNarrative(1, blueprint.narrative);
      expect(narrative).toContain('Tzorath');
    });

    it('returns stage4toFinal narrative', () => {
      const narrative = getEvolutionNarrative(4, blueprint.narrative);
      expect(narrative.length).toBeGreaterThan(10);
    });

    it('returns fallback string for unknown stage', () => {
      const narrative = getEvolutionNarrative(99, blueprint.narrative);
      expect(typeof narrative).toBe('string');
      expect(narrative.length).toBeGreaterThan(0);
    });
  });

  describe('checkEvolutionThreshold (legacy)', () => {
    it('returns shouldEvolve true at threshold', () => {
      const boss = { hp: 100, stage: 1 };
      const { shouldEvolve } = checkEvolutionThreshold(boss, blueprint.enemies.boss.stages);
      expect(shouldEvolve).toBe(true);
    });
  });

  describe('applyEvolution (legacy)', () => {
    it('applies next stage stats to boss state', () => {
      const boss = { hp: 80, stage: 1, maxHp: 200, currentZoneId: 'verdant-maw', effects: [] };
      const nextStage = blueprint.enemies.boss.stages[1]; // stage 2
      const updated = applyEvolution(boss, nextStage);
      expect(updated.stage).toBe(2);
      expect(updated.maxHp).toBe(300);
    });
  });
});
