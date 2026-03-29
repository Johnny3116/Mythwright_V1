/**
 * SpatialEngine — Zone-based spatial gameplay logic
 *
 * Pure functions for:
 * - Zone traversal and adjacency
 * - Player/boss/mob positioning
 * - Boss visibility (fog of war)
 * - Zone encounter resolution
 * - Boss hunt mechanics
 * - Context-aware action availability
 *
 * No React, no side effects. All functions are deterministic given the same inputs.
 */

import { rollD20, rollInRange, rollBetween } from './DiceSystem.js';

// ─── Zone Navigation ──────────────────────────────────────────────────────────

/**
 * Get the zone IDs adjacent to the given zone.
 * @param {string} zoneId
 * @param {object} blueprint
 * @returns {string[]}
 */
export function getAdjacentZones(zoneId, blueprint) {
  const zone = blueprint.zones.find((z) => z.id === zoneId);
  return zone?.connectedZones ?? [];
}

/**
 * Check if two zone IDs are directly connected.
 * @param {string} zoneA
 * @param {string} zoneB
 * @param {object} blueprint
 * @returns {boolean}
 */
export function areZonesAdjacent(zoneA, zoneB, blueprint) {
  const adjacent = getAdjacentZones(zoneA, blueprint);
  return adjacent.includes(zoneB);
}

/**
 * Get the zone object by ID.
 * @param {string} zoneId
 * @param {object} blueprint
 * @returns {object|null}
 */
export function getZone(zoneId, blueprint) {
  return blueprint.zones.find((z) => z.id === zoneId) ?? null;
}

// ─── Entity Positioning ───────────────────────────────────────────────────────

/**
 * Get all players currently in a specific zone.
 * @param {string} zoneId
 * @param {object} players - { [peerId]: playerState }
 * @returns {object[]}
 */
export function getPlayersInZone(zoneId, players) {
  return Object.values(players).filter((p) => p.zone === zoneId && p.alive);
}

/**
 * Check if the boss is in the same zone as a player.
 * @param {object} player
 * @param {object} bossState
 * @returns {boolean}
 */
export function isBossInPlayerZone(player, bossState) {
  if (!player || !bossState) return false;
  return player.zone === bossState.zone;
}

/**
 * Determine if the boss is visible to the player.
 * Boss is visible if:
 *  - Any alive player is in the same zone as the boss
 *  - The player has successfully searched the boss's zone this round
 *
 * @param {object} players - { [peerId]: playerState }
 * @param {object} bossState
 * @param {string[]} searchedZones - list of zone IDs successfully searched this game
 * @returns {boolean}
 */
export function isBossVisible(players, bossState, searchedZones = []) {
  if (!bossState?.zone) return false;

  // Visible if any living player is in the boss's zone
  const playersHere = getPlayersInZone(bossState.zone, players);
  if (playersHere.length > 0) return true;

  // Visible if boss's zone has been searched
  if (searchedZones.includes(bossState.zone)) return true;

  return false;
}

// ─── Context-Aware Action Availability ───────────────────────────────────────

/**
 * Determine which actions are available for a player this turn.
 * Returns a map of actionId → { available: bool, reason: string|null }
 *
 * @param {object} player - Current player state
 * @param {object} state - Full game state
 * @param {object} blueprint
 * @returns {object} { move, attack, search, heal, setTrap, useItem, flee, endTurn }
 */
