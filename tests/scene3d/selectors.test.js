import { describe, it, expect } from 'vitest';
import {
  toEncounterMiniatures,
  playerToMiniatureViewModel,
  bossToMiniatureViewModel,
  mobToMiniatureViewModel,
  getZoneSpawnPoints,
} from '../../src/scene3d/selectors/index.js';
import { MiniatureViewModelSchema } from '../../src/shared/contracts/encounter.js';

const mkBlueprint = () => ({
  defaultZoneSpawnPoints: {
    players: [
      { id: 'p-anchor-1', position: { x: -3, y: 0, z: -2 } },
      { id: 'p-anchor-2', position: { x: -1, y: 0, z: -2 } },
    ],
    enemies: [{ id: 'e1', position: { x: 0, y: 0, z: 2 } }],
    boss: { id: 'b', position: { x: 0, y: 0, z: 4 } },
    moveAnchors: [{ id: 'm', position: { x: 0, y: 0, z: 0 } }],
  },
  zones: [{ id: 'verdant-maw' }],
});

const mkPlayer = (overrides = {}) => ({
  id: 'p1',
  name: 'Alice',
  classId: 'assault',
  hp: 100,
  maxHp: 120,
  currentZone: 'verdant-maw',
  statusEffects: [],
  ...overrides,
});

const mkBoss = (overrides = {}) => ({
  id: 'tzorath',
  name: 'Tzorath',
  hp: 200,
  maxHp: 200,
  zone: 'verdant-maw',
  alive: true,
  statusEffects: [],
  ...overrides,
});

const mkState = (overrides = {}) => ({
  blueprint: mkBlueprint(),
  players: { p1: mkPlayer() },
  playerOrder: ['p1'],
  boss: mkBoss(),
  zoneMobs: { 'verdant-maw': { creature: 'Dusk Stalker', present: true, cleared: false } },
  ...overrides,
});

describe('getZoneSpawnPoints', () => {
  it('returns the blueprint default when zone has no override', () => {
    const bp = mkBlueprint();
    const sp = getZoneSpawnPoints(bp, 'verdant-maw');
    expect(sp).toBe(bp.defaultZoneSpawnPoints);
  });

  it('prefers a per-zone override when present', () => {
    const bp = mkBlueprint();
    const override = {
      players: [{ id: 'x', position: { x: 99, y: 0, z: 99 } }],
      enemies: [],
      boss: { id: 'b', position: { x: 0, y: 0, z: 0 } },
      moveAnchors: [{ id: 'm', position: { x: 0, y: 0, z: 0 } }],
    };
    bp.zones[0].spawnPoints = override;
    expect(getZoneSpawnPoints(bp, 'verdant-maw')).toBe(override);
  });

  it('returns null when blueprint has neither default nor zone override', () => {
    expect(getZoneSpawnPoints({ zones: [{ id: 'z' }] }, 'z')).toBeNull();
  });
});

describe('playerToMiniatureViewModel', () => {
  it('maps a player to a valid MiniatureViewModel at the indexed player anchor', () => {
    const bp = mkBlueprint();
    const player = mkPlayer();
    const vm = playerToMiniatureViewModel(player, {
      spawnPoints: bp.defaultZoneSpawnPoints,
      indexInZone: 0,
    });
    expect(MiniatureViewModelSchema.safeParse(vm).success).toBe(true);
    expect(vm.team).toBe('player');
    expect(vm.position).toEqual({ x: -3, y: 0, z: -2 });
    expect(vm.ringColor).toBe('#e0533d'); // assault
  });

  it('wraps to player anchor 0 when indexInZone exceeds anchor count', () => {
    const bp = mkBlueprint();
    const vm = playerToMiniatureViewModel(mkPlayer(), {
      spawnPoints: bp.defaultZoneSpawnPoints,
      indexInZone: 5, // wraps: 5 % 2 = 1
    });
    expect(vm.position).toEqual({ x: -1, y: 0, z: -2 });
  });

  it('uses default ring color when classId is unknown', () => {
    const bp = mkBlueprint();
    const vm = playerToMiniatureViewModel(mkPlayer({ classId: 'mystery' }), {
      spawnPoints: bp.defaultZoneSpawnPoints,
      indexInZone: 0,
    });
    expect(vm.ringColor).toBe('#9aa0a6');
  });

  it('extracts status effect names from object array', () => {
    const bp = mkBlueprint();
    const vm = playerToMiniatureViewModel(
      mkPlayer({ statusEffects: [{ type: 'disarmed' }, { type: 'poisoned' }] }),
      { spawnPoints: bp.defaultZoneSpawnPoints, indexInZone: 0 },
    );
    expect(vm.statusEffects).toEqual(['disarmed', 'poisoned']);
  });
});

