/**
 * SpatialSystem — Zone-based positioning, mob encounters, boss movement, and search/heal
 *
 * Pure functions — no React, no side effects. All randomness via DiceSystem.
 */

import { rollBetween, rollInRange } from './DiceSystem.js';

// ── Zone Mob State ────────────────────────────────────────────────────────────

/**
 * Derive a default mob HP from blueprint wildlife attack damage.
 * Zones without wildlife return 0.
 */
export function getMobDefaultHp(wildlife) {
  const dmg = typeof wildlife?.attackDamage === 'number' ? wildlife.attackDamage : 15;
  return Math.max(20, dmg * 2);
}

/**
 * Initialize per-zone mob state from blueprint.
 * Each zone with a wildlife entry gets a live mob at game start.
 *
 * @param {object} blueprint
 * @returns {{ [zoneId]: { hp, maxHp, wildlifeAlive, cleared, creature } }}
 */
export function createZoneState(blueprint) {
  const state = {};
  for (const zone of blueprint.zones) {
    if (zone.wildlife?.creature) {
      const hp = getMobDefaultHp(zone.wildlife);
      state[zone.id] = {
        hp,
        maxHp: hp,
        wildlifeAlive: true,
        cleared: false,
        creature: zone.wildlife.creature,
      };
    }
  }
  return state;
}

// ── Boss Movement ─────────────────────────────────────────────────────────────

/**
 * Select the zone the boss will move to this turn.
 * Boss can jump to ANY zone — not restricted to adjacency.
 * Prefers zones with alive wildlife (hunting priority).
 *
 * @param {string} currentZoneId
 * @param {string[]} allZoneIds
 * @param {object} zoneState
 * @returns {string} target zone ID
 */
export function selectBossMoveZone(currentZoneId, allZoneIds, zoneState) {
  const zonesWithMobs = allZoneIds.filter(
    id => id !== currentZoneId && zoneState[id]?.wildlifeAlive
  );
  if (zonesWithMobs.length > 0) {
    return zonesWithMobs[rollBetween(0, zonesWithMobs.length - 1)];
  }
  const otherZones = allZoneIds.filter(id => id !== currentZoneId);
  if (otherZones.length === 0) return currentZoneId;
  return otherZones[rollBetween(0, otherZones.length - 1)];
}

/**
 * Resolve boss hunting wildlife in the zone it just moved to.
 * Returns buffs gained and the updated zone state entry.
 *
 * @param {object|null} zoneStateEntry - { hp, wildlifeAlive, creature }
 * @param {object|null} wildlife - Blueprint zone.wildlife
 * @param {object} roll - rollD20() result
 * @param {object} huntRanges - blueprint.systems.wildlife.bossHuntRolls
 * @returns {{ hunted: boolean, buffs: object[], narrative: string, updatedEntry: object }}
 */
export function resolveBossHuntInZone(zoneStateEntry, wildlife, roll, huntRanges) {
  if (!zoneStateEntry?.wildlifeAlive || !wildlife) {
    return { hunted: false, buffs: [], narrative: '', updatedEntry: zoneStateEntry };
  }

  const rollVal = roll.modified !== undefined ? roll.modified : roll.natural;
  const outcome = rollInRange(rollVal, huntRanges);

  if (outcome === 'fail') {
    return {
      hunted: false,
      buffs: [],
      narrative: `The ${wildlife.creature} escapes into the undergrowth.`,
      updatedEntry: zoneStateEntry,
    };
  }

  const buffs = [];
  const fx = wildlife.bossEffect || {};
  if (fx.hp)               buffs.push({ type: 'hp',               value: fx.hp });
  if (fx.damage)           buffs.push({ type: 'damage',           value: fx.damage });
  if (fx.defense)          buffs.push({ type: 'defense',          value: fx.defense });
  if (fx.nextAttackDamage) buffs.push({ type: 'nextAttackDamage', value: fx.nextAttackDamage });
  if (fx.finalEvolution)   buffs.push({ type: 'finalEvolution',   value: true });

  const extra = outcome === 'eatBonus' ? ' and grows even stronger' : '';
  return {
    hunted: true,
    buffs,
    narrative: `The beast devours the ${wildlife.creature}${extra}!`,
    updatedEntry: { ...zoneStateEntry, wildlifeAlive: false, cleared: true, hp: 0 },
  };
}

/**
 * Apply boss hunt buffs directly to boss state.
 *
 * @param {object} boss
 * @param {object[]} buffs
 * @returns {object} updated boss
 */
export function applyBossHuntBuffs(boss, buffs) {
  let b = { ...boss };
  for (const buff of buffs) {
    switch (buff.type) {
      case 'hp':
        b = {
          ...b,
          hp: Math.min(b.maxHp + Math.floor(buff.value * 0.5), b.hp + buff.value),
          maxHp: b.maxHp + Math.floor(buff.value * 0.5),
        };
        break;
      case 'damage':
        b = { ...b, damage: [b.damage[0] + buff.value, b.damage[1] + buff.value] };
        break;
      case 'defense':
        b = { ...b, defense: b.defense + buff.value };
        break;
      default:
        break;
    }
  }
  return b;
}

// ── Player Actions ────────────────────────────────────────────────────────────

