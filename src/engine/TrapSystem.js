/**
 * TrapSystem — Trap placement and trigger logic
 * All trap types, setup rolls, and escape chances are read from blueprint data.
 */

let _nextTrapId = 1;
function nextTrapId() {
  return `trap-${_nextTrapId++}`;
}

/**
 * Attempt to set a trap in a zone.
 *
 * @param {object} trapType - Trap type from blueprint systems.traps.types[]
 * @param {object} roll - rollD20() result { natural, modified }
 * @param {object} zoneData - Zone data (for trapBonus context)
 * @returns {{ success: boolean, trapPlaced: object|null }}
 */
export function attemptSetTrap(trapType, roll, zoneData) {
  const rollVal = roll.modified !== undefined ? roll.modified : roll.natural;
  const success = rollVal >= trapType.setupRoll;

  if (!success) {
    return { success: false, trapPlaced: null };
  }

  const trapPlaced = {
    id: nextTrapId(),
    typeId: trapType.id,
    name: trapType.name,
    damage: trapType.damage,
    escapeChance: trapType.escapeChance,
    effect: trapType.effect,
    zoneId: zoneData?.id ?? null,
    active: true,
    placedRound: null, // caller fills in
  };

  return { success: true, trapPlaced };
}

/**
 * Get all placed traps in a specific zone from game state.
 *
 * @param {object} gameState - { traps: { [zoneId]: trapData[] } }
 * @param {string} zoneId
 * @returns {object[]}
 */
export function getPlacedTraps(gameState, zoneId) {
  const traps = gameState.traps?.[zoneId];
  if (!traps) return [];
  return traps.filter((t) => t.active);
}

/**
 * Trigger all active traps in a zone when the boss enters.
 * For each trap: boss rolls D20; if roll < escapeChance the boss escapes.
 *
 * @param {string} zoneId
 * @param {object} bossState - { hp, defense }
 * @param {object} gameState - { traps }
 * @param {Function} rollFn - rollD20 function (injectable for testing)
 * @returns {{ results: Array<{ trap, escaped, damage, effects }>, updatedTraps: object[] }}
 */
export function triggerTraps(zoneId, bossState, gameState, rollFn) {
  const activeTraps = getPlacedTraps(gameState, zoneId);
  if (activeTraps.length === 0) return { results: [], updatedTraps: [] };

  const results = [];
  const remainingTraps = [];

  for (const trap of activeTraps) {
    const escapeRoll = rollFn ? rollFn() : { natural: 10, modified: 10 };
    const rollVal = escapeRoll.modified !== undefined ? escapeRoll.modified : escapeRoll.natural;

    // If escapeChance is null, the trap cannot be escaped
    const escaped = trap.escapeChance !== null && rollVal >= trap.escapeChance;
    const damage = escaped ? 0 : (trap.damage || 0);
    const effects = [];

    if (!escaped) {
      // Parse effect description into effect objects if possible
      if (trap.effect && typeof trap.effect === 'string') {
        if (trap.effect.toLowerCase().includes('immobilize') || trap.effect.toLowerCase().includes('stops')) {
          effects.push({ type: 'immobilize', duration: 1, source: trap.typeId });
        }
        if (trap.effect.toLowerCase().includes('slow') || trap.effect.toLowerCase().includes('movement')) {
          effects.push({ type: 'slow', value: 0.5, duration: 2, source: trap.typeId });
        }
        if (trap.effect.toLowerCase().includes('poison') || trap.effect.toLowerCase().includes('damage over time')) {
          effects.push({ type: 'poison', value: 10, duration: 3, source: trap.typeId });
        }
      }
    }

    results.push({ trap, escaped, damage, effects });

    // Traps are consumed on trigger (one-time use)
    remainingTraps.push({ ...trap, active: false });
  }

  return { results, updatedTraps: remainingTraps };
}

/**
 * Get all available trap types from the blueprint.
 *
 * @param {object} blueprint
 * @returns {object[]}
 */
export function getAvailableTraps(blueprint) {
  if (!blueprint?.systems?.traps?.enabled) return [];
  return blueprint.systems.traps.types || [];
}

// ─── Legacy functional API (kept for backwards compatibility) ─────────────────

/**
 * Attempt to place a trap in a zone.
 * @param {object} trap - Trap type from blueprint systems.traps
 * @param {string} zoneId
 * @param {number} setupRoll - D20 roll value
 * @param {object} zone - Zone data (for trapBonus)
 * @returns {{ success: boolean, trapState: object|null, narrative: string }}
 */
export function placeTrap(trap, zoneId, setupRoll, zone) {
  const roll = { natural: setupRoll, modified: setupRoll };
  const result = attemptSetTrap(trap, roll, zone);
  const narrative = result.success
    ? `${trap.name} placed successfully in ${zone?.name || zoneId}!`
    : `Failed to place ${trap.name} — roll too low.`;
  return { success: result.success, trapState: result.trapPlaced ? { ...result.trapPlaced, zoneId } : null, narrative };
}

/**
 * Check and trigger traps when boss enters a zone.
 * @param {string} zoneId
 * @param {object} gameState
 * @param {object} roll - D20 roll result
 * @returns {{ triggered: boolean, trapId: string|null, damage: number, escaped: boolean, narrative: string }}
 */
export function checkTrapTrigger(zoneId, gameState, roll) {
  const traps = getPlacedTraps(gameState, zoneId);
  if (traps.length === 0) return { triggered: false, trapId: null, damage: 0, escaped: false, narrative: 'No traps in zone.' };

  const trap = traps[0]; // Trigger first active trap
  const rollVal = roll.modified !== undefined ? roll.modified : roll.natural;
  const escaped = trap.escapeChance !== null && rollVal >= trap.escapeChance;

  return {
    triggered: true,
    trapId: trap.id,
    damage: escaped ? 0 : trap.damage,
    escaped,
    narrative: escaped
      ? `The boss escapes the ${trap.name}!`
      : `The ${trap.name} triggers, dealing ${trap.damage} damage to the boss!`,
  };
}

/**
 * Get all active traps for a given zone.
 * @param {string} zoneId
 * @param {object} gameState
 * @returns {object[]}
 */
export function getZoneTraps(zoneId, gameState) {
  return getPlacedTraps(gameState, zoneId);
}
