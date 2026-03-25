/**
 * WildlifeSystem — Per-zone wildlife behavior, boss hunting, and player intervention
 */

import { rollInRange } from './DiceSystem.js';

/**
 * Get wildlife data for a specific zone.
 *
 * @param {object} blueprint
 * @param {string} zoneId
 * @returns {object|null}
 */
export function getZoneWildlife(blueprint, zoneId) {
  const zone = blueprint.zones.find((z) => z.id === zoneId);
  return zone?.wildlife ?? null;
}

/**
 * Resolve a boss hunt attempt against zone wildlife.
 *
 * @param {object} wildlife - Zone wildlife data { creature, bossEffect, ... }
 * @param {object} roll - rollD20() result { natural, modified }
 * @param {object} huntRanges - blueprint.systems.wildlife.bossHuntRolls
 * @returns {{ outcome: 'fail'|'eat'|'eatBonus', buffsGained: object[], narrative: string }}
 */
export function resolveBossHunt(wildlife, roll, huntRanges) {
  const rollVal = roll.modified !== undefined ? roll.modified : roll.natural;
  const outcome = rollInRange(rollVal, huntRanges);

  if (outcome === 'fail') {
    return {
      outcome: 'fail',
      buffsGained: [],
      narrative: `The boss fails to catch the ${wildlife.creature}.`,
    };
  }

  const buffsGained = [];
  const bossEffect = wildlife.bossEffect || {};

  if (outcome === 'eat' || outcome === 'eatBonus') {
    // Apply HP buff
    if (bossEffect.hp) buffsGained.push({ type: 'hpRestore', value: bossEffect.hp });
    if (bossEffect.speed) buffsGained.push({ type: 'speedBoost', value: bossEffect.speed, duration: 2 });
    if (bossEffect.defense) buffsGained.push({ type: 'defenseBoost', value: bossEffect.defense, duration: 2 });
    if (bossEffect.damage) buffsGained.push({ type: 'damageBoost', value: bossEffect.damage, duration: 2 });
    if (bossEffect.poison) buffsGained.push({ type: 'poison', ...bossEffect.poison });
    if (bossEffect.bleed) buffsGained.push({ type: 'bleed', ...bossEffect.bleed });
    if (bossEffect.slow) buffsGained.push({ type: 'slow', ...bossEffect.slow });
    if (bossEffect.seeTraps) buffsGained.push({ type: 'seeTraps', value: true });
    if (bossEffect.nextAttackDamage) buffsGained.push({ type: 'nextAttackDamageBoost', value: bossEffect.nextAttackDamage, duration: 1 });
    if (bossEffect.finalEvolution) buffsGained.push({ type: 'finalEvolution', value: true });
  }

  const extra = outcome === 'eatBonus' ? ' and gains bonus strength!' : '.';
  return {
    outcome,
    buffsGained,
    narrative: `The boss devours the ${wildlife.creature}${extra}`,
  };
}

/**
 * Resolve whether zone wildlife attacks a player (during environment phase).
 *
 * @param {object} wildlife - Zone wildlife data { attackChance: [min, max], attackDamage }
 * @param {object} roll - rollD20() result
 * @returns {{ attacks: boolean, damage: number, narrative: string }}
 */
export function resolveWildlifeAttack(wildlife, roll) {
  if (!wildlife || !wildlife.attackChance) {
    return { attacks: false, damage: 0, narrative: 'No wildlife threat.' };
  }

  const rollVal = roll.modified !== undefined ? roll.modified : roll.natural;
  const [min, max] = wildlife.attackChance;
  const attacks = rollVal >= min && rollVal <= max;

  const rawDamage = wildlife.attackDamage;
  const damage = typeof rawDamage === 'number' ? rawDamage : 0;

  return {
    attacks,
    damage: attacks ? damage : 0,
    narrative: attacks
      ? `A ${wildlife.creature} attacks for ${damage} damage!`
      : `The ${wildlife.creature} watches warily but doesn't attack.`,
  };
}

/**
 * Check if players can intervene in a boss hunt (from blueprint setting).
 *
 * @param {object} blueprint
 * @returns {boolean}
 */
export function canPlayerIntervene(blueprint) {
  return blueprint?.systems?.wildlife?.playerIntervention === true;
}

// ─── Legacy functional API (kept for backwards compatibility) ─────────────────

/**
 * Process boss wildlife hunting behavior for a given zone.
 * @param {string} zoneId
 * @param {object} gameState
 * @param {object} blueprint
 * @param {object} roll - D20 roll result
 * @returns {{ hunted: boolean, bossBuffed: boolean, buffAmount: number, narrative: string }}
 */
export function processBossHunt(zoneId, gameState, blueprint, roll) {
  const wildlife = getZoneWildlife(blueprint, zoneId);
  if (!wildlife) return { hunted: false, bossBuffed: false, buffAmount: 0, narrative: 'No wildlife in this zone.' };

  const huntRanges = blueprint.systems.wildlife.bossHuntRolls;
  const result = resolveBossHunt(wildlife, roll, huntRanges);

  const bossBuffed = result.buffsGained.length > 0;
  const hpBuff = result.buffsGained.find((b) => b.type === 'hpRestore');

  return {
    hunted: result.outcome !== 'fail',
    bossBuffed,
    buffAmount: hpBuff?.value ?? 0,
    narrative: result.narrative,
  };
}

/**
 * Resolve a player intervening to protect wildlife.
 * @param {object} player
 * @param {string} zoneId
 * @param {object} blueprint
 * @param {object} roll
 * @returns {{ success: boolean, playerDamage: number, narrative: string }}
 */
export function playerIntervention(player, zoneId, blueprint, roll) {
  const wildlife = getZoneWildlife(blueprint, zoneId);
  if (!wildlife) return { success: false, playerDamage: 0, narrative: 'Nothing to intervene for.' };

  const result = resolveWildlifeAttack(wildlife, roll);
  return {
    success: !result.attacks,
    playerDamage: result.attacks ? result.damage : 0,
    narrative: result.attacks
      ? `You try to intervene but the ${wildlife.creature} retaliates for ${result.damage} damage!`
      : `You successfully drive off the ${wildlife.creature}!`,
  };
}
