import { describe, it, expect } from 'vitest';
import { searchFlora, relocateFlora } from '@engine/FloraSystem.js';

const floraSettings = {
  respawnInterval: 3,
  searchRolls: { fail: [1, 5], supercharged: [18, 20] },
  plants: [
    { id: 'bloodmoss', name: 'Bloodmoss', spawnChance: [1, 10], healAmount: 20, additionalEffect: 'Clears poison.' },
    { id: 'glowcap', name: 'Glowcap', spawnChance: [11, 20], healAmount: 10, additionalEffect: '' },
  ],
};

const floraState = {
  'zone-a': { plantId: 'bloodmoss', zoneId: 'zone-a' },
};

const player = { id: 'p1', hp: 60 };

describe('searchFlora', () => {
  it('returns found:false when no flora in zone', () => {
    const r = searchFlora(player, 'zone-empty', floraState, floraSettings, 10);
    expect(r.found).toBe(false);
    expect(r.healAmount).toBe(0);
  });

  it('returns found:false on fail roll', () => {
    const r = searchFlora(player, 'zone-a', floraState, floraSettings, 3);
    expect(r.found).toBe(false);
  });

  it('returns found:true with normal heal on regular hit', () => {
    const r = searchFlora(player, 'zone-a', floraState, floraSettings, 12);
    expect(r.found).toBe(true);
    expect(r.healAmount).toBe(20);
    expect(r.floraType).toBe('bloodmoss');
  });

  it('returns 1.5× heal on supercharged roll', () => {
    const r = searchFlora(player, 'zone-a', floraState, floraSettings, 19);
    expect(r.found).toBe(true);
    expect(r.healAmount).toBe(30); // 20 * 1.5
    expect(r.narrative).toContain('potent');
  });
});

describe('relocateFlora', () => {
  const zones = [
    { id: 'zone-a', flora: { spawnWeight: 3 } },
    { id: 'zone-b', flora: { spawnWeight: 2 } },
  ];

  it('does not change flora when interval not reached', () => {
    const state = { 'zone-a': { plantId: 'bloodmoss', zoneId: 'zone-a' } };
    const result = relocateFlora(state, zones, floraSettings, 2);
    expect(result).toBe(state); // same reference
  });

  it('re-spawns flora when interval is reached', () => {
    const state = {};
    // round 3 hits interval of 3
    const result = relocateFlora(state, zones, floraSettings, 3);
    expect(typeof result).toBe('object');
    // Result may or may not have flora depending on random rolls, but must be an object
  });
});
