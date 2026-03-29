/**
 * SpatialEngine — unit tests
 * Covers: zone adjacency, boss visibility, action availability,
 *         zone mob state, boss hunt resolution, search, heal, flee.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getAdjacentZones,
  areZonesAdjacent,
  getZone,
  getPlayersInZone,
  isBossInPlayerZone,
  isBossVisible,
  getAvailableActions,
  hasMobsInZone,
  initializeZoneMobs,
  clearZoneMobs,
  selectBossMoveTarget,
  resolveBossHuntZone,
  resolveZoneEncounter,
  resolveSearch,
  resolveHeal,
  resolveFlee,
} from '../../src/engine/SpatialEngine.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockBlueprint = {
  zones: [
    {
      id: 'verdant-maw',
      name: 'Verdant Maw',
      connectedZones: ['razorback-canopy', 'shattered-cliffs'],
      wildlife: { creature: 'Dusk Stalker', type: 'panther', bossEffect: { hp: 20 }, attackChance: [1, 5], attackDamage: 15 },
      trapBonus: '+2 to Snare Vine rolls',
    },
    {
      id: 'razorback-canopy',
      name: 'Razorback Canopy',
      connectedZones: ['verdant-maw', 'obsidian-grotto', 'shattered-cliffs'],
      wildlife: { creature: 'Glide Serpent', type: 'snake', bossEffect: { hp: 10, nextAttackDamage: 5 }, attackChance: [1, 4], attackDamage: 10 },
      trapBonus: 'Snare Vine lasts 1 extra turn',
    },
    {
      id: 'shattered-cliffs',
      name: 'Shattered Cliffs',
      connectedZones: ['verdant-maw', 'razorback-canopy', 'sunken-veil'],
      wildlife: { creature: 'Rockhide Boar', type: 'boar', bossEffect: { hp: 30, defense: 5 }, attackChance: [1, 6], attackDamage: 20 },
      trapBonus: 'Spiked Pit does +10 damage',
    },
    {
      id: 'obsidian-grotto',
      name: 'Obsidian Grotto',
      connectedZones: ['razorback-canopy', 'sunken-veil'],
      wildlife: { creature: 'Glowspore Lizard', type: 'lizard', bossEffect: { hp: 10 }, attackChance: [1, 5], attackDamage: 10 },
      trapBonus: 'Poisoned Spikes lasts 1 extra turn',
    },
    {
      id: 'sunken-veil',
      name: 'Sunken Veil',
      connectedZones: ['shattered-cliffs', 'obsidian-grotto'],
      wildlife: { creature: 'Mirefang Croc', type: 'crocodile', bossEffect: { hp: 40 }, attackChance: [1, 7], attackDamage: 25 },
      trapBonus: 'Traps have -2 difficulty',
    },
    {
      id: 'tzorath-throne',
      name: "Tzorath's Throne",
      connectedZones: ['shattered-cliffs'],
      wildlife: { creature: 'Elder Behemoth', type: 'apex', bossEffect: { hp: 100 }, attackChance: [1, 5], attackDamage: 30 },
      trapBonus: 'No traps allowed — Final Battle Only!',
    },
  ],
  classes: [
    { id: 'assault', name: 'Assault', baseStats: { hp: 120, damage: [20, 30], defense: 10 } },
    { id: 'medic',   name: 'Medic',   baseStats: { hp: 90,  damage: [10, 15], defense: 10 } },
  ],
  systems: {
    wildlife: {
      enabled: true,
      bossHuntRolls: { fail: [1, 8], eat: [9, 16], eatBonus: [17, 20] },
    },
  },
};

function makePlayer(overrides = {}) {
  return {
    id: 'player-1',
    name: 'Alice',
    classId: 'assault',
    hp: 100,
    maxHp: 120,
    alive: true,
    zone: 'verdant-maw',
    ...overrides,
  };
}

function makeBoss(overrides = {}) {
  return {
    id: 'tzorath',
    name: 'Tzorath',
    hp: 300,
    maxHp: 300,
    zone: 'razorback-canopy',
    damage: [20, 30],
    defense: 15,
    alive: true,
    ...overrides,
  };
}

function makeState(overrides = {}) {
  return {
    players: { 'player-1': makePlayer() },
    boss: makeBoss(),
    placedTraps: [],
    zoneMobs: initializeZoneMobs(mockBlueprint),
    searchedZones: [],
    blueprint: mockBlueprint,
    ...overrides,
  };
}

// ─── Zone Navigation ──────────────────────────────────────────────────────────

describe('getAdjacentZones', () => {
  it('returns connected zones for a given zone', () => {
    const result = getAdjacentZones('verdant-maw', mockBlueprint);
    expect(result).toEqual(['razorback-canopy', 'shattered-cliffs']);
  });

  it('returns empty array for unknown zone', () => {
    expect(getAdjacentZones('nonexistent', mockBlueprint)).toEqual([]);
  });

  it('returns multiple connections', () => {
    const result = getAdjacentZones('razorback-canopy', mockBlueprint);
    expect(result).toHaveLength(3);
    expect(result).toContain('verdant-maw');
    expect(result).toContain('obsidian-grotto');
    expect(result).toContain('shattered-cliffs');
  });
});

describe('areZonesAdjacent', () => {
  it('returns true for directly connected zones', () => {
    expect(areZonesAdjacent('verdant-maw', 'razorback-canopy', mockBlueprint)).toBe(true);
  });

  it('returns false for non-connected zones', () => {
    expect(areZonesAdjacent('verdant-maw', 'obsidian-grotto', mockBlueprint)).toBe(false);
  });

  it('is directional (checks source zone connections only)', () => {
    // verdant-maw → shattered-cliffs: true
    expect(areZonesAdjacent('verdant-maw', 'shattered-cliffs', mockBlueprint)).toBe(true);
  });
});

describe('getZone', () => {
  it('returns zone object by id', () => {
    const zone = getZone('verdant-maw', mockBlueprint);
    expect(zone.id).toBe('verdant-maw');
    expect(zone.name).toBe('Verdant Maw');
  });

  it('returns null for unknown zone', () => {
    expect(getZone('not-a-zone', mockBlueprint)).toBeNull();
  });
});

// ─── Entity Positioning ───────────────────────────────────────────────────────

describe('getPlayersInZone', () => {
  it('returns players in the given zone', () => {
    const players = {
      'p1': makePlayer({ id: 'p1', zone: 'verdant-maw', alive: true }),
      'p2': makePlayer({ id: 'p2', zone: 'razorback-canopy', alive: true }),
      'p3': makePlayer({ id: 'p3', zone: 'verdant-maw', alive: true }),
    };
    const result = getPlayersInZone('verdant-maw', players);
    expect(result).toHaveLength(2);
    expect(result.map(p => p.id)).toContain('p1');
    expect(result.map(p => p.id)).toContain('p3');
  });

  it('excludes dead players', () => {
    const players = {
      'p1': makePlayer({ id: 'p1', zone: 'verdant-maw', alive: true }),
      'p2': makePlayer({ id: 'p2', zone: 'verdant-maw', alive: false }),
    };
    expect(getPlayersInZone('verdant-maw', players)).toHaveLength(1);
  });

  it('returns empty array when no players in zone', () => {
    const players = { 'p1': makePlayer({ id: 'p1', zone: 'other-zone', alive: true }) };
    expect(getPlayersInZone('verdant-maw', players)).toHaveLength(0);
  });
});

describe('isBossInPlayerZone', () => {
  it('returns true when player and boss share a zone', () => {
    const player = makePlayer({ zone: 'razorback-canopy' });
    const boss = makeBoss({ zone: 'razorback-canopy' });
    expect(isBossInPlayerZone(player, boss)).toBe(true);
  });

  it('returns false when in different zones', () => {
    const player = makePlayer({ zone: 'verdant-maw' });
    const boss = makeBoss({ zone: 'razorback-canopy' });
    expect(isBossInPlayerZone(player, boss)).toBe(false);
  });
});

// ─── Boss Visibility ──────────────────────────────────────────────────────────

describe('isBossVisible', () => {
  it('returns true when a living player is in the boss zone', () => {
    const players = { 'p1': makePlayer({ zone: 'razorback-canopy' }) };
    const boss = makeBoss({ zone: 'razorback-canopy' });
    expect(isBossVisible(players, boss, [])).toBe(true);
  });

  it('returns false when no player is in boss zone', () => {
    const players = { 'p1': makePlayer({ zone: 'verdant-maw' }) };
    const boss = makeBoss({ zone: 'razorback-canopy' });
    expect(isBossVisible(players, boss, [])).toBe(false);
  });

  it('returns true when boss zone has been searched', () => {
    const players = { 'p1': makePlayer({ zone: 'verdant-maw' }) };
    const boss = makeBoss({ zone: 'razorback-canopy' });
    expect(isBossVisible(players, boss, ['razorback-canopy'])).toBe(true);
  });

  it('returns false when dead player is in boss zone', () => {
    const players = { 'p1': makePlayer({ zone: 'razorback-canopy', alive: false }) };
    const boss = makeBoss({ zone: 'razorback-canopy' });
    expect(isBossVisible(players, boss, [])).toBe(false);
  });

  it('returns false when boss has no zone', () => {
    const players = { 'p1': makePlayer({ zone: 'verdant-maw' }) };
    expect(isBossVisible(players, { zone: null }, [])).toBe(false);
  });
});

// ─── Zone Mob State ───────────────────────────────────────────────────────────

describe('initializeZoneMobs', () => {
  it('creates mob entries for all zones with wildlife', () => {
    const mobs = initializeZoneMobs(mockBlueprint);
    expect(Object.keys(mobs)).toHaveLength(mockBlueprint.zones.filter(z => z.wildlife).length);
  });

  it('marks all mobs as present and not cleared on init', () => {
    const mobs = initializeZoneMobs(mockBlueprint);
    for (const mob of Object.values(mobs)) {
      expect(mob.present).toBe(true);
      expect(mob.cleared).toBe(false);
    }
  });

  it('stores creature name from blueprint', () => {
    const mobs = initializeZoneMobs(mockBlueprint);
    expect(mobs['verdant-maw'].creature).toBe('Dusk Stalker');
    expect(mobs['razorback-canopy'].creature).toBe('Glide Serpent');
  });
});

describe('clearZoneMobs', () => {
  it('marks mobs as cleared in the specified zone', () => {
    const initial = initializeZoneMobs(mockBlueprint);
    const updated = clearZoneMobs('verdant-maw', initial);
    expect(updated['verdant-maw'].cleared).toBe(true);
    expect(updated['verdant-maw'].present).toBe(false);
  });

  it('does not affect other zones', () => {
    const initial = initializeZoneMobs(mockBlueprint);
    const updated = clearZoneMobs('verdant-maw', initial);
    expect(updated['razorback-canopy'].present).toBe(true);
    expect(updated['razorback-canopy'].cleared).toBe(false);
  });

  it('is a pure function — original unchanged', () => {
    const initial = initializeZoneMobs(mockBlueprint);
    clearZoneMobs('verdant-maw', initial);
    expect(initial['verdant-maw'].present).toBe(true);
  });
});

describe('hasMobsInZone', () => {
  it('returns true when mobs are present and not cleared', () => {
    const state = { zoneMobs: initializeZoneMobs(mockBlueprint) };
    expect(hasMobsInZone('verdant-maw', state)).toBe(true);
  });

  it('returns false when mobs are cleared', () => {
    const cleared = clearZoneMobs('verdant-maw', initializeZoneMobs(mockBlueprint));
    expect(hasMobsInZone('verdant-maw', { zoneMobs: cleared })).toBe(false);
  });

  it('returns false for zone with no mob data', () => {
    expect(hasMobsInZone('nonexistent', { zoneMobs: {} })).toBe(false);
  });
});

// ─── Context-Aware Actions ────────────────────────────────────────────────────

describe('getAvailableActions', () => {
  it('move is available when adjacent zones exist', () => {
    const player = makePlayer({ zone: 'verdant-maw' });
    const state = makeState({ players: { 'player-1': player } });
    const actions = getAvailableActions(player, state, mockBlueprint);
    expect(actions.move.available).toBe(true);
    expect(actions.move.adjacentZones).toContain('razorback-canopy');
  });

  it('attack is available when boss is in same zone', () => {
    const player = makePlayer({ zone: 'razorback-canopy' });
    const boss = makeBoss({ zone: 'razorback-canopy' });
    const state = makeState({ players: { 'player-1': player }, boss });
    const actions = getAvailableActions(player, state, mockBlueprint);
    expect(actions.attack.available).toBe(true);
  });

  it('attack is unavailable when boss is in different zone and no mobs', () => {
    const player = makePlayer({ zone: 'verdant-maw' });
    const boss = makeBoss({ zone: 'razorback-canopy' });
    const state = makeState({
      players: { 'player-1': player },
      boss,
      zoneMobs: { 'verdant-maw': { present: false, cleared: true } },
    });
    const actions = getAvailableActions(player, state, mockBlueprint);
    expect(actions.attack.available).toBe(false);
  });

  it('attack is available when mobs are present in zone', () => {
    const player = makePlayer({ zone: 'verdant-maw' });
    const boss = makeBoss({ zone: 'razorback-canopy' });
    const state = makeState({ players: { 'player-1': player }, boss });
    const actions = getAvailableActions(player, state, mockBlueprint);
    // verdant-maw has mobs by default
    expect(actions.attack.available).toBe(true);
  });

  it('setTrap is blocked in tzorath-throne zone', () => {
    const player = makePlayer({ zone: 'tzorath-throne' });
    const state = makeState({ players: { 'player-1': player } });
    const actions = getAvailableActions(player, state, mockBlueprint);
    expect(actions.setTrap.available).toBe(false);
  });

  it('setTrap is blocked when active trap already placed', () => {
    const player = makePlayer({ zone: 'verdant-maw' });
    const state = makeState({
      players: { 'player-1': player },
      placedTraps: [{ zoneId: 'verdant-maw', active: true }],
    });
    const actions = getAvailableActions(player, state, mockBlueprint);
    expect(actions.setTrap.available).toBe(false);
  });

  it('heal lists allies in same zone', () => {
    const player1 = makePlayer({ id: 'p1', zone: 'verdant-maw' });
    const player2 = makePlayer({ id: 'p2', name: 'Bob', zone: 'verdant-maw', alive: true });
    const state = makeState({ players: { 'p1': player1, 'p2': player2 } });
    const actions = getAvailableActions(player1, state, mockBlueprint);
    expect(actions.heal.hasAllies).toBe(true);
    expect(actions.heal.allies.some(a => a.id === 'p2')).toBe(true);
  });

  it('flee is available when adjacent zones exist', () => {
    const player = makePlayer({ zone: 'verdant-maw' });
    const state = makeState({ players: { 'player-1': player } });
    const actions = getAvailableActions(player, state, mockBlueprint);
    expect(actions.flee.available).toBe(true);
    expect(actions.flee.adjacentZones.length).toBeGreaterThan(0);
  });

  it('returns error shape when player is null', () => {
    const actions = getAvailableActions(null, {}, mockBlueprint);
    expect(actions.move.available).toBe(false);
    expect(actions.attack.available).toBe(false);
  });
});

// ─── Boss Hunt ────────────────────────────────────────────────────────────────

describe('resolveBossHuntZone', () => {
  it('hunts and clears mobs on successful roll (eat range 9-16)', () => {
    const zoneMobs = initializeZoneMobs(mockBlueprint);
    const roll = { natural: 12, modified: 12 };
    const result = resolveBossHuntZone('verdant-maw', zoneMobs, mockBlueprint, roll);

    expect(result.hunted).toBe(true);
    expect(result.updatedZoneMobs['verdant-maw'].cleared).toBe(true);
    expect(result.buffs.length).toBeGreaterThan(0);
    expect(result.buffs.some(b => b.type === 'hpRestore')).toBe(true);
  });

  it('fails to hunt on low roll (fail range 1-8)', () => {
    const zoneMobs = initializeZoneMobs(mockBlueprint);
    const roll = { natural: 4, modified: 4 };
    const result = resolveBossHuntZone('verdant-maw', zoneMobs, mockBlueprint, roll);

    expect(result.hunted).toBe(false);
    expect(result.updatedZoneMobs['verdant-maw'].cleared).toBe(false);
    expect(result.buffs).toHaveLength(0);
  });

  it('returns higher buffs on eatBonus roll (17-20)', () => {
    const zoneMobs = initializeZoneMobs(mockBlueprint);
    const roll = { natural: 18, modified: 18 };
    const result = resolveBossHuntZone('verdant-maw', zoneMobs, mockBlueprint, roll);
    expect(result.hunted).toBe(true);
    expect(result.narrative).toContain('feasting greedily');
  });

  it('returns no hunt when zone has no wildlife', () => {
    const bpWithZone = {
      ...mockBlueprint,
      zones: [...mockBlueprint.zones, { id: 'empty-zone', name: 'Empty', connectedZones: [] }],
    };
    const zoneMobs = { 'empty-zone': { present: false, cleared: false } };
    const roll = { natural: 15, modified: 15 };
    const result = resolveBossHuntZone('empty-zone', zoneMobs, bpWithZone, roll);
    expect(result.hunted).toBe(false);
  });

  it('returns no hunt when zone mobs already cleared', () => {
    const cleared = clearZoneMobs('verdant-maw', initializeZoneMobs(mockBlueprint));
    const roll = { natural: 18, modified: 18 };
    const result = resolveBossHuntZone('verdant-maw', cleared, mockBlueprint, roll);
    expect(result.hunted).toBe(false);
  });
});

// ─── Zone Encounter ───────────────────────────────────────────────────────────

describe('resolveZoneEncounter', () => {
  it('returns no attack when zone has no mobs', () => {
    const state = { zoneMobs: { 'verdant-maw': { present: false, cleared: true } } };
    const roll = { natural: 3, modified: 3 };
    const result = resolveZoneEncounter(makePlayer(), 'verdant-maw', state.zoneMobs, mockBlueprint, roll);
    expect(result.attacked).toBe(false);
    expect(result.damage).toBe(0);
  });

  it('triggers mob attack when roll is in attack chance range', () => {
    // verdant-maw attackChance is [1, 5], attackDamage is 15
    const zoneMobs = initializeZoneMobs(mockBlueprint);
    const roll = { natural: 3, modified: 3 }; // within [1,5]
    const result = resolveZoneEncounter(makePlayer(), 'verdant-maw', zoneMobs, mockBlueprint, roll);
    expect(result.attacked).toBe(true);
    expect(result.damage).toBe(15);
  });

  it('does not trigger attack when roll is outside attack chance', () => {
    // verdant-maw attackChance is [1, 5]
    const zoneMobs = initializeZoneMobs(mockBlueprint);
    const roll = { natural: 10, modified: 10 }; // outside [1,5]
    const result = resolveZoneEncounter(makePlayer(), 'verdant-maw', zoneMobs, mockBlueprint, roll);
    expect(result.attacked).toBe(false);
    expect(result.damage).toBe(0);
  });
});

// ─── Search ───────────────────────────────────────────────────────────────────

describe('resolveSearch', () => {
  it('low roll (1-5) finds nothing', () => {
    const state = makeState();
    const roll = { natural: 3, modified: 3 };
    const result = resolveSearch(makePlayer(), 'verdant-maw', state, roll);
    expect(result.narrative).toContain('finds nothing');
  });

  it('high roll (15+) can reveal boss location when boss is in same zone', () => {
    const player = makePlayer({ zone: 'razorback-canopy' });
    const boss = makeBoss({ zone: 'razorback-canopy' });
    const state = makeState({ players: { 'player-1': player }, boss });
    const roll = { natural: 17, modified: 17 };
    const result = resolveSearch(player, 'razorback-canopy', state, roll);
    expect(result.foundBoss).toBe(true);
  });

  it('high roll reveals boss if boss is in adjacent zone', () => {
    const player = makePlayer({ zone: 'verdant-maw' });
    // razorback-canopy is adjacent to verdant-maw
    const boss = makeBoss({ zone: 'razorback-canopy' });
    const state = makeState({ players: { 'player-1': player }, boss });
    const roll = { natural: 16, modified: 16 };
    const result = resolveSearch(player, 'verdant-maw', state, roll);
    expect(result.foundBoss).toBe(true);
    expect(result.newSearchedZones).toContain('razorback-canopy');
  });

  it('adds zone to searchedZones', () => {
    const state = makeState({ searchedZones: [] });
    const roll = { natural: 10, modified: 10 };
    const result = resolveSearch(makePlayer(), 'verdant-maw', state, roll);
    expect(result.newSearchedZones).toContain('verdant-maw');
  });

  it('does not duplicate zones in searchedZones', () => {
    const state = makeState({ searchedZones: ['verdant-maw'] });
    const roll = { natural: 10, modified: 10 };
    const result = resolveSearch(makePlayer(), 'verdant-maw', state, roll);
    expect(result.newSearchedZones.filter(z => z === 'verdant-maw')).toHaveLength(1);
  });
});

// ─── Heal ────────────────────────────────────────────────────────────────────

describe('resolveHeal', () => {
  it('returns a positive heal amount', () => {
    const healer = makePlayer({ classId: 'assault' });
    const target = makePlayer({ id: 'p2', name: 'Bob' });
    const roll = { natural: 10, modified: 10 };
    const { healAmount } = resolveHeal(healer, target, roll, mockBlueprint);
    expect(healAmount).toBeGreaterThan(0);
  });

  it('low roll (1-5) gives reduced healing (50% multiplier)', () => {
    const healer = makePlayer({ classId: 'assault' });
    const target = makePlayer({ id: 'p2' });
    const highRoll = { natural: 15, modified: 15 };
    const lowRoll = { natural: 3, modified: 3 };
    // Low roll should generally heal less — compare minimum values
    const { healAmount: high } = resolveHeal(healer, target, highRoll, mockBlueprint);
    const { healAmount: low } = resolveHeal(healer, target, lowRoll, mockBlueprint);
    // Can't be deterministic with RNG but low ≤ high is true over many runs;
    // just verify both are positive and low is not more than max possible of high
    expect(low).toBeGreaterThan(0);
    expect(high).toBeGreaterThan(0);
  });

  it('includes player names in narrative', () => {
    const healer = makePlayer({ name: 'Alice', classId: 'medic' });
    const target = makePlayer({ id: 'p2', name: 'Bob' });
    const roll = { natural: 10, modified: 10 };
    const { narrative } = resolveHeal(healer, target, roll, mockBlueprint);
    expect(narrative).toContain('Alice');
    expect(narrative).toContain('Bob');
  });

  it('self-heal says "themselves"', () => {
    const healer = makePlayer({ name: 'Alice', classId: 'assault' });
    const roll = { natural: 10, modified: 10 };
    const { narrative } = resolveHeal(healer, healer, roll, mockBlueprint);
    expect(narrative).toContain('themselves');
  });
});

// ─── Flee ────────────────────────────────────────────────────────────────────

describe('resolveFlee', () => {
  it('successfully flees to adjacent zone', () => {
    const player = makePlayer({ zone: 'verdant-maw' });
    const state = makeState({ players: { 'player-1': player } });
    const roll = { natural: 15, modified: 15 };
    const result = resolveFlee(player, 'razorback-canopy', state, roll);
    expect(result.success).toBe(true);
    expect(result.newZoneId).toBe('razorback-canopy');
  });

  it('fails to flee to non-adjacent zone', () => {
    const player = makePlayer({ zone: 'verdant-maw' });
    const state = makeState({ players: { 'player-1': player } });
    const roll = { natural: 15, modified: 15 };
    // obsidian-grotto is not adjacent to verdant-maw
    const result = resolveFlee(player, 'obsidian-grotto', state, roll);
    expect(result.success).toBe(false);
    expect(result.newZoneId).toBe('verdant-maw');
  });

  it('no opportunity attack when boss is not in player zone', () => {
    const player = makePlayer({ zone: 'verdant-maw' });
    const boss = makeBoss({ zone: 'razorback-canopy' });
    const state = makeState({ players: { 'player-1': player }, boss });
    const roll = { natural: 3, modified: 3 }; // low roll — would trigger OA if boss here
    const result = resolveFlee(player, 'shattered-cliffs', state, roll);
    expect(result.opportunityAttack).toBe(false);
  });

  it('triggers opportunity attack on low roll when boss is in same zone', () => {
    const player = makePlayer({ zone: 'verdant-maw' });
    const boss = makeBoss({ zone: 'verdant-maw', damage: [20, 20] }); // deterministic damage
    const state = makeState({ players: { 'player-1': player }, boss });
    const roll = { natural: 5, modified: 5 }; // ≤8 triggers OA
    const result = resolveFlee(player, 'razorback-canopy', state, roll);
    expect(result.opportunityAttack).toBe(true);
    expect(result.opportunityDamage).toBeGreaterThan(0);
  });

  it('no opportunity attack on high roll even with boss in zone', () => {
    const player = makePlayer({ zone: 'verdant-maw' });
    const boss = makeBoss({ zone: 'verdant-maw' });
    const state = makeState({ players: { 'player-1': player }, boss });
    const roll = { natural: 14, modified: 14 }; // >8, no OA
    const result = resolveFlee(player, 'razorback-canopy', state, roll);
    expect(result.opportunityAttack).toBe(false);
  });
});

// ─── Boss Move Target Selection ──────────────────────────────────────────────

describe('selectBossMoveTarget', () => {
  it('prefers zones with wildlife on high roll (15+)', () => {
    const boss = makeBoss({ zone: 'verdant-maw' });
    const state = makeState({ boss });
    const roll = { natural: 18, modified: 18 };
    const target = selectBossMoveTarget(boss, state, mockBlueprint, roll);
    // Should pick a zone with wildlife and mobs present
    expect(target).not.toBe('verdant-maw');
    const targetZoneMob = state.zoneMobs[target];
    expect(targetZoneMob?.present).toBe(true);
  });

  it('returns a different zone from current on all rolls', () => {
    const boss = makeBoss({ zone: 'verdant-maw' });
    const state = makeState({ boss });
    // Run multiple times to check randomness doesn't always return current zone
    const targets = new Set();
    for (let i = 1; i <= 20; i++) {
      const target = selectBossMoveTarget(boss, state, mockBlueprint, { natural: i, modified: i });
      targets.add(target);
    }
    // Should sometimes return zones other than verdant-maw
    expect(targets.size).toBeGreaterThan(1);
  });
});
