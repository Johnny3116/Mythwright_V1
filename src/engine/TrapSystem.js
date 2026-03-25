/**
 * TrapSystem — Trap placement and trigger logic
 */

/**
 * Attempt to place a trap in a zone.
 * @param {object} trap - Trap type from blueprint systems.traps.types[]
 * @param {string} zoneId
 * @param {number} setupRoll - D20 roll result
 * @param {object} zone - Zone data (for trapBonus)
 * @returns {{ success: boolean, trapState: object|null, narrative: string }}
 */
export function placeTrap(trap, zoneId, setupRoll, zone) {
  const required = trap.setupRoll || 10;

  if (setupRoll < required) {
    return {
      success: false,
      trapState: null,
      narrative: `Failed to set ${trap.name} (rolled ${setupRoll}, needed ${required}).`,
    };
  }

  const trapState = {
    id: `${trap.id}-${zoneId}-${Date.now()}`,
    trapTypeId: trap.id,
    trapName: trap.name,
    zoneId,
    damage: trap.damage || 0,
    escapeChance: trap.escapeChance || null,
    effect: trap.effect || '',
    active: true,
    placedAt: Date.now(),
  };

  return {
    success: true,
    trapState,
    narrative: `${trap.name} successfully placed in ${zone?.name || zoneId}!`,
  };
}

/**
 * Check and trigger traps when boss enters a zone.
 * @param {string} zoneId - Zone the boss entered
 * @param {object} gameState - Full game state (has placedTraps array)
 * @param {number} roll - D20 roll for escape attempt
 * @returns {{ triggered: boolean, trapId: string|null, damage: number, escaped: boolean, narrative: string }}
 */
export function checkTrapTrigger(zoneId, gameState, roll) {
  const activeTraps = (gameState.placedTraps || []).filter(
    t => t.zoneId === zoneId && t.active
  );

  if (activeTraps.length === 0) {
    return { triggered: false, trapId: null, damage: 0, escaped: false, narrative: '' };
  }

  // Trigger the first active trap
  const trap = activeTraps[0];
  const escapeThreshold = trap.escapeChance;

  let escaped = false;
  if (escapeThreshold !== null && escapeThreshold !== undefined) {
    escaped = roll >= escapeThreshold;
  }

  const damage = escaped ? Math.floor(trap.damage * 0.5) : trap.damage;

  const narrative = escaped
    ? `The boss partially escapes the ${trap.trapName}! It takes ${damage} damage.`
    : `The ${trap.trapName} triggers! The boss takes ${damage} damage! ${trap.effect}`;

  return {
    triggered: true,
    trapId: trap.id,
    damage,
    escaped,
    narrative,
  };
}

/**
 * Get all active traps for a given zone.
 * @param {string} zoneId
 * @param {object} gameState
 * @returns {Array}
 */
export function getZoneTraps(zoneId, gameState) {
  return (gameState.placedTraps || []).filter(t => t.zoneId === zoneId && t.active);
}

/**
 * Remove a triggered trap from game state (deactivate it).
 * @param {Array} placedTraps
 * @param {string} trapId
 * @returns {Array} Updated traps array
 */
export function deactivateTrap(placedTraps, trapId) {
  return placedTraps.map(t => (t.id === trapId ? { ...t, active: false } : t));
}

/**
 * Get available trap types from blueprint.
 * @param {object} blueprint
 * @returns {Array}
 */
export function getAvailableTrapTypes(blueprint) {
  return blueprint?.systems?.traps?.types || [];
}
