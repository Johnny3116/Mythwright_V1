/**
 * RetreatSystem — Player escape resolution
 * All outcome ranges and zone modifiers are read from blueprint data.
 */

import { rollInRange } from './DiceSystem.js';

/**
 * Resolve a retreat roll against outcome ranges (with zone modifier applied).
 *
 * @param {object} roll - rollD20() result { natural, modified }
 * @param {number} zoneModifier - retreatModifier from zone data (can be negative)
 * @param {object[]} outcomes - blueprint.systems.retreat.outcomes array
 * @returns {{ outcome: string, effects: object[], narrative: string }}
 */
export function resolveRetreat(roll, zoneModifier, outcomes) {
  const rollVal = (roll.modified !== undefined ? roll.modified : roll.natural) + zoneModifier;
  const clamped = Math.max(1, Math.min(20, rollVal));

  // Find matching outcome
  let matched = null;
  for (const entry of outcomes) {
    const [min, max] = entry.roll;
    if (clamped >= min && clamped <= max) {
      matched = entry;
      break;
    }
  }

  if (!matched) {
    matched = outcomes[outcomes.length - 1]; // fallback to last
  }

  const effects = [];
  if (matched.result === 'failed') {
    effects.push({ type: 'bossCounterAttack', duration: 0 });
  }
  if (matched.result === 'partial') {
    effects.push({ type: 'dropItem', duration: 0 });
  }
  if (matched.result === 'perfect') {
    effects.push({ type: 'heal', value: 10, duration: 0 });
  }

  return {
    outcome: matched.result,
    effects,
    narrative: matched.description,
  };
}

/**
 * Get the retreat modifier for a zone.
 *
 * @param {object} blueprint
 * @param {string} zoneId
 * @returns {number|null} Modifier value, or null if retreat is not allowed
 */
export function getRetreatModifier(blueprint, zoneId) {
  const zone = blueprint.zones.find((z) => z.id === zoneId);
  if (!zone) return null;
  return zone.retreatModifier ?? null;
}

/**
 * Check if a player can retreat from a zone.
 *
 * @param {object} blueprint
 * @param {string} zoneId
 * @returns {boolean}
 */
export function canRetreatFromZone(blueprint, zoneId) {
  const modifier = getRetreatModifier(blueprint, zoneId);
  return modifier !== null;
}

// ─── Legacy functional API (kept for backwards compatibility) ─────────────────

/**
 * Resolve a player's retreat attempt from the current zone.
 * @param {object} player - Player state { zoneId }
 * @param {object} currentZone - Zone data { retreatModifier, connectedZones }
 * @param {object} retreatSettings - Blueprint systems.retreat
 * @param {object} roll - D20 roll result
 * @returns {{ outcome: string, damage: number, newZoneId: string|null, narrative: string }}
 */
export function resolveRetreatLegacy(player, currentZone, retreatSettings, roll) {
  if (currentZone.retreatModifier === null) {
    return { outcome: 'blocked', damage: 0, newZoneId: null, narrative: 'No escape from this zone!' };
  }

  const result = resolveRetreat(roll, currentZone.retreatModifier ?? 0, retreatSettings.outcomes);

  let newZoneId = null;
  if (result.outcome === 'success' || result.outcome === 'perfect') {
    newZoneId = currentZone.connectedZones?.[0] ?? null;
  }

  return { outcome: result.outcome, damage: 0, newZoneId, narrative: result.narrative };
}

/**
 * Get available retreat destinations from current zone.
 * @param {object} currentZone
 * @param {object[]} allZones
 * @returns {object[]} Array of accessible zone objects
 */
export function getRetreatDestinations(currentZone, allZones) {
  if (!currentZone.connectedZones) return [];
  return currentZone.connectedZones
    .map((id) => allZones.find((z) => z.id === id))
    .filter(Boolean);
}
