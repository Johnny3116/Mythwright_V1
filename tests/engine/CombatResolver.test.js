import { describe, it, expect } from 'vitest';
import { resolveCombat, calculateDamage, applyDefense } from '../../src/engine/CombatResolver.js';

const settings = {
  hitRanges: { miss: [1, 5], hit: [6, 15], critical: [16, 20] },
  critMultiplier: 2.0,
};

const attacker = { damage: [10, 20] };
const defender = { defense: 5 };

describe('CombatResolver', () => {
  describe('resolveCombat', () => {
    it('returns miss for roll 3 (miss range 1-5)', () => {
      const roll = { natural: 3, modified: 3, modifier: 0 };
      const result = resolveCombat(attacker, defender, roll, settings);
      expect(result.hit).toBe(false);
      expect(result.critical).toBe(false);
      expect(result.damageDealt).toBe(0);
    });

    it('returns hit for roll 10 (hit range 6-15)', () => {
      const roll = { natural: 10, modified: 10, modifier: 0 };
      const result = resolveCombat(attacker, defender, roll, settings);
      expect(result.hit).toBe(true);
      expect(result.critical).toBe(false);
      expect(result.damageDealt).toBeGreaterThanOrEqual(0);
    });

    it('returns critical for roll 18 (critical range 16-20)', () => {
      const roll = { natural: 18, modified: 18, modifier: 0 };
      const result = resolveCombat(attacker, defender, roll, settings);
      expect(result.hit).toBe(true);
      expect(result.critical).toBe(true);
    });

    it('critical deals more damage than a hit on average', () => {
      // With critMultiplier 2.0, crits should deal roughly double base damage
      const roll = { natural: 18, modified: 18, modifier: 0 };
      const highAttacker = { damage: [20, 20] }; // fixed damage for determinism
      const result = resolveCombat(highAttacker, { defense: 0 }, roll, settings);
      // 20 * 2.0 = 40, minus defense 0
      expect(result.damageDealt).toBeGreaterThanOrEqual(20);
    });

    it('damage is floored at 0 (not negative)', () => {
      const tankDefender = { defense: 1000 };
      const roll = { natural: 10, modified: 10, modifier: 0 };
      const result = resolveCombat(attacker, tankDefender, roll, settings);
      expect(result.damageDealt).toBeGreaterThanOrEqual(0);
    });

    it('returns narrative string', () => {
      const roll = { natural: 10, modified: 10, modifier: 0 };
      const result = resolveCombat(attacker, defender, roll, settings);
      expect(typeof result.narrative).toBe('string');
      expect(result.narrative.length).toBeGreaterThan(0);
    });

    it('returns effectsApplied array', () => {
      const roll = { natural: 10, modified: 10, modifier: 0 };
      const result = resolveCombat(attacker, defender, roll, settings);
      expect(Array.isArray(result.effectsApplied)).toBe(true);
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
      const roll = { natural: 10, modified: 10, modifier: 0 };
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
      // With a fixed range [10, 10], multiplier 2 → 20
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
