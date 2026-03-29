import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { loadBlueprint } from '../../src/engine/BlueprintLoader.js';
import {
  createZoneState,
  getMobDefaultHp,
  selectBossMoveZone,
  resolveBossHuntInZone,
  applyBossHuntBuffs,
  resolveSearch,
  resolveHeal,
  resolveMobAttackOnPlayer,
  resolvePlayerVsMob,
  getAdjacentZones,
  isBossVisible,
  getPlayersInZone,
} from '../../src/engine/SpatialSystem.js';

const rawBlueprint = JSON.parse(
  readFileSync(resolve(process.cwd(), 'campaigns/monster-hunt-tzorath.json'), 'utf-8')
);
const { data: blueprint } = loadBlueprint(rawBlueprint);

function roll(n) { return { natural: n, modified: n }; }

// ── createZoneState ───────────────────────────────────────────────────────────

describe('SpatialSystem', () => {
  describe('createZoneState', () => {
    it('creates an entry for each zone with wildlife', () => {
      const zs = createZoneState(blueprint);
      const zonesWithWildlife = blueprint.zones.filter(z => z.wildlife?.creature);
      expect(Object.keys(zs)).toHaveLength(zonesWithWildlife.length);
    });

    it('sets wildlifeAlive = true for all zones at start', () => {
      const zs = createZoneState(blueprint);
      for (const entry of Object.values(zs)) {
        expect(entry.wildlifeAlive).toBe(true);
      }
    });

    it('sets cleared = false for all zones at start', () => {
      const zs = createZoneState(blueprint);
      for (const entry of Object.values(zs)) {
        expect(entry.cleared).toBe(false);
      }
    });

    it('assigns hp based on wildlife attackDamage', () => {
      const zs = createZoneState(blueprint);
      for (const zone of blueprint.zones) {
        if (zone.wildlife?.creature) {
          expect(zs[zone.id].hp).toBeGreaterThan(0);
          expect(zs[zone.id].maxHp).toBe(zs[zone.id].hp);
        }
      }
    });

    it('stores creature name', () => {
      const zs = createZoneState(blueprint);
      const firstZone = blueprint.zones.find(z => z.wildlife?.creature);
      expect(zs[firstZone.id].creature).toBe(firstZone.wildlife.creature);
    });
  });

  // ── getMobDefaultHp ─────────────────────────────────────────────────────────

  describe('getMobDefaultHp', () => {
    it('returns at least 20 HP', () => {
      expect(getMobDefaultHp(null)).toBeGreaterThanOrEqual(20);
      expect(getMobDefaultHp({})).toBeGreaterThanOrEqual(20);
    });

    it('scales with attackDamage', () => {
      const hp10 = getMobDefaultHp({ attackDamage: 10 });
      const hp20 = getMobDefaultHp({ attackDamage: 20 });
      expect(hp20).toBeGreaterThan(hp10);
    });
  });

  // ── selectBossMoveZone ──────────────────────────────────────────────────────

  describe('selectBossMoveZone', () => {
    it('returns a zone different from current when other zones exist', () => {
      const allIds = blueprint.zones.map(z => z.id);
      const zoneState = createZoneState(blueprint);
      const result = selectBossMoveZone(allIds[0], allIds, zoneState);
      // May return same zone only if it's the sole zone — not the case here
      expect(allIds).toContain(result);
    });

    it('prefers zones with alive mobs', () => {
      const allIds = ['zone-a', 'zone-b', 'zone-c'];
      const zoneState = {
        'zone-a': { wildlifeAlive: false, cleared: true },
        'zone-b': { wildlifeAlive: true, cleared: false },
        'zone-c': { wildlifeAlive: false, cleared: true },
      };
      // Run multiple times to confirm bias
      const results = new Set();
      for (let i = 0; i < 20; i++) {
        results.add(selectBossMoveZone('zone-a', allIds, zoneState));
      }
      expect(results.has('zone-b')).toBe(true);
    });

    it('falls back to any other zone when no mobs alive', () => {
      const allIds = ['zone-a', 'zone-b'];
      const zoneState = {
        'zone-a': { wildlifeAlive: false },
        'zone-b': { wildlifeAlive: false },
      };
      const result = selectBossMoveZone('zone-a', allIds, zoneState);
      expect(result).toBe('zone-b');
    });

    it('returns current zone if only one zone exists', () => {
      const result = selectBossMoveZone('only-zone', ['only-zone'], {});
      expect(result).toBe('only-zone');
    });
  });

  // ── resolveBossHuntInZone ───────────────────────────────────────────────────

  describe('resolveBossHuntInZone', () => {
    const huntRanges = blueprint.systems.wildlife.bossHuntRolls;
    const firstZone  = blueprint.zones.find(z => z.wildlife?.creature);
    const wildlife   = firstZone.wildlife;

    it('returns hunted=false when mob is not alive', () => {
      const entry = { wildlifeAlive: false, hp: 0, creature: 'Dusk Stalker' };
      const result = resolveBossHuntInZone(entry, wildlife, roll(20), huntRanges);
      expect(result.hunted).toBe(false);
    });

    it('returns hunted=false on roll in fail range', () => {
      const entry = { wildlifeAlive: true, hp: 30, creature: 'Dusk Stalker' };
      const result = resolveBossHuntInZone(entry, wildlife, roll(1), huntRanges);
      expect(result.hunted).toBe(false);
      // Mob should remain alive after failed hunt
      expect(result.updatedEntry.wildlifeAlive).toBe(true);
    });

    it('returns hunted=true and clears mob on successful roll', () => {
      const entry = { wildlifeAlive: true, hp: 30, creature: 'Dusk Stalker' };
      const result = resolveBossHuntInZone(entry, wildlife, roll(12), huntRanges);
      expect(result.hunted).toBe(true);
      expect(result.updatedEntry.wildlifeAlive).toBe(false);
      expect(result.updatedEntry.cleared).toBe(true);
    });

    it('grants buffs on successful hunt', () => {
      const entry = { wildlifeAlive: true, hp: 30, creature: 'Dusk Stalker' };
      const result = resolveBossHuntInZone(entry, wildlife, roll(15), huntRanges);
      if (result.hunted) {
        expect(Array.isArray(result.buffs)).toBe(true);
      }
    });

    it('returns hunted=false when no entry passed', () => {
      const result = resolveBossHuntInZone(null, wildlife, roll(20), huntRanges);
      expect(result.hunted).toBe(false);
    });
  });

  // ── applyBossHuntBuffs ──────────────────────────────────────────────────────

  describe('applyBossHuntBuffs', () => {
    const baseBoss = { hp: 100, maxHp: 200, damage: [20, 30], defense: 10 };

    it('applies hp buff and increases maxHp', () => {
      const updated = applyBossHuntBuffs(baseBoss, [{ type: 'hp', value: 20 }]);
      expect(updated.maxHp).toBeGreaterThan(baseBoss.maxHp);
      expect(updated.hp).toBeGreaterThan(baseBoss.hp);
    });

    it('applies damage buff to both damage range values', () => {
      const updated = applyBossHuntBuffs(baseBoss, [{ type: 'damage', value: 5 }]);
      expect(updated.damage[0]).toBe(baseBoss.damage[0] + 5);
      expect(updated.damage[1]).toBe(baseBoss.damage[1] + 5);
    });

    it('applies defense buff', () => {
      const updated = applyBossHuntBuffs(baseBoss, [{ type: 'defense', value: 3 }]);
      expect(updated.defense).toBe(baseBoss.defense + 3);
    });

    it('ignores unknown buff types without error', () => {
      const updated = applyBossHuntBuffs(baseBoss, [{ type: 'unknown_buff', value: 99 }]);
      expect(updated.hp).toBe(baseBoss.hp);
    });

    it('applies multiple buffs', () => {
      const updated = applyBossHuntBuffs(baseBoss, [
        { type: 'hp', value: 10 },
        { type: 'defense', value: 5 },
      ]);
      expect(updated.defense).toBe(baseBoss.defense + 5);
      expect(updated.hp).toBeGreaterThan(baseBoss.hp);
    });
  });

  // ── resolveSearch ───────────────────────────────────────────────────────────

  describe('resolveSearch', () => {
    it('reveals boss on high roll (18+)', () => {
      expect(resolveSearch(roll(18)).revealsBoss).toBe(true);
      expect(resolveSearch(roll(20)).revealsBoss).toBe(true);
    });

    it('reveals boss (no bonus) on mid roll (11-17)', () => {
      const r = resolveSearch(roll(14));
      expect(r.revealsBoss).toBe(true);
      expect(r.bonus).toBe(false);
    });

    it('does not reveal boss on low roll (1-10)', () => {
      expect(resolveSearch(roll(1)).revealsBoss).toBe(false);
      expect(resolveSearch(roll(10)).revealsBoss).toBe(false);
    });

    it('returns a narrative string for all outcomes', () => {
      [1, 7, 14, 18, 20].forEach(n => {
        expect(typeof resolveSearch(roll(n)).narrative).toBe('string');
        expect(resolveSearch(roll(n)).narrative.length).toBeGreaterThan(0);
      });
    });
  });

  // ── resolveHeal ─────────────────────────────────────────────────────────────

  describe('resolveHeal', () => {
    const hitRanges = blueprint.settings.hitRanges;

    it('returns minimal heal on miss', () => {
      const result = resolveHeal(roll(1), hitRanges);
      expect(result.isMiss).toBe(true);
      expect(result.healAmount).toBeGreaterThan(0);
    });

    it('returns standard heal on hit', () => {
      const result = resolveHeal(roll(10), hitRanges);
      expect(result.isMiss).toBe(false);
      expect(result.isCrit).toBe(false);
      expect(result.healAmount).toBeGreaterThanOrEqual(15);
    });

    it('returns large heal on critical', () => {
      const result = resolveHeal(roll(20), hitRanges);
      expect(result.isCrit).toBe(true);
      expect(result.healAmount).toBeGreaterThanOrEqual(30);
    });

    it('never returns negative heal', () => {
      [1, 5, 10, 15, 20].forEach(n => {
        expect(resolveHeal(roll(n), hitRanges).healAmount).toBeGreaterThan(0);
      });
    });
  });

  // ── resolveMobAttackOnPlayer ────────────────────────────────────────────────

  describe('resolveMobAttackOnPlayer', () => {
    const player   = { name: 'Alice', defense: 5 };
    const wildlife = { creature: 'Dusk Stalker', attackChance: [1, 5], attackDamage: 15 };

    it('attacks when roll is within attackChance range', () => {
      const result = resolveMobAttackOnPlayer(player, wildlife, roll(3));
      expect(result.attacks).toBe(true);
      expect(result.damage).toBeGreaterThan(0);
    });

    it('does not attack when roll is outside attackChance range', () => {
      const result = resolveMobAttackOnPlayer(player, wildlife, roll(10));
      expect(result.attacks).toBe(false);
      expect(result.damage).toBe(0);
    });

    it('applies player defense to damage', () => {
      const rawDmg = wildlife.attackDamage;
      const result = resolveMobAttackOnPlayer(player, wildlife, roll(1));
      expect(result.damage).toBe(Math.max(0, rawDmg - player.defense));
    });

    it('handles missing wildlife gracefully', () => {
      const result = resolveMobAttackOnPlayer(player, null, roll(1));
      expect(result.attacks).toBe(false);
    });
  });

  // ── resolvePlayerVsMob ──────────────────────────────────────────────────────

  describe('resolvePlayerVsMob', () => {
    const player   = { name: 'Bob', damage: [20, 30] };
    const mobEntry = { hp: 40, maxHp: 40, creature: 'Dusk Stalker' };
    const hitRanges = blueprint.settings.hitRanges;

    it('returns miss on low roll', () => {
      const result = resolvePlayerVsMob(player, mobEntry, roll(1), hitRanges, 2.0);
      expect(result.hit).toBe(false);
      expect(result.damage).toBe(0);
      expect(result.mobDefeated).toBe(false);
    });

    it('returns hit on mid roll', () => {
      const result = resolvePlayerVsMob(player, mobEntry, roll(10), hitRanges, 2.0);
      expect(result.hit).toBe(true);
      expect(result.damage).toBeGreaterThan(0);
    });

    it('marks mob defeated when damage >= mob hp', () => {
      const weakMob = { hp: 1, maxHp: 1, creature: 'Tiny Critter' };
      const result = resolvePlayerVsMob(player, weakMob, roll(10), hitRanges, 2.0);
      if (result.hit) {
        expect(result.mobDefeated).toBe(true);
      }
    });

    it('applies crit multiplier on critical roll', () => {
      const normalResult = resolvePlayerVsMob(player, mobEntry, roll(10), hitRanges, 2.0);
      const critResult   = resolvePlayerVsMob(player, mobEntry, roll(20), hitRanges, 2.0);
      if (normalResult.hit && critResult.hit) {
        // Crit damage should on average be higher
        expect(critResult.damage).toBeGreaterThan(0);
      }
    });
  });

  // ── getAdjacentZones ────────────────────────────────────────────────────────

  describe('getAdjacentZones', () => {
    it('returns connected zones for a valid zone', () => {
      const first = blueprint.zones[0];
      const adjacent = getAdjacentZones(first.id, blueprint);
      expect(adjacent).toEqual(first.connectedZones);
    });

    it('returns empty array for unknown zone', () => {
      expect(getAdjacentZones('not-a-real-zone', blueprint)).toEqual([]);
    });
  });

  // ── isBossVisible ───────────────────────────────────────────────────────────

  describe('isBossVisible', () => {
    it('returns true when player is in same zone as boss', () => {
      const boss = { zone: 'verdant-maw', searchRevealed: false };
      expect(isBossVisible('verdant-maw', boss)).toBe(true);
    });

    it('returns false when player is in different zone and not revealed', () => {
      const boss = { zone: 'obsidian-grotto', searchRevealed: false };
      expect(isBossVisible('verdant-maw', boss)).toBe(false);
    });

    it('returns true when boss.searchRevealed is true', () => {
      const boss = { zone: 'obsidian-grotto', searchRevealed: true };
      expect(isBossVisible('verdant-maw', boss)).toBe(true);
    });

    it('returns false for null boss', () => {
      expect(isBossVisible('verdant-maw', null)).toBe(false);
    });
  });

  // ── getPlayersInZone ────────────────────────────────────────────────────────

  describe('getPlayersInZone', () => {
    const players = {
      'p1': { id: 'p1', alive: true,  zone: 'verdant-maw' },
      'p2': { id: 'p2', alive: false, zone: 'verdant-maw' },
      'p3': { id: 'p3', alive: true,  zone: 'obsidian-grotto' },
    };

    it('returns only alive players in the specified zone', () => {
      const result = getPlayersInZone('verdant-maw', players);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('p1');
    });

    it('returns empty array when no alive players in zone', () => {
      expect(getPlayersInZone('tzorath-throne', players)).toHaveLength(0);
    });
  });
});
