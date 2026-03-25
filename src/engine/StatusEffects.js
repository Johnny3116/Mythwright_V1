/**
 * StatusEffects — Track and tick active status effects per entity
 *
 * Supported effect types:
 * damageMultiplier, damageReduction, immobilize, poison, bleed, slow,
 * defenseBoost, dodgeChance, extraAttack, heal
 */

let _nextEffectId = 1;

/**
 * Generate a unique effect ID.
 */
function nextId() {
  return `effect-${_nextEffectId++}`;
}

/**
 * Create a new effect tracker for managing status effects across all entities.
 * @returns {object} Effect tracker instance
 */
export function createEffectTracker() {
  // Map: entityId → effect[]
  const effectMap = {};

  function ensureEntity(entityId) {
    if (!effectMap[entityId]) effectMap[entityId] = [];
  }

  return {
    /**
     * Add an effect to an entity.
     * @param {string} entityId
     * @param {object} effect - { type, value?, duration, source? }
     */
    addEffect(entityId, effect) {
      ensureEntity(entityId);
      const entry = {
        id: nextId(),
        type: effect.type,
        value: effect.value ?? null,
        duration: effect.duration,
        source: effect.source ?? null,
      };
      effectMap[entityId].push(entry);
      return entry;
    },

    /**
     * Tick all effects for an entity (decrement durations, remove expired).
     * Also applies DoT effects (poison, bleed).
     * @param {string} entityId
     * @returns {{ expiredEffects: object[], damageDealt: number }}
     */
    tickEffects(entityId) {
      ensureEntity(entityId);
      const expiredEffects = [];
      let damageDealt = 0;

      effectMap[entityId] = effectMap[entityId].filter((effect) => {
        // Apply DoT damage
        if (effect.type === 'poison' || effect.type === 'bleed') {
          damageDealt += effect.value || 0;
        }

        effect.duration -= 1;
        if (effect.duration <= 0) {
          expiredEffects.push(effect);
          return false;
        }
        return true;
      });

      return { expiredEffects, damageDealt };
    },

    /**
     * Get all active effects for an entity.
     * @param {string} entityId
     * @returns {object[]}
     */
    getActiveEffects(entityId) {
      ensureEntity(entityId);
      return [...effectMap[entityId]];
    },

    /**
     * Get the combined modifier for a given stat across all active effects.
     * @param {string} entityId
     * @param {string} statName - e.g. 'damage', 'defense', 'dodge'
     * @returns {number} Combined multiplier or flat modifier
     */
    getModifier(entityId, statName) {
      ensureEntity(entityId);
      let combined = 0;
      for (const effect of effectMap[entityId]) {
        if (effect.type === `${statName}Multiplier` || effect.type === `${statName}Boost`) {
          combined += effect.value || 0;
        }
        if (effect.type === `${statName}Reduction`) {
          combined -= effect.value || 0;
        }
      }
      return combined;
    },

    /**
     * Remove all effects of a specific type from an entity.
     * @param {string} entityId
     * @param {string} effectType
     */
    removeEffect(entityId, effectType) {
      ensureEntity(entityId);
      effectMap[entityId] = effectMap[entityId].filter((e) => e.type !== effectType);
    },

    /**
     * Remove a specific effect by its ID.
     * @param {string} entityId
     * @param {string} effectId
     */
    removeEffectById(entityId, effectId) {
      ensureEntity(entityId);
      effectMap[entityId] = effectMap[entityId].filter((e) => e.id !== effectId);
    },

    /**
     * Clear all effects from an entity.
     * @param {string} entityId
     */
    clearAll(entityId) {
      effectMap[entityId] = [];
    },

    /**
     * Check if an entity has a specific effect type active.
     * @param {string} entityId
     * @param {string} effectType
     * @returns {boolean}
     */
    hasEffect(entityId, effectType) {
      ensureEntity(entityId);
      return effectMap[entityId].some((e) => e.type === effectType);
    },

    /**
     * Serialize the full effect map for save/load.
     * @returns {object}
     */
    serialize() {
      return JSON.parse(JSON.stringify(effectMap));
    },

    /**
     * Deserialize and restore the effect map.
     * @param {object} data
     */
    deserialize(data) {
      Object.keys(effectMap).forEach((k) => delete effectMap[k]);
      Object.assign(effectMap, JSON.parse(JSON.stringify(data)));
    },
  };
}

// ─── Functional helpers (operate on entity state objects directly) ────────────

/**
 * Apply a new status effect to an entity state object.
 * Entity state must have an `effects` array.
 * @param {object} entityState
 * @param {object} effect - { type, value?, duration, source? }
 * @returns {object} Updated entity state (immutable copy)
 */
export function applyEffect(entityState, effect) {
  const entry = {
    id: nextId(),
    type: effect.type,
    value: effect.value ?? null,
    duration: effect.duration,
    source: effect.source ?? null,
  };
  return {
    ...entityState,
    effects: [...(entityState.effects || []), entry],
  };
}

/**
 * Tick all active effects on an entity state object.
 * @param {object} entityState
 * @returns {{ entityState: object, expiredEffects: object[], damageDealt: number }}
 */
export function tickEffects(entityState) {
  const effects = entityState.effects || [];
  const expiredEffects = [];
  let damageDealt = 0;

  const activeEffects = effects.filter((effect) => {
    if (effect.type === 'poison' || effect.type === 'bleed') {
      damageDealt += effect.value || 0;
    }
    const remaining = effect.duration - 1;
    if (remaining <= 0) {
      expiredEffects.push(effect);
      return false;
    }
    return true;
  });

  // Map with updated durations
  const updatedEffects = effects
    .map((e) => ({ ...e, duration: e.duration - 1 }))
    .filter((e) => e.duration > 0);

  return {
    entityState: { ...entityState, effects: updatedEffects },
    expiredEffects,
    damageDealt,
  };
}

/**
 * Remove a specific effect by type from an entity state.
 * @param {object} entityState
 * @param {string} effectType
 * @returns {object} Updated entity state
 */
export function removeEffect(entityState, effectType) {
  return {
    ...entityState,
    effects: (entityState.effects || []).filter((e) => e.type !== effectType),
  };
}

/**
 * Get all active effects for an entity state.
 * @param {object} entityState
 * @returns {object[]}
 */
export function getActiveEffects(entityState) {
  return [...(entityState.effects || [])];
}

/**
 * Get the combined modifier value for a given modifier type across all active effects.
 * @param {object} entityState
 * @param {string} modifierType - e.g. 'defense', 'damage', 'speed'
 * @returns {number}
 */
export function getEffectModifier(entityState, modifierType) {
  const effects = entityState.effects || [];
  let combined = 0;
  for (const effect of effects) {
    if (effect.type === `${modifierType}Multiplier` || effect.type === `${modifierType}Boost`) {
      combined += effect.value || 0;
    }
    if (effect.type === `${modifierType}Reduction`) {
      combined -= effect.value || 0;
    }
  }
  return combined;
}