describe('bossToMiniatureViewModel', () => {
  it('maps boss to a valid MiniatureViewModel at the boss anchor', () => {
    const bp = mkBlueprint();
    const vm = bossToMiniatureViewModel(mkBoss(), {
      spawnPoints: bp.defaultZoneSpawnPoints,
    });
    expect(MiniatureViewModelSchema.safeParse(vm).success).toBe(true);
    expect(vm.team).toBe('enemy');
    expect(vm.position).toEqual({ x: 0, y: 0, z: 4 });
    expect(vm.rotation).toBeCloseTo(Math.PI);
  });

  it('returns null when boss is missing', () => {
    expect(bossToMiniatureViewModel(null, { spawnPoints: {} })).toBeNull();
  });
});

describe('mobToMiniatureViewModel', () => {
  it('maps a present uncleared mob at the enemy anchor', () => {
    const bp = mkBlueprint();
    const vm = mobToMiniatureViewModel(
      { creature: 'Dusk Stalker', present: true, cleared: false },
      { zoneId: 'verdant-maw', spawnPoints: bp.defaultZoneSpawnPoints },
    );
    expect(MiniatureViewModelSchema.safeParse(vm).success).toBe(true);
    expect(vm.id).toBe('mob:verdant-maw');
    expect(vm.name).toBe('Dusk Stalker');
    expect(vm.hp).toEqual({ current: 1, max: 1 });
  });

  it('returns null for a cleared mob', () => {
    const bp = mkBlueprint();
    const vm = mobToMiniatureViewModel(
      { creature: 'X', present: false, cleared: true },
      { zoneId: 'verdant-maw', spawnPoints: bp.defaultZoneSpawnPoints },
    );
    expect(vm).toBeNull();
  });
});

describe('toEncounterMiniatures', () => {
  it('returns players + boss + mob in a fully populated zone', () => {
    const minis = toEncounterMiniatures(mkState(), 'verdant-maw');
    expect(minis.map((m) => m.id)).toEqual(['p1', 'tzorath', 'mob:verdant-maw']);
  });

  it('omits the boss when the boss is in another zone', () => {
    const state = mkState({ boss: mkBoss({ zone: 'razorback-canopy' }) });
    const minis = toEncounterMiniatures(state, 'verdant-maw');
    expect(minis.find((m) => m.id === 'tzorath')).toBeUndefined();
  });

  it('omits a player whose currentZone differs from the rendered zone', () => {
    const state = mkState({
      players: { p1: mkPlayer({ currentZone: 'razorback-canopy' }) },
    });
    const minis = toEncounterMiniatures(state, 'verdant-maw');
    expect(minis.find((m) => m.team === 'player')).toBeUndefined();
  });

  it('omits a cleared mob', () => {
    const state = mkState({
      zoneMobs: { 'verdant-maw': { creature: 'X', present: false, cleared: true } },
    });
    const minis = toEncounterMiniatures(state, 'verdant-maw');
    expect(minis.find((m) => m.id.startsWith('mob:'))).toBeUndefined();
  });

  it('marks the active player and the targeted mob', () => {
    const minis = toEncounterMiniatures(mkState(), 'verdant-maw', {
      activeEntityId: 'p1',
      targetedId: 'mob:verdant-maw',
    });
    const player = minis.find((m) => m.id === 'p1');
    const mob = minis.find((m) => m.id === 'mob:verdant-maw');
    expect(player.isActive).toBe(true);
    expect(mob.isTargeted).toBe(true);
  });

  it('returns [] when the blueprint or zone is missing', () => {
    expect(toEncounterMiniatures(null, 'z')).toEqual([]);
    expect(toEncounterMiniatures({ blueprint: {} }, null)).toEqual([]);
  });
});
