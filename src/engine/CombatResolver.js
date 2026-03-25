/**
 * CombatResolver — Pure combat resolution function
 * No side effects. Same inputs always produce same outputs.
 */

import { rollInRange } from './DiceSystem.js';

/**
 * Resolve a combat action between attacker and defender.
 * @param {object} attacker - Entity with damage array [min,max], modifiers
 * @param {object} defender - Entity with defense, modifiers
 * @param {number} roll - D20 roll result (1-20)
 * @param {object} settings - Campaign settings (hitRanges, critMultiplier)
 * @returns {{ hit: boolean, critical: boolean, damage: number, effectsApplied: Array, narrative: string }}
 */
export function resolveCombat(attacker, defender, roll, settings) {
  const { hitRanges, critMultiplier = 2.0 } = settings;

  const missRange = hitRanges.miss || hitRanges.miss;
  const critRange = hitRanges.critical || hitRanges.lethalStrike;

  const isMiss = roll >= missRange[0] && roll <= missRange[1];
  const isCrit = roll >= critRange[0] && roll <= critRange[1];

  if (isMiss) {
    return {
      hit: false,
      critical: false,
      damage: 0,
      effectsApplied: [],
      narrative: 'The attack missed!',
    };
  }

  const damageArr = attacker.damage || attacker.damageRange || [1, 1];
  const [min, max] = Array.isArray(damageArr) ? damageArr : [damageArr, damageArr];

  let damage = calculateDamage(min, max, rollInRange(0, 10000));

  if (isCrit) {
    const bonus = hitRanges.lethalStrikeBonus != null ? hitRanges.lethalStrikeBonus : critMultiplier - 1;
    damage = Math.floor(damage * (1 + bonus));
  }

  const defenseValue = defender.defense || 0;
  damage = applyDefense(damage, defenseValue);
  damage = Math.max(1, damage);

  return {
    hit: true,
    critical: isCrit,
    damage,
    effectsApplied: [],
    narrative: isCrit
      ? `Lethal strike! ${damage} damage dealt!`
      : `Hit! ${damage} damage dealt.`,
  };
}

/**
 * Calculate raw damage within a damage range using a seed value.
 * @param {number} min
 * @param {number} max
 * @param {number} seed - A random integer to determine value within range
 * @returns {number}
 */
export function calculateDamage(min, max, seed) {
  if (min === max) return min;
  const range = max - min + 1;
  return min + (Math.abs(seed) % range);
}

/**
 * Apply defense reduction to a damage value.
 * @param {number} damage
 * @param {number} defense
 * @returns {number}
 */
export function applyDefense(damage, defense) {
  return Math.max(0, damage - defense);
}
