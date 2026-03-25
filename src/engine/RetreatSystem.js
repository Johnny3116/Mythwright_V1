/**
 * RetreatSystem — Player escape resolution
 */

/**
 * Resolve a player's retreat attempt from the current zone.
 * @param {object} player - Player state
 * @param {object} currentZone - Zone data (for retreatModifier)
 * @param {object} retreatSettings - Blueprint systems.retreat
 * @param {number} roll - D20 roll
 * @returns {{ outcome: 'fail'|'partial'|'success'|'perfect', damage: number, newZoneId: string|null, narrative: string, heal: number }}
 */
export function resolveRetreat(player, currentZone, retreatSettings, roll) {
  if (!retreatSettings?.enabled) {
    return { outcome: 'fail', damage: 0, newZoneId: null, narrative: 'Retreat is not available.', heal: 0 };
  }

  const modifier = currentZone?.retreatModifier ?? 0;
  const modifiedRoll = Math.max(1, Math.min(20, roll + modifier));

  const outcomes = retreatSettings.outcomes || [];

  // Find matching outcome
  let matched = null;
  for (const outcome of outcomes) {
    const [min, max] = outcome.roll;
    if (modifiedRoll >= min && modifiedRoll <= max) {
      matched = outcome;
      break;
    }
  }

  if (!matched) {
    matched = outcomes[outcomes.length - 1] || { result: 'fail', description: 'Failed to retreat.' };
  }

  const destinations = getRetreatDestinations(currentZone, []);
  const newZoneId = destinations.length > 0 ? destinations[0] : null;

  switch (matched.result) {
    case 'failed':
    case 'fail':
      return {
        outcome: 'fail',
        damage: 0,
        newZoneId: null,
        narrative: `${player.name} fails to retreat! ${matched.description}`,
        heal: 0,
      };

    case 'partial':
      return {
        outcome: 'partial',
        damage: 0,
        newZoneId,
        narrative: `${player.name} retreats but drops an item! ${matched.description}`,
        heal: 0,
      };

    case 'success':
      return {
        outcome: 'success',
        damage: 0,
        newZoneId,
        narrative: `${player.name} successfully retreats! ${matched.description}`,
        heal: 0,
      };

    case 'perfect':
      return {
        outcome: 'perfect',
        damage: 0,
        newZoneId,
        narrative: `${player.name} makes a perfect retreat! ${matched.description}`,
        heal: 10,
      };

    default:
      return {
        outcome: 'fail',
        damage: 0,
        newZoneId: null,
        narrative: `${player.name}'s retreat failed.`,
        heal: 0,
      };
  }
}

/**
 * Get available retreat destinations from current zone.
 * @param {object} currentZone
 * @param {Array} allZones - Full zones array (optional, for zone data lookup)
 * @returns {Array} Array of connected zone ids
 */
export function getRetreatDestinations(currentZone, allZones) {
  if (!currentZone) return [];
  return currentZone.connectedZones || [];
}
