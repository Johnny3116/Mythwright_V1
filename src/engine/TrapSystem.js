/**
 * TrapSystem — Trap placement and trigger logic.
 */

/**
 * Attempt to place a trap in a zone.
 *
 * @param {object} trap       Trap type definition from blueprint systems.traps.types[]
 * @param {string} zoneId
 * @param {number} setupRoll  D20 roll result
 * @param {object} zone       Zone data (for trapBonus flavour text)
 * @returns {{ success:boolean, trapState:object|null, narrative:string }}
 */
export function placeTrap(trap, zoneId, setupRoll, zone) {
  const success = setupRoll >= trap.setupRoll;

  if (!success) {
    return {
      success: false,
      trapState: null,
      narrative: `Failed to set ${trap.name} — roll of ${setupRoll} didn't meet threshold ${trap.setupRoll}.`,
    };
  }

  const trapState = {
    id: `${trap.id}-${zoneId}-${Date.now()}`,
    trapType: trap.id,
    name: trap.name,
    zoneId,
    damage: trap.damage,
    escapeChance: trap.escapeChance,
    effect: trap.effect,
    triggered: false,
  };

  return {
    success: true,
    trapState,
    narrative: `${trap.name} successfully set in ${zone?.name ?? zoneId}. ${zone?.trapBonus ?? ''}`.trim(),
  };
}

/**
 * Check and trigger traps when the boss enters a zone.
 *
 * @param {string} zoneId
 * @param {object} gameState  { traps: TrapState[] }
 * @param {number} roll       D20 roll for boss escape attempt
 * @returns {{ triggered:boolean, trapId:string|null, damage:number, escaped:boolean, narrative:string }}
 */
export function checkTrapTrigger(zoneId, gameState, roll) {
  const active = getZoneTraps(zoneId, gameState);

  if (active.length === 0) {
    return { triggered: false, trapId: null, damage: 0, escaped: false, narrative: 'No traps in this zone.' };
  }

  // Trigger the first active trap
  const trap = active[0];
  const canEscape = trap.escapeChance !== null && trap.escapeChance !== undefined;
  const escaped = canEscape && roll >= trap.escapeChance;

  return {
    triggered: true,
    trapId: trap.id,
    damage: escaped ? 0 : (trap.damage ?? 0),
    escaped,
    narrative: escaped
      ? `Boss escaped the ${trap.name} trap! (roll ${roll} ≥ ${trap.escapeChance})`
      : `${trap.name} triggered! Boss takes ${trap.damage ?? 0} damage. ${trap.effect ?? ''}`.trim(),
  };
}

/**
 * Return all active (not yet triggered) traps in a given zone.
 * @param {string} zoneId
 * @param {{ traps: object[] }} gameState
 * @returns {object[]}
 */
export function getZoneTraps(zoneId, gameState) {
  return (gameState.traps ?? []).filter(t => t.zoneId === zoneId && !t.triggered);
}

/**
 * Mark a trap as triggered (returns new traps array).
 * @param {object[]} traps
 * @param {string} trapId
 * @returns {object[]}
 */
export function markTrapTriggered(traps, trapId) {
  return traps.map(t => t.id === trapId ? { ...t, triggered: true } : t);
}
