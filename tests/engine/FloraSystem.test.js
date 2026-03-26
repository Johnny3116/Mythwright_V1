import { describe, it, expect } from 'vitest';
import { searchFlora, relocateFlora } from '@engine/FloraSystem.js';

// Engine's searchFlora passes roll to searchForPlant which expects { natural, modified }
function roll(n) { return { natural: n, modified: n }; }

const floraSettings = {
  respawnInterval: 3,
  // Must include a hit range — rolls between fail and supercharged must match something
  searchRolls: { fail: [1, 5], hit: [6, 17], supercharged: [18, 20] },
};

// floraState values must include healAmount/name for applyPlantHealing to work
const floraState = {
  'zone-a': { id: 'bloodmoss', name: 'Bloodmoss', zoneId: 'zone-a', healAmount: 20, additionalEffect: '' },
};

const player = { id: 'p1', hp: 60 };

describe('searchFlora', () => {
  it('returns found:false when no flora in zone', () => {
    const r = searchFlora(player, 'zone-empty', floraState, floraSettings, roll(10));
    expect(r.found).toBe(false);
    expect(r.healAmount).toBe(0);
  });

  it('returns found:false on fail roll', () => {
    const r = searchFlora(player, 'zone-a', floraState, floraSettings, roll(3));
    expect(r.found).toBe(false);
  });

  it('returns found:true with normal heal on hit roll', () => {
    const r = searchFlora(player, 'zone-a', floraState, floraSettings, roll(12));
    expect(r.found).toBe(true);
    expect(r.healAmount).toBe(20);
    expect(r.floraType).toBe('bloodmoss');
  });

  it('returns 2× heal on supercharged roll', () => {
    const r = searchFlora(player, 'zone-a', floraState, floraSettings, roll(19));
    expect(r.found).toBe(true);
    expect(r.healAmount).toBe(40); // engine uses baseHeal * 2 for supercharged
    expect(r.narrative).toContain('SUPERCHARGED');
  });
});

describe('relocateFlora', () => {
  const zones = [
    { id: 'zone-a', flora: { spawnWeight: 3 } },
    { id: 'zone-b', flora: { spawnWeight: 2 } },
  ];

  it('does not change flora when interval not reached', () => {
    // relocateFlora(currentSpawns, zones, round, interval)
    const state = { 'zone-a': { id: 'bloodmoss', zoneId: 'zone-a', healAmount: 20 } };
    const result = relocateFlora(state, zones, 2, 3); // round 2, interval 3 → no change
    expect(result).toBe(state); // same reference
  });

  it('returns an object when interval is reached', () => {
    const state = {};
    const result = relocateFlora(state, zones, 3, 3); // round 3 hits interval
    expect(typeof result).toBe('object');
  });
});
