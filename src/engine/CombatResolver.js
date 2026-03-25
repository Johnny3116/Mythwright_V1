/**
 * CombatResolver — Pure combat resolution.
 * Same inputs always produce same outputs. No side effects.
 */

// ---------------------------------------------------------------------------
// Exported helpers
// ---------------------------------------------------------------------------

/**
 * Deterministic damage value within [min, max] driven by seed.
 * @param {number} min
 * @param {number} max
 * @param {number} seed  Any integer (e.g. the attack roll)
 * @returns {number}
 */
export function calculateDamage(min, max, seed) {
  if (min >= max) return min;
  return min + (Math.abs(seed) % (max - min + 1));
}

/**
 * Subtract defense from raw damage, flooring at 0.
 * @param {number} damage
 * @param {number} defense
 * @returns {number}
 */
export function applyDefense(damage, defense) {
  return Math.max(0, damage - defense);
}

// ---------------------------------------------------------------------------
// Internal modifier helpers
// ---------------------------------------------------------------------------

function productEffects(effects, type) {
  return (effects ?? [])
    .filter(e => e.type === type)
    .reduce((acc, e) => acc * (e.value ?? 1), 1);
}

function sumEffects(effects, type) {
  return (effects ?? [])
    .filter(e => e.type === type)
    .reduce((acc, e) => acc + (e.value ?? 0), 0);
}

// ---------------------------------------------------------------------------
// Main resolver
// ---------------------------------------------------------------------------

/**
 * Resolve a combat action.
 *
 * @param {{ damage:[number,number], statusEffects?:object[] }} attacker
 * @param {{ defense:number, statusEffects?:object[] }}         defender
 * @param {number} roll       D20 result (1–20)
 * @param {{ hitRanges:object, critMultiplier?:number }} settings
 * @returns {{ hit:boolean, critical:boolean, damageDealt:number, effectsApplied:string[], narrative:string }}
 */
export function resolveCombat(attacker, defender, roll, settings) {
  const { hitRanges, critMultiplier = 2.0 } = settings;
  const [dMin, dMax] = attacker.damage ?? attacker.damageRange ?? [1, 1];

  const isMiss = roll >= hitRanges.miss[0] && roll <= hitRanges.miss[1];
  const isCrit = roll >= hitRanges.critical[0] && roll <= hitRanges.critical[1];

  if (isMiss) {
    return { hit: false, critical: false, damageDealt: 0, effectsApplied: [], narrative: 'The attack missed!' };
  }

  let raw = calculateDamage(dMin, dMax, roll);
  if (isCrit) raw = Math.floor(raw * critMultiplier);

  const dmgMult = productEffects(attacker.statusEffects, 'damageMultiplier');
  raw = Math.floor(raw * dmgMult);

  const reduction = Math.min(1, sumEffects(defender.statusEffects, 'damageReduction'));
  raw = Math.floor(raw * (1 - reduction));

  const damageDealt = applyDefense(raw, defender.defense ?? 0);

  const effectsApplied = [];
  if (dmgMult !== 1) effectsApplied.push('damageMultiplier');
  if (reduction !== 0) effectsApplied.push('damageReduction');

  return {
    hit: true,
    critical: isCrit,
    damageDealt,
    effectsApplied,
    narrative: isCrit
      ? `Critical hit! ${damageDealt} damage dealt.`
      : `Hit! ${damageDealt} damage dealt.`,
  };
}
