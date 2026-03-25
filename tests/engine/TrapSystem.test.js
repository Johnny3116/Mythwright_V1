import { describe, it, expect } from 'vitest';
import {
  placeTrap,
  checkTrapTrigger,
  getZoneTraps,
  markTrapTriggered,
} from '@engine/TrapSystem.js';

const trapDef = {
  id: 'snare',
  name: 'Snare Trap',
  setupRoll: 8,
  damage: 20,
  escapeChance: 15,
  effect: 'Ensnares the target.',
};

const zone = { id: 'zone-a', name: 'Forest', trapBonus: 'Good terrain.' };

describe('placeTrap', () => {
  it('succeeds when roll meets threshold', () => {
    const r = placeTrap(trapDef, 'zone-a', 10, zone);
    expect(r.success).toBe(true);
    expect(r.trapState).not.toBeNull();
    expect(r.trapState.trapType).toBe('snare');
    expect(r.trapState.triggered).toBe(false);
  });

  it('fails when roll is below threshold', () => {
    const r = placeTrap(trapDef, 'zone-a', 5, zone);
    expect(r.success).toBe(false);
    expect(r.trapState).toBeNull();
    expect(r.narrative).toContain('Failed');
  });

  it('includes trapBonus in narrative on success', () => {
    const r = placeTrap(trapDef, 'zone-a', 12, zone);
    expect(r.narrative).toContain('Good terrain');
  });
});

describe('getZoneTraps', () => {
  it('returns only untriggered traps in the zone', () => {
    const state = {
      traps: [
        { id: 'snare-zone-a-1', zoneId: 'zone-a', triggered: false },
        { id: 'snare-zone-a-2', zoneId: 'zone-a', triggered: true },
        { id: 'snare-zone-b-1', zoneId: 'zone-b', triggered: false },
      ],
    };
    const result = getZoneTraps('zone-a', state);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('snare-zone-a-1');
  });
});

describe('checkTrapTrigger', () => {
  const activeTrap = { id: 'snare-z', zoneId: 'zone-a', triggered: false, name: 'Snare Trap', damage: 20, escapeChance: 15, effect: 'Ensnares.' };
  const state = { traps: [activeTrap] };

  it('returns triggered:false when no active traps', () => {
    const r = checkTrapTrigger('zone-empty', state, 10);
    expect(r.triggered).toBe(false);
    expect(r.damage).toBe(0);
  });

  it('boss takes damage when roll below escapeChance', () => {
    const r = checkTrapTrigger('zone-a', state, 10);
    expect(r.triggered).toBe(true);
    expect(r.escaped).toBe(false);
    expect(r.damage).toBe(20);
  });

  it('boss escapes when roll at or above escapeChance', () => {
    const r = checkTrapTrigger('zone-a', state, 15);
    expect(r.triggered).toBe(true);
    expect(r.escaped).toBe(true);
    expect(r.damage).toBe(0);
  });
});

describe('markTrapTriggered', () => {
  it('marks the specified trap as triggered', () => {
    const traps = [
      { id: 'trap-1', triggered: false },
      { id: 'trap-2', triggered: false },
    ];
    const result = markTrapTriggered(traps, 'trap-1');
    expect(result[0].triggered).toBe(true);
    expect(result[1].triggered).toBe(false);
  });

  it('does not mutate original array', () => {
    const traps = [{ id: 'trap-1', triggered: false }];
    markTrapTriggered(traps, 'trap-1');
    expect(traps[0].triggered).toBe(false);
  });
});
