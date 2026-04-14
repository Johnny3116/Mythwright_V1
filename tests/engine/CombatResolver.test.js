import { describe, it, expect } from 'vitest';
import { resolveCombat, calculateDamage, applyDefense } from '../../src/engine/CombatResolver.js';

// 5-tier hitRanges matching the campaign blueprint
const settings = {
  hitRanges: { critFail: [1, 1], miss: [2, 5], glancing: [6, 10], hit: [11, 19], critHit: [20, 20] },
  critMultiplier: 2.0,
};

const attacker = { damage: [10, 20] };
const defender = { defense: 5 };

describe('CombatResolver', () => {
  describe('resolveCombat', () => {
    it('returns critFail for roll 1', () => {
      const roll = { natural: 1, modified: 1, modifier: 0 };
      const result = resolveCombat(attacker, defender, roll, settings);
      expect(result.hit).toBe(false);
      expect(result.fumble).toBe(true);
      expect(result.tier).toBe('critFail');
      expect(result.damageDealt).toBe(0);
    });

    it('returns miss for roll 3 (miss range 2-5)', () => {
      const roll = { natural: 3, modified: 3, modifier: 0 };
      const result = resolveCombat(attacker, defender, roll, settings);
      expect(result.hit).toBe(false);
      expect(result.fumble).toBe(false);
      expect(result.tier).toBe('miss');
      expect(result.damageDealt).toBe(0);
    });

    it('returns glancing hit for roll 8 (glancing range 6-10)', () => {
      const roll = { natural: 8, modified: 8, modifier: 0 };
      const result = resolveCombat(attacker, defender, roll, settings);
      expect(result.hit).toBe(true);
      expect(result.glancing).toBe(true);
      expect(result.tier).toBe('glancing');
      expect(result.critical).toBe(false);
    });

    it('glancing deals roughly half damage compared to a full hit', () => {
      const fixedAttacker = { damage: [20, 20] };
      const noDefend = { defense: 0 };
      const glancingRoll = { natural: 8, modified: 8, modifier: 0 };
      const hitRoll = { natural: 15, modified: 15, modifier: 0 };
      const glancing = resolveCombat(fixedAttacker, noDefend, glancingRoll, settings);
      const hit = resolveCombat(fixedAttacker, noDefend, hitRoll, settings);
      // Glancing damage should be half of full hit (20 * 0.5 = 10)
      expect(glancing.damageDealt).toBe(10);
      expect(hit.damageDealt).toBe(20);
    });

    it('returns full hit for roll 15 (hit range 11-19)', () => {
      const roll = { natural: 15, modified: 15, modifier: 0 };
      const result = resolveCombat(attacker, defender, roll, settings);
      expect(result.hit).toBe(true);
      expect(result.glancing).toBe(false);
      expect(result.critical).toBe(false);
      expect(result.tier).toBe('hit');
      expect(result.damageDealt).toBeGreaterThanOrEqual(0);
    });

    it('returns critical hit for roll 20', () => {
      const roll = { natural: 20, modified: 20, modifier: 0 };
      const result = resolveCombat(attacker, defender, roll, settings);
      expect(result.hit).toBe(true);
      expect(result.critical).toBe(true);
      expect(result.tier).toBe('critHit');
    });

    it('critical deals more damage than a normal hit', () => {
      const roll = { natural: 20, modified: 20, modifier: 0 };
      const highAttacker = { damage: [20, 20] };
      const result = resolveCombat(highAttacker, { defense: 0 }, roll, settings);
      // 20 * 2.0 = 40
      expect(result.damageDealt).toBe(40);
    });

    it('damage is floored at 0 (not negative)', () => {
      const tankDefender = { defense: 1000 };
      const roll = { natural: 15, modified: 15, modifier: 0 };
      const result = resolveCombat(attacker, tankDefender, roll, settings);
      expect(result.damageDealt).toBeGreaterThanOrEqual(0);
    });

    it('returns narrative string', () => {
      const roll = { natural: 15, modified: 15, modifier: 0 };
      const result = resolveCombat(attacker, defender, roll, settings);
      expect(typeof result.narrative).toBe('string');
      expect(result.narrative.length).toBeGreaterThan(0);
    });

    it('returns effectsApplied array', () => {
      const roll = { natural: 15, modified: 15, modifier: 0 };
      const result = resolveCombat(attacker, defender, roll, settings);
      expect(Array.isArray(result.effectsApplied)).toBe(true);
    });

    it('critFail effectsApplied includes disarmed', () => {
      const roll = { natural: 1, modified: 1, modifier: 0 };
      const result = resolveCombat(attacker, defender, roll, settings);
      expect(result.effectsApplied).toContain('disarmed');
    });

    it('respects lethalStrikeBonus for boss-style hit ranges', () => {
      const bossSettings = {
        hitRanges: { miss: [1, 5], hit: [6, 15], lethalStrike: [16, 20] },
        critMultiplier: 2.0,
        lethalStrikeBonus: 0.5,
      };
      const roll = { natural: 18, modified: 18, modifier: 0 };
      const result = resolveCombat({ damage: [20, 20] }, { defense: 0 }, roll, bossSettings);
      expect(result.critical).toBe(true);
      // 20 * (1 + 0.5) = 30
      expect(result.damageDealt).toBeGreaterThanOrEqual(25);
    });

    it('applies damageMultiplier modifier from attacker', () => {
      const roll = { natural: 15, modified: 15, modifier: 0 };
      const strongAttacker = { damage: [10, 10], modifiers: { multiplier: 2 } };
      const result = resolveCombat(strongAttacker, { defense: 0 }, roll, settings);
      // 10 * 2 = 20, then no defense
      expect(result.damageDealt).toBe(20);
    });
  });

  describe('calculateDamage', () => {
    it('returns value within [min, max]', () => {
      for (let i = 0; i < 100; i++) {
        const d = calculateDamage([10, 20]);
        expect(d).toBeGreaterThanOrEqual(10);
        expect(d).toBeLessThanOrEqual(20);
      }
    });

    it('applies multiplier', () => {
      const d = calculateDamage([10, 10], { multiplier: 2 });
      expect(d).toBe(20);
    });

    it('applies flatBonus', () => {
      const d = calculateDamage([10, 10], { flatBonus: 5 });
      expect(d).toBe(15);
    });

    it('never returns negative', () => {
      const d = calculateDamage([10, 10], { multiplier: -99 });
      expect(d).toBeGreaterThanOrEqual(0);
    });
  });

  describe('applyDefense', () => {
    it('subtracts defense from damage', () => {
      expect(applyDefense(30, 10)).toBe(20);
    });

    it('floors at 0 when defense exceeds damage', () => {
      expect(applyDefense(10, 100)).toBe(0);
    });

    it('applies shield reduction', () => {
      expect(applyDefense(30, 5, 5)).toBe(20);
    });

    it('handles 0 defense', () => {
      expect(applyDefense(25, 0)).toBe(25);
    });
  });
});
