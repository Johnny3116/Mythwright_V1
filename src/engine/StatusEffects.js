/**
 * StatusEffects — Immutable helpers for tracking status effects per entity.
 *
 * Each entity's state has a `statusEffects: []` array. All functions are pure
 * and return new state objects rather than mutating in place.
 */

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Add a new effect to an entity's state.
 * @param {object} entityState
 * @param {{ type:string, value?:number, duration:number, source?:string }} effect
 * @returns {object} Updated entity state
 */
export function applyEffect(entityState, effect) {
  const entry = {
    id: crypto.randomUUID(),
    type: effect.type,
    value: effect.value ?? 0,
    duration: effect.duration,
    source: effect.source ?? 'unknown',
  };
  return {
    ...entityState,
    statusEffects: [...(entityState.statusEffects ?? []), entry],
  };
}

/**
 * Decrement duration on all effects; remove expired ones.
 * @param {object} entityState
 * @returns {{ entityState:object, expiredEffects:object[], damageDealt:number }}
 */
export function tickEffects(entityState) {
  const current = entityState.statusEffects ?? [];
  let damageDealt = 0;
  const remaining = [];
  const expiredEffects = [];

  current.forEach(effect => {
    // Apply DOT damage
    if (effect.type === 'poison' || effect.type === 'bleed') {
      damageDealt += effect.value ?? 0;
    }

    const newDuration = effect.duration - 1;
    if (newDuration > 0) {
      remaining.push({ ...effect, duration: newDuration });
    } else {
      expiredEffects.push(effect);
    }
  });

  let newHp = entityState.hp ?? 0;
  if (damageDealt > 0) newHp = Math.max(0, newHp - damageDealt);

  return {
    entityState: { ...entityState, statusEffects: remaining, hp: newHp },
    expiredEffects,
    damageDealt,
  };
}

/**
 * Remove all effects of a given type.
 * @param {object} entityState
 * @param {string} effectType
 * @returns {object} Updated entity state
 */
export function removeEffect(entityState, effectType) {
  return {
    ...entityState,
    statusEffects: (entityState.statusEffects ?? []).filter(e => e.type !== effectType),
  };
}

/**
 * Remove a specific effect by its id.
 * @param {object} entityState
 * @param {string} effectId
 * @returns {object}
 */
export function removeEffectById(entityState, effectId) {
  return {
    ...entityState,
    statusEffects: (entityState.statusEffects ?? []).filter(e => e.id !== effectId),
  };
}

/**
 * Return all active effects.
 * @param {object} entityState
 * @returns {object[]}
 */
export function getActiveEffects(entityState) {
  return [...(entityState.statusEffects ?? [])];
}

/**
 * Sum all active modifier values for a given stat type.
 * @param {object} entityState
 * @param {string} modifierType  e.g. 'defense', 'damageMultiplier'
 * @returns {number}
 */
export function getEffectModifier(entityState, modifierType) {
  return (entityState.statusEffects ?? [])
    .filter(e => e.type === modifierType)
    .reduce((acc, e) => acc + (e.value ?? 0), 0);
}

/**
 * Remove all effects from an entity.
 * @param {object} entityState
 * @returns {object}
 */
export function clearAllEffects(entityState) {
  return { ...entityState, statusEffects: [] };
}

/**
 * Serialize entity state to JSON-safe plain object.
 * @param {object} entityState
 * @returns {object}
 */
export function serialize(entityState) {
  return JSON.parse(JSON.stringify(entityState));
}

/**
 * Deserialize from a plain object (identity for already-plain objects).
 * @param {object} data
 * @returns {object}
 */
export function deserialize(data) {
  return JSON.parse(JSON.stringify(data));
}