export function getAvailableActions(player, state, blueprint) {
  if (!player || !blueprint) {
    return {
      move: { available: false, reason: 'No player' },
      attack: { available: false, reason: 'No player' },
      search: { available: false, reason: 'No player' },
      heal: { available: false, reason: 'No player' },
      setTrap: { available: false, reason: 'No player' },
      flee: { available: false, reason: 'No player' },
      endTurn: { available: false, reason: 'No player' },
    };
  }

  const { boss, players, placedTraps = [], searchedZones = [] } = state;
  const adjacentZones = getAdjacentZones(player.zone, blueprint);
  const hasAdjacentZones = adjacentZones.length > 0;

  // Attack: boss must be in same zone and visible (or mob must be present)
  const bossHere = boss && player.zone === boss.zone;
  const bossCurrentlyVisible = isBossVisible(players, boss, searchedZones);
  const hasAttackableTarget = (bossHere && bossCurrentlyVisible) || hasMobsInZone(player.zone, state);
  const hasAttackableTargetIncludingHidden = bossHere || hasMobsInZone(player.zone, state);

  // Heal: always available (self heal), better if allies are nearby
  const allies = getPlayersInZone(player.zone, players).filter((p) => p.id !== player.id);

  // Set Trap: any zone where traps are allowed (no trap already placed)
  const alreadyHasTrap = placedTraps.some((t) => t.zoneId === player.zone && t.active);
  const currentZone = getZone(player.zone, blueprint);
  const trapsAllowed = !(currentZone?.trapBonus?.toLowerCase().includes('no traps') ?? false);

  return {
    move: {
      available: hasAdjacentZones,
      reason: hasAdjacentZones ? null : 'No adjacent zones',
      adjacentZones,
    },
    attack: {
      available: hasAttackableTargetIncludingHidden,
      reason: hasAttackableTargetIncludingHidden ? null : 'No targets in this zone',
      hasVisibleTarget: hasAttackableTarget,
    },
    search: {
      available: true,
      reason: null,
    },
    heal: {
      available: true,
      reason: null,
      hasAllies: allies.length > 0,
      allies,
    },
    setTrap: {
      available: trapsAllowed && !alreadyHasTrap,
      reason: !trapsAllowed ? 'No traps allowed here' : alreadyHasTrap ? 'Trap already placed in this zone' : null,
    },
    flee: {
      available: hasAdjacentZones,
      reason: hasAdjacentZones ? null : 'No escape routes',
      adjacentZones,
    },
    endTurn: { available: true, reason: null },
  };
}

/**
 * Check if a zone has active (not cleared) mobs.
 * @param {string} zoneId
 * @param {object} state - game state with zoneMobs field
 * @returns {boolean}
 */
export function hasMobsInZone(zoneId, state) {
  const mobData = state.zoneMobs?.[zoneId];
  return mobData?.present === true && mobData?.cleared !== true;
}

// ─── Zone Mob State ───────────────────────────────────────────────────────────

/**
 * Initialize zone mob state from blueprint.
 * Each zone with wildlife starts with mobs present.
 *
 * @param {object} blueprint
 * @returns {object} { [zoneId]: { creature, present, cleared } }
 */
export function initializeZoneMobs(blueprint) {
  const zoneMobs = {};
  for (const zone of blueprint.zones) {
    if (zone.wildlife) {
      zoneMobs[zone.id] = {
        creature: zone.wildlife.creature,
        type: zone.wildlife.type,
        present: true,
        cleared: false,
      };
    }
  }
  return zoneMobs;
}

/**
 * Mark mobs in a zone as cleared (killed by boss or players).
 * @param {string} zoneId
 * @param {object} zoneMobs
 * @returns {object} Updated zoneMobs
 */
export function clearZoneMobs(zoneId, zoneMobs) {
  if (!zoneMobs[zoneId]) return zoneMobs;
  return {
    ...zoneMobs,
    [zoneId]: { ...zoneMobs[zoneId], present: false, cleared: true },
  };
}

// ─── Boss Movement ────────────────────────────────────────────────────────────

/**
 * Select the best zone for the boss to move to.
 * Priority: zones with wildlife (hunting) > zones with players (attack) > random.
 *
 * @param {object} bossState
 * @param {object} state - game state
 * @param {object} blueprint
 * @param {object} roll - D20 roll for target selection
 * @returns {string} Target zone ID
 */
