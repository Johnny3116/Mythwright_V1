/**
 * StatusEffects — Track and tick active status effects per entity
 */

/**
 * Apply a new status effect to an entity.
 * @param {object} entityState - Entity's current state
 * @param {object} effect - { type, value, duration, source }
 * @returns {object} Updated entity state
 */
export function applyEffect(entityState, effect) {
  const existing = entityState.statusEffects || [];
  // Replace effect of same type if already present (re-apply resets duration)
  const filtered = existing.filter(e => e.type !== effect.type);
  return {
    ...entityState,
    statusEffects: [...filtered, { ...effect, remainingDuration: effect.duration }],
  };
}

/**
 * Tick all active effects on an entity (called at end of their turn).
 * @param {object} entityState
 * @returns {{ entityState: object, expiredEffects: Array, damageDealt: number }}
 */
export function tickEffects(entityState) {
  const effects = entityState.statusEffects || [];
  const expiredEffects = [];
  let damageDealt = 0;
  let hpDelta = 0;

  const updatedEffects = effects
    .map(effect => {
      let updated = { ...effect, remainingDuration: effect.remainingDuration - 1 };

      // Tick damage-over-time effects
      if (effect.type === 'poison' || effect.type === 'bleed') {
        damageDealt += effect.value || 0;
        hpDelta -= effect.value || 0;
      }

      return updated;
    })
    .filter(effect => {
      if (effect.remainingDuration <= 0) {
        expiredEffects.push(effect);
        return false;
      }
      return true;
    });

  const newHp = Math.max(0, (entityState.hp || 0) + hpDelta);

  return {
    entityState: {
      ...entityState,
      hp: newHp,
      statusEffects: updatedEffects,
    },
    expiredEffects,
    damageDealt,
  };
}

/**
 * Remove a specific effect by type.
 * @param {object} entityState
 * @param {string} effectType
 * @returns {object} Updated entity state
 */
export function removeEffect(entityState, effectType) {
  return {
    ...entityState,
    statusEffects: (entityState.statusEffects || []).filter(e => e.type !== effectType),
  };
}

/**
 * Get all active effects for an entity.
 * @param {object} entityState
 * @returns {Array}
 */
export function getActiveEffects(entityState) {
  return entityState.statusEffects || [];
}

/**
 * Calculate combined modifier from all active effects of a given type.
 * @param {object} entityState
 * @param {string} modifierType - e.g. 'defense', 'damage', 'speed'
 * @returns {number}
 */
export function getEffectModifier(entityState, modifierType) {
  const effects = entityState.statusEffects || [];
  return effects
    .filter(e => e.modifierType === modifierType)
    .reduce((sum, e) => sum + (e.value || 0), 0);
}

/**
 * Check if entity has a specific effect.
 */
export function hasEffect(entityState, effectType) {
  return (entityState.statusEffects || []).some(e => e.type === effectType);
}
