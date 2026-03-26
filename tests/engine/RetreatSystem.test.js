import { describe, it, expect } from 'vitest';
import { resolveRetreat, getRetreatDestinations } from '@engine/RetreatSystem.js';

// Engine signature: resolveRetreat(roll, zoneModifier, outcomes)
// roll must be a rollD20()-shaped object: { natural, modified }

const outcomes = [
  { roll: [1, 5],   result: 'failure', description: 'You fail to escape!' },
  { roll: [6, 12],  result: 'success', description: 'You escape safely.' },
  { roll: [13, 20], result: 'perfect', description: 'Perfect escape!' },
];

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

function roll(n) { return { natural: n, modified: n }; }

describe('resolveRetreat', () => {
  it('returns failure outcome for low roll', () => {
    const r = resolveRetreat(roll(3), zone.retreatModifier, outcomes);
    expect(r.outcome).toBe('failure');
  });

  it('returns success outcome for mid roll', () => {
    const r = resolveRetreat(roll(10), zone.retreatModifier, outcomes);
    expect(r.outcome).toBe('success');
  });

  it('returns perfect outcome for high roll', () => {
    const r = resolveRetreat(roll(15), zone.retreatModifier, outcomes);
    expect(r.outcome).toBe('perfect');
    // Perfect escape adds a heal effect
    const heal = r.effects.find(e => e.type === 'heal');
    expect(heal).toBeDefined();
    expect(heal.value).toBe(10);
  });

  it('applies retreatModifier to roll (roll 3 + modifier 5 = 8 → success)', () => {
    const r = resolveRetreat(roll(3), 5, outcomes);
    expect(r.outcome).toBe('success');
  });

  it('clamps effective roll to 1–20 without crashing', () => {
    const r1 = resolveRetreat(roll(10), -20, outcomes); // clamped to 1
    expect(r1.outcome).toBeTruthy();
    const r2 = resolveRetreat(roll(10), 20, outcomes);  // clamped to 20
    expect(r2.outcome).toBeTruthy();
  });

  it('failure outcome has no heal effect', () => {
    const r = resolveRetreat(roll(2), zone.retreatModifier, outcomes);
    expect(r.outcome).toBe('failure');
    const heal = r.effects.find(e => e.type === 'heal');
    expect(heal).toBeUndefined();
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
