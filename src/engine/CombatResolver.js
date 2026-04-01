/**
 * CombatResolver — Pure combat resolution function
 * No side effects. Same inputs always produce same outputs for deterministic tests.
 */

import { rollInRange, rollBetween } from './DiceSystem.js';

/**
 * Roll a damage value within [min, max] using a seed integer.
 * @param {number[]} damageRange - [min, max]
 * @param {object} modifiers - { multiplier?: number, flatBonus?: number }
 * @returns {number}
 */
export function calculateDamage(damageRange, modifiers = {}) {
  const [min, max] = damageRange;
  let base = rollBetween(min, max);
  if (modifiers.multiplier) base = Math.floor(base * modifiers.multiplier);
  if (modifiers.flatBonus) base += modifiers.flatBonus;
  return Math.max(0, base);
}

/**
 * Apply defense reduction to a raw damage value, floored at 0.
 * @param {number} rawDamage
 * @param {number} defense
 * @param {number} [shieldReduction=0] - Additional flat reduction from shields
 * @returns {number}
 */
export function applyDefense(rawDamage, defense, shieldReduction = 0) {
  return Math.max(0, rawDamage - defense - shieldReduction);
}

/**
 * Resolve a combat action between attacker and defender.
 *
 * @param {object} attacker - { damage: [min,max], modifiers?: { multiplier?, flatBonus? } }
 * @param {object} defender - { defense: number, shieldReduction?: number, statusEffects?: object[] }
 * @param {object} roll - Result from rollD20(): { natural, modified, modifier }
 * @param {object} settings - { hitRanges, critMultiplier, lethalStrikeBonus? }
 * @returns {{
 *   hit: boolean,
 *   critical: boolean,
 *   damageRoll: number,
 *   damageDealt: number,
 *   effectsApplied: string[],
 *   narrative: string
 * }}
 */
export function resolveCombat(attacker, defender, roll, settings) {
  const { hitRanges, critMultiplier = 2.0, lethalStrikeBonus = 0 } = settings;

  // Normalize: accept a plain number or a { natural, modified, modifier } object.
  const normalizedRoll = typeof roll === 'number'
    ? { natural: roll, modified: roll, modifier: 0 }
    : roll;

  // Use the modified roll for hit range lookup, falling back to natural.
  const rollValue = normalizedRoll.modified !== undefined ? normalizedRoll.modified : normalizedRoll.natural;
  const rangeKey = rollInRange(rollValue, hitRanges);

  const isMiss = rangeKey === 'miss' || rangeKey === null;
  const isCritical = rangeKey === 'critical' || rangeKey === 'lethalStrike';
  const isHit = !isMiss;

  if (isMiss) {
    return {
      hit: false,
      critical: false,
      damageRoll: 0,
      damageDealt: 0,
      effectsApplied: [],
      narrative: 'The attack misses.',
    };
  }

  // Build damage modifiers
  const modifiers = { ...(attacker.modifiers || {}) };
  if (isCritical) {
    // For lethalStrike apply bonus on top of regular multiplier; for critical use critMultiplier
    const multiplierBase = modifiers.multiplier || 1;
    if (rangeKey === 'lethalStrike') {
      modifiers.multiplier = multiplierBase * (1 + lethalStrikeBonus);
    } else {
      modifiers.multiplier = multiplierBase * critMultiplier;
    }
  }

  const damageRoll = calculateDamage(attacker.damage, modifiers);
  const defense = defender.defense || 0;
  const shieldReduction = defender.shieldReduction || 0;
  const damageDealt = applyDefense(damageRoll, defense, shieldReduction);

  // Collect applied effects from defender status
  const effectsApplied = [];
  if (defender.statusEffects && Array.isArray(defender.statusEffects)) {
    for (const effect of defender.statusEffects) {
      if (effect.type === 'damageReduction') {
        effectsApplied.push('damageReduction');
      }
    }
  }

  let narrative;
  if (isCritical) {
    narrative = `Critical strike! ${damageDealt} damage dealt.`;
  } else {
    narrative = `Hit! ${damageDealt} damage dealt.`;
  }

  return {
    hit: true,
    critical: isCritical,
    damageRoll,
    damageDealt,
    effectsApplied,
    narrative,
  };
}
