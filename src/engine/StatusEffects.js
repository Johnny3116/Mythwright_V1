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
  // TODO: Implement in Phase 2
  throw new Error('StatusEffects.applyEffect not yet implemented');
}

/**
 * Tick all active effects on an entity (called at end of their turn).
 * @param {object} entityState
 * @returns {{ entityState: object, expiredEffects: Array, damageDealt: number }}
 */
export function tickEffects(entityState) {
  // TODO: Implement in Phase 2
  throw new Error('StatusEffects.tickEffects not yet implemented');
}

/**
 * Remove a specific effect by type.
 * @param {object} entityState
 * @param {string} effectType
 * @returns {object} Updated entity state
 */
export function removeEffect(entityState, effectType) {
  // TODO: Implement in Phase 2
  throw new Error('StatusEffects.removeEffect not yet implemented');
}

/**
 * Get all active effects for an entity.
 * @param {object} entityState
 * @returns {Array}
 */
export function getActiveEffects(entityState) {
  // TODO: Implement in Phase 2
  throw new Error('StatusEffects.getActiveEffects not yet implemented');
}

/**
 * Calculate combined modifier from all active effects of a given type.
 * @param {object} entityState
 * @param {string} modifierType - e.g. 'defense', 'damage', 'speed'
 * @returns {number}
 */
export function getEffectModifier(entityState, modifierType) {
  // TODO: Implement in Phase 2
  throw new Error('StatusEffects.getEffectModifier not yet implemented');
}