export function selectBossMoveTarget(bossState, state, blueprint, roll) {
  const { players, zoneMobs = {} } = state;
  const allZones = blueprint.zones.map((z) => z.id);
  const currentZone = bossState.zone;

  // On a high roll (15+), boss hunts wildlife zones
  if (roll.natural >= 15) {
    const wildlifeZones = allZones.filter(
      (z) => z !== currentZone && zoneMobs[z]?.present && !zoneMobs[z]?.cleared
    );
    if (wildlifeZones.length > 0) {
      return wildlifeZones[rollBetween(0, wildlifeZones.length - 1)];
    }
  }

  // On a mid roll (8-14), boss moves toward players
  if (roll.natural >= 8) {
    const playerZones = [...new Set(Object.values(players).filter((p) => p.alive).map((p) => p.zone))];
    const differentZones = playerZones.filter((z) => z !== currentZone);
    if (differentZones.length > 0) {
      return differentZones[rollBetween(0, differentZones.length - 1)];
    }
  }

  // Low roll: random zone (including current)
  const otherZones = allZones.filter((z) => z !== currentZone);
  if (otherZones.length === 0) return currentZone;
  return otherZones[rollBetween(0, otherZones.length - 1)];
}

/**
 * Resolve the boss hunting wildlife in its current zone.
 * Returns updated zoneMobs and boss buffs gained.
 *
 * @param {string} zoneId
 * @param {object} zoneMobs
 * @param {object} blueprint
 * @param {object} roll - D20 roll
 * @returns {{ updatedZoneMobs: object, buffs: object[], narrative: string, hunted: boolean }}
 */
export function resolveBossHuntZone(zoneId, zoneMobs, blueprint, roll) {
  const mobData = zoneMobs[zoneId];
  if (!mobData?.present || mobData?.cleared) {
    return {
      updatedZoneMobs: zoneMobs,
      buffs: [],
      narrative: '',
      hunted: false,
    };
  }

  const wildlife = blueprint.zones.find((z) => z.id === zoneId)?.wildlife;
  if (!wildlife) {
    return { updatedZoneMobs: zoneMobs, buffs: [], narrative: '', hunted: false };
  }

  const huntRanges = blueprint.systems?.wildlife?.bossHuntRolls ?? {
    fail: [1, 8],
    eat: [9, 16],
    eatBonus: [17, 20],
  };

  const outcome = rollInRange(roll.natural, huntRanges);

  if (outcome === 'fail') {
    return {
      updatedZoneMobs: zoneMobs,
      buffs: [],
      narrative: `${wildlife.creature} evades the predator this time.`,
      hunted: false,
    };
  }

  // Boss successfully hunts — clear mob and gain buffs
  const updatedZoneMobs = clearZoneMobs(zoneId, zoneMobs);
  const bossEffect = wildlife.bossEffect || {};
  const buffs = [];

  if (bossEffect.hp) buffs.push({ type: 'hpRestore', value: bossEffect.hp });
  if (bossEffect.damage) buffs.push({ type: 'damageBoost', value: bossEffect.damage, duration: 2 });
  if (bossEffect.defense) buffs.push({ type: 'defenseBoost', value: bossEffect.defense, duration: 2 });
  if (bossEffect.nextAttackDamage) buffs.push({ type: 'nextAttackDamageBoost', value: bossEffect.nextAttackDamage, duration: 1 });
  if (bossEffect.poison) buffs.push({ type: 'poison', ...bossEffect.poison });
  if (bossEffect.bleed) buffs.push({ type: 'bleed', ...bossEffect.bleed });
  if (bossEffect.slow) buffs.push({ type: 'slow', ...bossEffect.slow });
  if (bossEffect.seeTraps) buffs.push({ type: 'seeTraps', value: true });
  if (bossEffect.finalEvolution) buffs.push({ type: 'finalEvolution', value: true });

  const bonusText = outcome === 'eatBonus' ? ', feasting greedily and growing even stronger!' : '.';
  const narrative = `The predator descends upon the ${wildlife.creature}, devouring it${bonusText}`;

  return { updatedZoneMobs, buffs, narrative, hunted: true };
}

