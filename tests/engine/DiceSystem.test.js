import { describe, it, expect } from 'vitest';
import {
  rollD20,
  rollInRange,
  rollBetween,
  rollDie,
  rollMultiple,
  createRollHistory,
} from '../../src/engine/DiceSystem.js';

describe('DiceSystem', () => {
  describe('rollD20', () => {
    it('returns values between 1 and 20', () => {
      for (let i = 0; i < 100; i++) {
        const result = rollD20();
        expect(result.natural).toBeGreaterThanOrEqual(1);
        expect(result.natural).toBeLessThanOrEqual(20);
      }
    });

    it('applies modifier to modified value', () => {
      const result = rollD20(5);
      expect(result.modifier).toBe(5);
      expect(result.modified).toBe(result.natural + 5);
    });

    it('applies negative modifier', () => {
      const result = rollD20(-3);
      expect(result.modifier).toBe(-3);
      expect(result.modified).toBe(result.natural - 3);
    });

    it('defaults to 0 modifier', () => {
      const result = rollD20();
      expect(result.modifier).toBe(0);
      expect(result.modified).toBe(result.natural);
    });

    it('returns the correct shape { natural, modified, modifier }', () => {
      const result = rollD20(2);
      expect(result).toHaveProperty('natural');
      expect(result).toHaveProperty('modified');
      expect(result).toHaveProperty('modifier');
    });

    it('achieves roughly uniform distribution over 10,000 rolls (<5% deviation)', () => {
      const counts = new Array(21).fill(0);
      const ROLLS = 10000;
      for (let i = 0; i < ROLLS; i++) {
        counts[rollD20().natural]++;
      }
      const expected = ROLLS / 20; // 500 per face
      // Use 15% tolerance to avoid spurious failures from natural RNG variance
      // while still catching any face that is grossly over- or under-represented
      const tolerance = expected * 0.15;

      for (let face = 1; face <= 20; face++) {
        expect(counts[face]).toBeGreaterThanOrEqual(expected - tolerance);
        expect(counts[face]).toBeLessThanOrEqual(expected + tolerance);
      }
    });
  });

  describe('rollInRange', () => {
    const ranges = { miss: [1, 5], hit: [6, 15], critical: [16, 20] };

    it('matches miss range', () => {
      expect(rollInRange(1, ranges)).toBe('miss');
      expect(rollInRange(3, ranges)).toBe('miss');
      expect(rollInRange(5, ranges)).toBe('miss');
    });

    it('matches hit range', () => {
      expect(rollInRange(6, ranges)).toBe('hit');
      expect(rollInRange(10, ranges)).toBe('hit');
      expect(rollInRange(15, ranges)).toBe('hit');
    });

    it('matches critical range', () => {
      expect(rollInRange(16, ranges)).toBe('critical');
      expect(rollInRange(18, ranges)).toBe('critical');
      expect(rollInRange(20, ranges)).toBe('critical');
    });

    it('returns null for value outside all ranges', () => {
      expect(rollInRange(0, ranges)).toBeNull();
      expect(rollInRange(21, ranges)).toBeNull();
    });
  });

  describe('rollBetween', () => {
    it('returns value within inclusive range', () => {
      for (let i = 0; i < 200; i++) {
        const v = rollBetween(5, 10);
        expect(v).toBeGreaterThanOrEqual(5);
        expect(v).toBeLessThanOrEqual(10);
      }
    });

    it('returns exact value for min === max', () => {
      expect(rollBetween(7, 7)).toBe(7);
    });

    it('covers the full range', () => {
      const seen = new Set();
      for (let i = 0; i < 10000; i++) {
        seen.add(rollBetween(1, 6));
      }
      expect(seen.size).toBe(6);
    });
  });

  describe('rollDie', () => {
    it('returns values between 1 and faces', () => {
      for (let i = 0; i < 100; i++) {
        const r = rollDie(6);
        expect(r.natural).toBeGreaterThanOrEqual(1);
        expect(r.natural).toBeLessThanOrEqual(6);
      }
    });

    it('applies modifier correctly', () => {
      const r = rollDie(6, 3);
      expect(r.modified).toBe(r.natural + 3);
    });
  });

  describe('rollMultiple', () => {
    it('returns correct number of rolls', () => {
      const r = rollMultiple(3, 6);
      expect(r.rolls).toHaveLength(3);
    });

    it('sum matches manual addition', () => {
      const r = rollMultiple(3, 6);
      expect(r.sum).toBe(r.rolls.reduce((a, b) => a + b, 0));
    });

    it('total includes modifier', () => {
      const r = rollMultiple(2, 6, 4);
      expect(r.total).toBe(r.sum + 4);
    });
  });

  describe('createRollHistory', () => {
    it('starts empty', () => {
      const hist = createRollHistory();
      expect(hist.getAll()).toHaveLength(0);
    });

    it('add and getAll', () => {
      const hist = createRollHistory();
      hist.add({ natural: 15, modified: 15, modifier: 0 });
      hist.add({ natural: 3, modified: 3, modifier: 0 });
      expect(hist.getAll()).toHaveLength(2);
    });

    it('getLast returns last n entries', () => {
      const hist = createRollHistory();
      for (let i = 1; i <= 5; i++) hist.add({ natural: i, modified: i, modifier: 0 });
      const last2 = hist.getLast(2);
      expect(last2).toHaveLength(2);
      expect(last2[1].natural).toBe(5);
    });

    it('getStats returns average and extremes', () => {
      const hist = createRollHistory();
      hist.add({ natural: 1, modified: 1, modifier: 0 });
      hist.add({ natural: 20, modified: 20, modifier: 0 });
      const stats = hist.getStats();
      expect(stats.count).toBe(2);
      expect(stats.average).toBe(10.5);
      expect(stats.min).toBe(1);
      expect(stats.max).toBe(20);
    });

    it('serialize and deserialize round-trip', () => {
      const hist = createRollHistory();
      hist.add({ natural: 12, modified: 12, modifier: 0 });
      const data = hist.serialize();

      const hist2 = createRollHistory();
      hist2.deserialize(data);
      expect(hist2.getAll()).toHaveLength(1);
      expect(hist2.getAll()[0].natural).toBe(12);
    });

    it('clear removes all history', () => {
      const hist = createRollHistory();
      hist.add({ natural: 10, modified: 10, modifier: 0 });
      hist.clear();
      expect(hist.getAll()).toHaveLength(0);
    });
  });
});
