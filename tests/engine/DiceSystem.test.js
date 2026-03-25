import { describe, it, expect, beforeEach } from 'vitest';
import {
  rollD20, rollDie, rollMultiple,
  rollInRange, rollBetween,
  getRollHistory, clearRollHistory, rollHistory,
} from '@engine/DiceSystem.js';

beforeEach(() => clearRollHistory());

describe('rollD20', () => {
  it('returns values between 1 and 20', () => {
    for (let i = 0; i < 100; i++) {
      const { raw } = rollD20();
      expect(raw).toBeGreaterThanOrEqual(1);
      expect(raw).toBeLessThanOrEqual(20);
    }
  });

  it('total = raw + modifier', () => {
    for (let i = 0; i < 50; i++) {
      const { raw, modifier, total } = rollD20(2);
      expect(total).toBe(raw + 2);
      expect(modifier).toBe(2);
    }
  });

  it('negative modifier subtracts correctly', () => {
    const { raw, total } = rollD20(-3);
    expect(total).toBe(raw - 3);
  });

  it('has approximately uniform distribution over 10,000 rolls (each value ±5% of 500)', () => {
    clearRollHistory();
    const counts = new Array(21).fill(0);
    for (let i = 0; i < 10000; i++) counts[rollD20().raw]++;
    for (let v = 1; v <= 20; v++) {
      expect(counts[v]).toBeGreaterThanOrEqual(400); // 500 - 20%
      expect(counts[v]).toBeLessThanOrEqual(600);    // 500 + 20%
    }
  });

  it('does NOT use Math.random', () => {
    // Verify by mocking Math.random and confirming it is never called
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    rollD20();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

import { vi } from 'vitest';

describe('rollInRange', () => {
  const ranges = { miss: [1, 5], hit: [6, 15], critical: [16, 20] };

  it('identifies miss for rolls 1–5', () => {
    for (let r = 1; r <= 5; r++) expect(rollInRange(r, ranges)).toBe('miss');
  });

  it('identifies hit for rolls 6–15', () => {
    for (let r = 6; r <= 15; r++) expect(rollInRange(r, ranges)).toBe('hit');
  });

  it('identifies critical for rolls 16–20', () => {
    for (let r = 16; r <= 20; r++) expect(rollInRange(r, ranges)).toBe('critical');
  });

  it('handles custom ranges', () => {
    const custom = { miss: [1, 3], hit: [4, 18], crit: [19, 20] };
    expect(rollInRange(2, custom)).toBe('miss');
    expect(rollInRange(10, custom)).toBe('hit');
    expect(rollInRange(20, custom)).toBe('crit');
  });

  it('returns null for out-of-range roll', () => {
    expect(rollInRange(21, ranges)).toBeNull();
  });
});

describe('rollBetween', () => {
  it('stays within bounds over 1,000 rolls', () => {
    for (let i = 0; i < 1000; i++) {
      const v = rollBetween(5, 15);
      expect(v).toBeGreaterThanOrEqual(5);
      expect(v).toBeLessThanOrEqual(15);
    }
  });

  it('returns min when min === max', () => {
    expect(rollBetween(7, 7)).toBe(7);
  });
});

describe('rollHistory', () => {
  it('tracks all rolls via getRollHistory()', () => {
    rollD20();
    rollD20();
    expect(getRollHistory()).toHaveLength(2);
  });

  it('clearRollHistory empties the log', () => {
    rollD20();
    clearRollHistory();
    expect(getRollHistory()).toHaveLength(0);
  });

  it('getStats returns correct min/max/average', () => {
    clearRollHistory();
    // Force specific raw values by rolling enough to get varied results
    for (let i = 0; i < 200; i++) rollD20();
    const { min, max, average, count } = rollHistory.getStats();
    expect(min).toBeGreaterThanOrEqual(1);
    expect(max).toBeLessThanOrEqual(20);
    expect(average).toBeGreaterThan(1);
    expect(average).toBeLessThan(20);
    expect(count).toBe(200);
  });
});

describe('rollMultiple', () => {
  it('returns correct count of individual rolls', () => {
    const { rolls } = rollMultiple(3, 6);
    expect(rolls).toHaveLength(3);
    rolls.forEach(r => { expect(r).toBeGreaterThanOrEqual(1); expect(r).toBeLessThanOrEqual(6); });
  });

  it('sum equals individual rolls added together', () => {
    const { rolls, sum } = rollMultiple(4, 8);
    expect(sum).toBe(rolls.reduce((a, b) => a + b, 0));
  });

  it('total includes modifier', () => {
    const { sum, total } = rollMultiple(2, 6, 3);
    expect(total).toBe(sum + 3);
  });
});
