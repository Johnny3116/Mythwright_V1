import { describe, it, expect } from 'vitest';
import { resolveCombat, calculateDamage, applyDefense } from '@engine/CombatResolver.js';

const SETTINGS = {
  hitRanges: { miss: [1, 5], hit: [6, 15], critical: [16, 20] },
  critMultiplier: 2.0,
};

const ATTACKER = { damage: [20, 30], statusEffects: [] };
const DEFENDER  = { defense: 5, statusEffects: [] };

describe('resolveCombat', () => {
  it('miss roll (3) returns hit:false, damageDealt:0', () => {
    const r = resolveCombat(ATTACKER, DEFENDER, 3, SETTINGS);
    expect(r.hit).toBe(false);
    expect(r.damageDealt).toBe(0);
  });

  it('hit roll (10) returns hit:true, damageDealt > 0', () => {
    const r = resolveCombat(ATTACKER, DEFENDER, 10, SETTINGS);
    expect(r.hit).toBe(true);
    expect(r.damageDealt).toBeGreaterThan(0);
  });

  it('critical roll (18) returns critical:true, damageDealt ≥ min×critMultiplier−defense', () => {
    const r = resolveCombat(ATTACKER, DEFENDER, 18, SETTINGS);
    expect(r.hit).toBe(true);
    expect(r.critical).toBe(true);
    // Base damage for roll=18: 20 + (18 % 11) = 27; crit = 27*2 = 54; - defense 5 = 49
    expect(r.damageDealt).toBeGreaterThanOrEqual((20 * 2) - DEFENDER.defense);
  });

  it('damage is within attacker range (after defense)', () => {
    // Non-critical hits should have pre-defense damage in [20,30]
    const r = resolveCombat(ATTACKER, DEFENDER, 10, SETTINGS);
    expect(r.damageDealt).toBeGreaterThanOrEqual(0);
    expect(r.damageDealt).toBeLessThanOrEqual(30); // can't exceed max - defense floor 0
  });

  it('defense reduces damage correctly', () => {
    const highDefender = { defense: 100, statusEffects: [] };
    const r = resolveCombat(ATTACKER, highDefender, 10, SETTINGS);
    expect(r.damageDealt).toBe(0);
  });

  it('damage floors at 0 when defense exceeds raw damage', () => {
    const r = resolveCombat({ damage: [1, 1], statusEffects: [] }, { defense: 999, statusEffects: [] }, 10, SETTINGS);
    expect(r.damageDealt).toBe(0);
  });

  it('damageMultiplier status effect applies correctly', () => {
    const buffed = {
      damage: [20, 20],
      statusEffects: [{ type: 'damageMultiplier', value: 1.5, duration: 1 }],
    };
    const zeroDefender = { defense: 0, statusEffects: [] };
    const r = resolveCombat(buffed, zeroDefender, 10, SETTINGS);
    // base = 20, * 1.5 = 30
    expect(r.damageDealt).toBe(30);
    expect(r.effectsApplied).toContain('damageMultiplier');
  });

  it('damageReduction status effect applies correctly', () => {
    const shielded = {
      defense: 0,
      statusEffects: [{ type: 'damageReduction', value: 0.5, duration: 1 }],
    };
    const flatAttacker = { damage: [20, 20], statusEffects: [] };
    const r = resolveCombat(flatAttacker, shielded, 10, SETTINGS);
    // 20 * (1 - 0.5) = 10
    expect(r.damageDealt).toBe(10);
    expect(r.effectsApplied).toContain('damageReduction');
  });

  it('multiple modifiers stack', () => {
    const buffed = {
      damage: [10, 10],
      statusEffects: [{ type: 'damageMultiplier', value: 2.0, duration: 1 }],
    };
    const shielded = {
      defense: 0,
      statusEffects: [{ type: 'damageReduction', value: 0.5, duration: 1 }],
    };
    const r = resolveCombat(buffed, shielded, 10, SETTINGS);
    // 10 * 2 = 20; 20 * 0.5 = 10
    expect(r.damageDealt).toBe(10);
  });

  it('returns a narrative string', () => {
    const r = resolveCombat(ATTACKER, DEFENDER, 10, SETTINGS);
    expect(typeof r.narrative).toBe('string');
    expect(r.narrative.length).toBeGreaterThan(0);
  });

  it('miss narrative mentions miss', () => {
    const r = resolveCombat(ATTACKER, DEFENDER, 1, SETTINGS);
    expect(r.narrative.toLowerCase()).toContain('miss');
  });
});

describe('calculateDamage', () => {
  it('stays within [min, max] for any seed', () => {
    for (let seed = 0; seed < 100; seed++) {
      const v = calculateDamage(10, 20, seed);
      expect(v).toBeGreaterThanOrEqual(10);
      expect(v).toBeLessThanOrEqual(20);
    }
  });

  it('returns min when min === max', () => {
    expect(calculateDamage(15, 15, 42)).toBe(15);
  });
});

describe('applyDefense', () => {
  it('subtracts defense from damage', () => {
    expect(applyDefense(30, 10)).toBe(20);
  });

  it('floors at 0', () => {
    expect(applyDefense(5, 100)).toBe(0);
  });
});
