/**
 * RetreatSystem — Player escape resolution.
 */

/**
 * Resolve a player's attempt to retreat from the current zone.
 *
 * @param {object} player              Player state
 * @param {object} currentZone         Zone data with retreatModifier
 * @param {{ outcomes:object[], endsTurn:boolean }} retreatSettings
 * @param {number} roll                D20 roll
 * @returns {{ outcome:string, damage:number, newZoneId:string|null, narrative:string }}
 */
export function resolveRetreat(player, currentZone, retreatSettings, roll) {
  const modifier = currentZone.retreatModifier ?? 0;
  // Clamp effective roll to valid range so it always matches an outcome
  const effective = Math.max(1, Math.min(20, roll + modifier));

  const outcomes = retreatSettings.outcomes ?? [];
  const matched = outcomes.find(o => effective >= o.roll[0] && effective <= o.roll[1]);
  const outcome = matched ?? outcomes[0];

  // For 'success' and 'perfect', pick the first connected zone as destination
  let newZoneId = null;
  if (outcome.result === 'success' || outcome.result === 'perfect') {
    newZoneId = (currentZone.connectedZones ?? [])[0] ?? null;
  }

  // 'perfect' also grants 10 HP
  const healAmount = outcome.result === 'perfect' ? 10 : 0;

  return {
    outcome: outcome.result,
    damage: 0,        // any boss free-attack damage is resolved by caller
    newZoneId,
    healAmount,
    narrative: outcome.description ?? `Retreat outcome: ${outcome.result}`,
  };
}

/**
 * Return all zones reachable from the current zone.
 * @param {object} currentZone
 * @param {object[]} allZones
 * @returns {object[]}
 */
export function getRetreatDestinations(currentZone, allZones) {
  const ids = new Set(currentZone.connectedZones ?? []);
  return allZones.filter(z => ids.has(z.id));
}