// ─── Zone Encounter ───────────────────────────────────────────────────────────

/**
 * Resolve a zone encounter when a player enters a zone with active mobs.
 * Mobs may attack the player before they can act.
 *
 * @param {object} player
 * @param {string} zoneId
 * @param {object} zoneMobs
 * @param {object} blueprint
 * @param {object} roll - D20 roll for mob attack
 * @returns {{ attacked: boolean, damage: number, narrative: string }}
 */
export function resolveZoneEncounter(player, zoneId, zoneMobs, blueprint, roll) {
  if (!hasMobsInZone(zoneId, { zoneMobs })) {
    return { attacked: false, damage: 0, narrative: '' };
  }

  const wildlife = blueprint.zones.find((z) => z.id === zoneId)?.wildlife;
  if (!wildlife) return { attacked: false, damage: 0, narrative: '' };

  const [min, max] = wildlife.attackChance;
  const attacks = roll.natural >= min && roll.natural <= max;
  const rawDamage = typeof wildlife.attackDamage === 'number' ? wildlife.attackDamage : 0;
  const damage = attacks ? rawDamage : 0;

  return {
    attacked: attacks,
    damage,
    narrative: attacks
      ? `A ${wildlife.creature} ambushes ${player.name} as they enter, dealing ${damage} damage!`
      : `${player.name} enters the zone. The ${wildlife.creature} watches but doesn't attack.`,
  };
}

// ─── Search Mechanics ─────────────────────────────────────────────────────────

/**
 * Resolve a player searching a zone.
 * Can reveal boss location, find hidden items, or reveal adjacent zone info.
 *
 * @param {object} player
 * @param {string} zoneId
 * @param {object} state - { boss, blueprint, searchedZones, zoneMobs }
 * @param {object} roll - D20 roll
 * @returns {{
 *   foundBoss: boolean,
 *   foundItem: string|null,
 *   newSearchedZones: string[],
 *   narrative: string
 * }}
 */
export function resolveSearch(player, zoneId, state, roll) {
  const { boss, blueprint, searchedZones = [], zoneMobs = {} } = state;
  const wildlife = blueprint?.zones?.find((z) => z.id === zoneId)?.wildlife;
  const creatureName = wildlife?.creature ?? 'something';

  const newSearched = searchedZones.includes(zoneId)
    ? searchedZones
    : [...searchedZones, zoneId];

  // High roll (15+): find boss location if boss is in this or adjacent zone
  let foundBoss = false;
  let bossFoundNarrative = '';
  if (roll.natural >= 15 && boss?.zone) {
    const isHereOrAdjacent =
      boss.zone === zoneId ||
      getAdjacentZones(zoneId, blueprint).includes(boss.zone);
    if (isHereOrAdjacent) {
      foundBoss = true;
      const bossZone = getZone(boss.zone, blueprint);
      bossFoundNarrative = boss.zone === zoneId
        ? ` Tracks confirm the predator is HERE in ${bossZone?.name || boss.zone}!`
        : ` Tracks lead toward ${bossZone?.name || boss.zone} — the predator was nearby!`;
    }
  }

  // Any roll: note wildlife status
  const mobData = zoneMobs[zoneId];
  const wildlifeText = mobData?.cleared
    ? ` The ${creatureName} is gone — something hunted here.`
    : mobData?.present
    ? ` A ${creatureName} lurks nearby.`
    : '';

  let narrative = '';
  if (roll.natural <= 5) {
    narrative = `${player.name} searches but finds nothing of note.${wildlifeText}`;
  } else if (roll.natural <= 14) {
    narrative = `${player.name} searches the area carefully.${wildlifeText}${bossFoundNarrative}`;
  } else {
    narrative = `${player.name} conducts a thorough sweep.${wildlifeText}${bossFoundNarrative}`;
  }

  return {
    foundBoss,
    foundItem: null, // Future: loot system
    newSearchedZones: foundBoss
      ? (boss?.zone && !newSearched.includes(boss.zone) ? [...newSearched, boss.zone] : newSearched)
      : newSearched,
    narrative,
  };
}

