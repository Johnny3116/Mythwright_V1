import { describe, it, expect } from 'vitest';
import {
  attemptSetTrap,
  getPlacedTraps,
  triggerTraps,
  getAvailableTraps,
  placeTrap,
  checkTrapTrigger,
} from '../../src/engine/TrapSystem.js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const blueprint = JSON.parse(
  readFileSync(resolve(process.cwd(), 'campaigns/monster-hunt-tzorath.json'), 'utf-8')
);

const spikedPit = blueprint.systems.traps.types.find((t) => t.id === 'spiked-pit');
const snareVine = blueprint.systems.traps.types.find((t) => t.id === 'snare-vine');
const shockNet = blueprint.systems.traps.types.find((t) => t.id === 'shock-net');
const explosiveTrap = blueprint.systems.traps.types.find((t) => t.id === 'explosive-trap');

const verdantMaw = blueprint.zones.find((z) => z.id === 'verdant-maw');

describe('TrapSystem', () => {
  describe('attemptSetTrap', () => {
    it('succeeds when roll meets setupRoll threshold', () => {
      const roll = { natural: 15, modified: 15 }; // spiked-pit needs 10
      const result = attemptSetTrap(spikedPit, roll, verdantMaw);
      expect(result.success).toBe(true);
      expect(result.trapPlaced).not.toBeNull();
      expect(result.trapPlaced.typeId).toBe('spiked-pit');
    });

    it('fails when roll is below setupRoll threshold', () => {
      const roll = { natural: 5, modified: 5 }; // spiked-pit needs 10
      const result = attemptSetTrap(spikedPit, roll, verdantMaw);
      expect(result.success).toBe(false);
      expect(result.trapPlaced).toBeNull();
    });

    it('succeeds exactly at setupRoll threshold', () => {
      const roll = { natural: spikedPit.setupRoll, modified: spikedPit.setupRoll };
      const result = attemptSetTrap(spikedPit, roll, verdantMaw);
      expect(result.success).toBe(true);
    });

    it('placed trap has correct properties', () => {
      const roll = { natural: 20, modified: 20 };
      const { trapPlaced } = attemptSetTrap(spikedPit, roll, verdantMaw);
      expect(trapPlaced.damage).toBe(30);
      expect(trapPlaced.active).toBe(true);
      expect(trapPlaced.id).toBeDefined();
    });

    it('highest difficulty trap (shock-net, needs 18) fails on roll 17', () => {
      const roll = { natural: 17, modified: 17 };
      const result = attemptSetTrap(shockNet, roll, verdantMaw);
      expect(result.success).toBe(false);
    });

    it('highest difficulty trap (shock-net, needs 18) succeeds on roll 18', () => {
      const roll = { natural: 18, modified: 18 };
      const result = attemptSetTrap(shockNet, roll, verdantMaw);
      expect(result.success).toBe(true);
    });
  });

  describe('getPlacedTraps', () => {
    it('returns empty array when no traps in zone', () => {
      const gameState = { traps: {} };
      expect(getPlacedTraps(gameState, 'verdant-maw')).toHaveLength(0);
    });

    it('returns only active traps', () => {
      const trap1 = { id: 't1', typeId: 'spiked-pit', active: true, damage: 30, zoneId: 'verdant-maw' };
      const trap2 = { id: 't2', typeId: 'snare-vine', active: false, damage: 15, zoneId: 'verdant-maw' };
      const gameState = { placedTraps: [trap1, trap2] };
      const active = getPlacedTraps(gameState, 'verdant-maw');
      expect(active).toHaveLength(1);
      expect(active[0].id).toBe('t1');
    });
  });

  describe('triggerTraps', () => {
    const trap = { id: 't1', typeId: 'spiked-pit', active: true, damage: 30, escapeChance: 15, effect: 'Stops target for 1 turn', zoneId: 'verdant-maw' };
    const gameState = { placedTraps: [trap] };
    const bossState = { hp: 200, defense: 10 };

    it('triggers trap and boss takes damage when escape roll is too low', () => {
      const lowRollFn = () => ({ natural: 5, modified: 5 }); // below escapeChance 15
      const { results } = triggerTraps('verdant-maw', bossState, gameState, lowRollFn);
      expect(results).toHaveLength(1);
      expect(results[0].escaped).toBe(false);
      expect(results[0].damage).toBe(30);
    });

    it('boss escapes trap when roll meets escapeChance', () => {
      const highRollFn = () => ({ natural: 18, modified: 18 }); // above escapeChance 15
      const { results } = triggerTraps('verdant-maw', bossState, gameState, highRollFn);
      expect(results[0].escaped).toBe(true);
      expect(results[0].damage).toBe(0);
    });

    it('returns empty results when no traps in zone', () => {
      const emptyState = { placedTraps: [] };
      const { results } = triggerTraps('empty-zone', bossState, emptyState, () => ({ natural: 10, modified: 10 }));
      expect(results).toHaveLength(0);
    });

    it('trap with null escapeChance cannot be escaped', () => {
      const poisonTrap = { id: 't2', typeId: 'poisoned-spikes', active: true, damage: 20, escapeChance: null, effect: 'Poison', zoneId: 'zone1' };
      const state = { placedTraps: [poisonTrap] };
      const { results } = triggerTraps('zone1', bossState, state, () => ({ natural: 20, modified: 20 }));
      expect(results[0].escaped).toBe(false);
    });

    it('applies immobilize effect when trap stops target', () => {
      const lowRollFn = () => ({ natural: 5, modified: 5 });
      const { results } = triggerTraps('verdant-maw', bossState, gameState, lowRollFn);
      const effects = results[0].effects;
      expect(effects.some((e) => e.type === 'immobilize')).toBe(true);
    });
  });

  describe('getAvailableTraps', () => {
    it('returns all 5 trap types from blueprint', () => {
      const traps = getAvailableTraps(blueprint);
      expect(traps).toHaveLength(5);
    });

    it('returns empty when traps are disabled', () => {
      const noTraps = { ...blueprint, systems: { ...blueprint.systems, traps: { enabled: false, types: [] } } };
      expect(getAvailableTraps(noTraps)).toHaveLength(0);
    });
  });

  describe('placeTrap (legacy API)', () => {
    it('returns success and narrative for successful placement', () => {
      const result = placeTrap(spikedPit, 'verdant-maw', 15, verdantMaw);
      expect(result.success).toBe(true);
      expect(typeof result.narrative).toBe('string');
      expect(result.trapState).not.toBeNull();
    });

    it('returns failure narrative for low roll', () => {
      const result = placeTrap(spikedPit, 'verdant-maw', 5, verdantMaw);
      expect(result.success).toBe(false);
      expect(result.trapState).toBeNull();
    });
  });

  describe('checkTrapTrigger (legacy API)', () => {
    it('returns triggered=false when zone has no traps', () => {
      const emptyState = { placedTraps: [] };
      const roll = { natural: 10, modified: 10 };
      const result = checkTrapTrigger('verdant-maw', emptyState, roll);
      expect(result.triggered).toBe(false);
    });

    it('returns triggered=true with trap details', () => {
      const trap = { id: 't1', active: true, damage: 30, escapeChance: 18, effect: 'Stops', zoneId: 'verdant-maw' };
      const state = { placedTraps: [trap] };
      const roll = { natural: 5, modified: 5 };
      const result = checkTrapTrigger('verdant-maw', state, roll);
      expect(result.triggered).toBe(true);
      expect(result.damage).toBe(30);
    });
  });
});
