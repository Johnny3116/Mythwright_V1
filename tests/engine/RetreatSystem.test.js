import { describe, it, expect } from 'vitest';
import { resolveRetreat, getRetreatDestinations } from '@engine/RetreatSystem.js';

const retreatSettings = {
  endsTurn: true,
  outcomes: [
    { roll: [1, 5],   result: 'failure',  description: 'You fail to escape!' },
    { roll: [6, 12],  result: 'success',  description: 'You escape safely.' },
    { roll: [13, 20], result: 'perfect',  description: 'Perfect escape!' },
  ],
};

const zone = {
  id: 'zone-a',
  retreatModifier: 0,
  connectedZones: ['zone-b', 'zone-c'],
};

const allZones = [
  { id: 'zone-a' },
  { id: 'zone-b' },
  { id: 'zone-c' },
  { id: 'zone-d' },
];

describe('resolveRetreat', () => {
  it('returns failure outcome for low roll', () => {
    const r = resolveRetreat({}, zone, retreatSettings, 3);
    expect(r.outcome).toBe('failure');
    expect(r.newZoneId).toBeNull();
  });

  it('returns success and destination for mid roll', () => {
    const r = resolveRetreat({}, zone, retreatSettings, 10);
    expect(r.outcome).toBe('success');
    expect(r.newZoneId).toBe('zone-b');
  });

  it('returns perfect with healAmount for high roll', () => {
    const r = resolveRetreat({}, zone, retreatSettings, 15);
    expect(r.outcome).toBe('perfect');
    expect(r.healAmount).toBe(10);
    expect(r.newZoneId).toBe('zone-b');
  });

  it('applies retreatModifier to roll', () => {
    const buffedZone = { ...zone, retreatModifier: 5 }; // roll 3 + 5 = 8 → success
    const r = resolveRetreat({}, buffedZone, retreatSettings, 3);
    expect(r.outcome).toBe('success');
  });

  it('clamps effective roll to 1–20', () => {
    const r1 = resolveRetreat({}, { ...zone, retreatModifier: -20 }, retreatSettings, 10);
    expect(r1.outcome).toBeTruthy(); // no crash
    const r2 = resolveRetreat({}, { ...zone, retreatModifier: 20 }, retreatSettings, 10);
    expect(r2.outcome).toBeTruthy();
  });

  it('failure outcome has no healAmount', () => {
    const r = resolveRetreat({}, zone, retreatSettings, 2);
    expect(r.healAmount).toBe(0);
  });
});

describe('getRetreatDestinations', () => {
  it('returns zones matching connectedZones', () => {
    const dests = getRetreatDestinations(zone, allZones);
    expect(dests.map(z => z.id)).toEqual(['zone-b', 'zone-c']);
  });

  it('returns empty array when no connected zones', () => {
    expect(getRetreatDestinations({ connectedZones: [] }, allZones)).toHaveLength(0);
  });
});