// ─── Heal Mechanics ───────────────────────────────────────────────────────────

/**
 * Resolve a player using the Heal action.
 * Heal amount scales with the roll — better roll = better heal.
 *
 * @param {object} healer - Player performing the heal
 * @param {object} target - Player being healed
 * @param {object} roll - D20 roll
 * @param {object} blueprint
 * @returns {{ healAmount: number, narrative: string }}
 */
export function resolveHeal(healer, target, roll, blueprint) {
  // Base heal from healer's damage range (low end)
  const healerClass = blueprint?.classes?.find((c) => c.id === healer.classId);
  const baseDamage = healerClass?.baseStats?.damage ?? [10, 20];
  const baseHeal = rollBetween(baseDamage[0], baseDamage[1]);

  // Roll modifies heal: 1-5 = 50%, 6-15 = 100%, 16-20 = 150%
  let multiplier = 1.0;
  if (roll.natural <= 5) multiplier = 0.5;
  else if (roll.natural >= 16) multiplier = 1.5;

  const healAmount = Math.max(5, Math.round(baseHeal * multiplier));
  const isSelf = healer.id === target.id;

  const targetDesc = isSelf ? 'themselves' : target.name;
  const quality = roll.natural <= 5 ? 'a weak' : roll.natural >= 16 ? 'an excellent' : 'a steady';

  return {
    healAmount,
    narrative: `${healer.name} administers ${quality} field treatment to ${targetDesc}, restoring ${healAmount} HP.`,
  };
}

// ─── Flee Mechanics ──────────────────────────────────────────────────────────

/**
 * Resolve a player fleeing to an adjacent zone.
 * Unlike retreat (4-outcome roll system), flee is always successful but may
 * trigger an opportunity attack from the boss if it's in the same zone.
 *
 * @param {object} player
 * @param {string} targetZoneId - Zone to flee to
 * @param {object} state - { boss, blueprint }
 * @param {object} roll - D20 roll for opportunity attack avoidance
 * @returns {{
 *   success: boolean,
 *   newZoneId: string,
 *   opportunityAttack: boolean,
 *   opportunityDamage: number,
 *   narrative: string
 * }}
 */
export function resolveFlee(player, targetZoneId, state, roll) {
  const { boss, blueprint } = state;

  if (!areZonesAdjacent(player.zone, targetZoneId, blueprint)) {
    return {
      success: false,
      newZoneId: player.zone,
      opportunityAttack: false,
      opportunityDamage: 0,
      narrative: `${player.name} can't flee there — not an adjacent zone.`,
    };
  }

  const bossIsHere = boss?.zone === player.zone;
  let opportunityAttack = false;
  let opportunityDamage = 0;

  // Boss gets opportunity attack if roll is low (1-8 = boss hits)
  if (bossIsHere && roll.natural <= 8) {
    opportunityAttack = true;
    const [min, max] = boss.damage ?? [10, 20];
    opportunityDamage = rollBetween(min, max);
  }

  const targetZone = getZone(targetZoneId, blueprint);
  const opportunityText = opportunityAttack
    ? ` ${boss?.name || 'The boss'} lands a parting blow for ${opportunityDamage} damage!`
    : '';

  return {
    success: true,
    newZoneId: targetZoneId,
    opportunityAttack,
    opportunityDamage,
    narrative: `${player.name} flees to ${targetZone?.name || targetZoneId}!${opportunityText}`,
  };
}