/**
 * Resolve a Search action — determines if the boss location is revealed.
 *
 * @param {object} roll - rollD20() result
 * @returns {{ revealsBoss: boolean, bonus: boolean, narrative: string }}
 */
export function resolveSearch(roll) {
  const val = roll.modified !== undefined ? roll.modified : roll.natural;
  if (val >= 18) {
    return {
      revealsBoss: true,
      bonus: true,
      narrative: "You track the beast's movements with precision — its exact position is revealed!",
    };
  }
  if (val >= 11) {
    return {
      revealsBoss: true,
      bonus: false,
      narrative: "You find fresh tracks. The monster's location is revealed!",
    };
  }
  if (val >= 6) {
    return {
      revealsBoss: false,
      bonus: false,
      narrative: 'You search carefully but find only broken branches and old prints.',
    };
  }
  return {
    revealsBoss: false,
    bonus: false,
    narrative: 'Nothing. The jungle swallows all signs of passage.',
  };
}

/**
 * Resolve a Heal action. Uses blueprint hitRanges to classify roll outcome.
 *
 * @param {object} roll - rollD20() result
 * @param {object} hitRanges - blueprint.settings.hitRanges
 * @returns {{ healAmount: number, isCrit: boolean, isMiss: boolean, narrative: string }}
 */
export function resolveHeal(roll, hitRanges) {
  const val = roll.modified !== undefined ? roll.modified : roll.natural;
  const outcome = rollInRange(val, hitRanges);

  if (outcome === 'miss') {
    return { healAmount: 5, isCrit: false, isMiss: true, narrative: 'A rough patch-up restores 5 HP.' };
  }
  if (outcome === 'critical') {
    const amount = rollBetween(30, 50);
    return { healAmount: amount, isCrit: true, isMiss: false, narrative: `Critical care! Restores ${amount} HP!` };
  }
  const amount = rollBetween(15, 25);
  return { healAmount: amount, isCrit: false, isMiss: false, narrative: `Wounds patched up. Restores ${amount} HP.` };
}

// ── Zone Encounters ───────────────────────────────────────────────────────────

/**
 * Resolve a mob attacking a player (called during environment phase).
 *
 * @param {object} player - { name, defense }
 * @param {object} wildlife - Blueprint zone.wildlife
 * @param {object} roll - rollD20() result
 * @returns {{ attacks: boolean, damage: number, narrative: string }}
 */
export function resolveMobAttackOnPlayer(player, wildlife, roll) {
  if (!wildlife?.attackChance || !player) {
    return { attacks: false, damage: 0, narrative: '' };
  }
  const val = roll.modified !== undefined ? roll.modified : roll.natural;
  const [min, max] = wildlife.attackChance;
  const attacks = val >= min && val <= max;
  const rawDamage = typeof wildlife.attackDamage === 'number' ? wildlife.attackDamage : 0;
  const damage = attacks ? Math.max(0, rawDamage - (player.defense || 0)) : 0;
  return {
    attacks,
    damage,
    narrative: attacks
      ? `A ${wildlife.creature} lunges at ${player.name} for ${damage} damage!`
      : `The ${wildlife.creature} circles ${player.name} but doesn't strike.`,
  };
}

/**
 * Resolve a player attacking a zone mob.
 *
 * @param {object} player - { name, damage }
 * @param {object} mobEntry - { hp, creature }
 * @param {object} roll
 * @param {object} hitRanges - blueprint.settings.hitRanges
 * @param {number} critMultiplier
 * @returns {{ hit: boolean, damage: number, mobDefeated: boolean, narrative: string }}
 */
export function resolvePlayerVsMob(player, mobEntry, roll, hitRanges, critMultiplier = 2.0) {
  const val = roll.modified !== undefined ? roll.modified : roll.natural;
  const outcome = rollInRange(val, hitRanges);

  if (outcome === 'miss') {
    return {
      hit: false, damage: 0, mobDefeated: false,
      narrative: `${player.name} swings at the ${mobEntry.creature} but misses!`,
    };
  }

  const [min, max] = player.damage;
  let damage = rollBetween(min, max);
  const isCrit = outcome === 'critical';
  if (isCrit) damage = Math.floor(damage * critMultiplier);

  const newHp = Math.max(0, mobEntry.hp - damage);
  const mobDefeated = newHp <= 0;

  return {
    hit: true,
    damage,
    mobDefeated,
    narrative: mobDefeated
      ? `${player.name}${isCrit ? ' critically' : ''} strikes the ${mobEntry.creature} for ${damage} damage — it falls!`
      : `${player.name} hits the ${mobEntry.creature} for ${damage} damage!`,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Get zone IDs adjacent to the given zone.
 */
export function getAdjacentZones(zoneId, blueprint) {
  return blueprint.zones.find(z => z.id === zoneId)?.connectedZones ?? [];
}

/**
 * Whether the boss is visible to a specific player.
 * True when: same zone, OR boss.searchRevealed is set.
 */
export function isBossVisible(playerZoneId, boss) {
  return playerZoneId === boss?.zone || boss?.searchRevealed === true;
}

/**
 * Get all living players currently in a zone.
 */
export function getPlayersInZone(zoneId, playersMap) {
  return Object.values(playersMap).filter(p => p.alive && p.zone === zoneId);
}
