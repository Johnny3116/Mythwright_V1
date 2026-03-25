/**
 * FloraSystem — Healing plant spawn, relocation, search, and application
 * All plant data, spawn chances, and search ranges come from blueprint.
 */

import { rollBetween, rollInRange } from './DiceSystem.js';

/**
 * Spawn flora across zones for the current state.
 * Each zone with spawnWeight > 0 can have at most maxPerZone plants.
 *
 * @param {object[]} zones - Blueprint zones array
 * @param {object[]} plants - Blueprint systems.flora.plants array
 * @param {number} round - Current round number (unused here, passed for future use)
 * @returns {object} Map of zoneId → plant data (or null if no plant)
 */
export function spawnFlora(zones, plants, round) {
  const spawns = {};

  for (const zone of zones) {
    const weight = zone.flora?.spawnWeight ?? 0;
    if (weight <= 0) {
      spawns[zone.id] = null;
      continue;
    }

    // Roll to determine which plant spawns (if any)
    const roll = rollBetween(1, 20);
    let spawnedPlant = null;

    for (const plant of plants) {
      const [min, max] = plant.spawnChance;
      if (roll >= min && roll <= max) {
        spawnedPlant = { ...plant, zoneId: zone.id, collected: false };
        break;
      }
    }

    spawns[zone.id] = spawnedPlant;
  }

  return spawns;
}

/**
 * Relocate all flora to new zones (called every respawnInterval rounds).
 *
 * @param {object} currentSpawns - Current { zoneId → plant } map
 * @param {object[]} zones - Blueprint zones array
 * @param {number} round - Current round
 * @param {number} interval - blueprint.systems.flora.respawnInterval
 * @returns {object} New spawn map (or unchanged if not time to relocate)
 */
export function relocateFlora(currentSpawns, zones, round, interval) {
  if (round % interval !== 0) return currentSpawns;

  // Collect all non-null plants and reassign randomly
  const plants = Object.values(currentSpawns).filter(Boolean);
  const eligibleZones = zones.filter((z) => (z.flora?.spawnWeight ?? 0) > 0);

  const newSpawns = {};
  for (const zone of zones) {
    newSpawns[zone.id] = null;
  }

  // Shuffle eligible zones and assign plants
  const shuffled = [...eligibleZones].sort(() => rollBetween(0, 1) - 0.5);
  plants.forEach((plant, i) => {
    if (shuffled[i]) {
      newSpawns[shuffled[i].id] = { ...plant, zoneId: shuffled[i].id, collected: false };
    }
  });

  return newSpawns;
}

/**
 * A player searches their current zone for a plant.
 *
 * @param {string} zoneId
 * @param {object} currentSpawns - { zoneId → plant }
 * @param {object} roll - rollD20() result { natural, modified }
 * @param {object} searchRanges - blueprint.systems.flora.searchRolls
 * @returns {{ found: boolean, plant: object|null, supercharged: boolean }}
 */
export function searchForPlant(zoneId, currentSpawns, roll, searchRanges) {
  const plant = currentSpawns[zoneId];
  if (!plant || plant.collected) {
    return { found: false, plant: null, supercharged: false };
  }

  const rollVal = roll.modified !== undefined ? roll.modified : roll.natural;
  const outcome = rollInRange(rollVal, searchRanges);

  if (outcome === 'fail' || outcome === null) {
    return { found: false, plant: null, supercharged: false };
  }

  return {
    found: true,
    plant,
    supercharged: outcome === 'supercharged',
  };
}

/**
 * Apply plant healing and effects to a target entity.
 *
 * @param {object} plant - Plant data { healAmount, additionalEffect, ... }
 * @param {object} target - Entity state { hp, maxHp, effects }
 * @param {boolean} supercharged - Whether the find was supercharged (roll 20)
 * @returns {{ hpRestored: number, effectsApplied: object[], narrative: string }}
 */
export function applyPlantHealing(plant, target, supercharged) {
  const baseHeal = plant.healAmount || 0;
  const hpRestored = supercharged ? baseHeal * 2 : baseHeal;

  const effectsApplied = [];

  // Parse additional effects from description
  const desc = plant.additionalEffect || '';
  if (desc.includes('+5 Defense')) {
    effectsApplied.push({ type: 'defenseBoost', value: 5, duration: 2, source: plant.id });
  }
  if (desc.includes('Removes all status effects')) {
    effectsApplied.push({ type: 'cleanse', duration: 0, source: plant.id });
  }

  const superStr = supercharged ? ' (SUPERCHARGED!)' : '';
  return {
    hpRestored,
    effectsApplied,
    narrative: `${target.id || 'Player'} uses ${plant.name} and restores ${hpRestored} HP${superStr}!`,
  };
}

// ─── Legacy functional API (kept for backwards compatibility) ─────────────────

/**
 * Resolve a player's search for flora in their current zone.
 * @param {object} player
 * @param {string} zoneId
 * @param {object} floraState
 * @param {object} floraSettings
 * @param {object} roll - D20 roll result
 * @returns {{ found: boolean, healAmount: number, floraType: string|null, narrative: string }}
 */
export function searchFlora(player, zoneId, floraState, floraSettings, roll) {
  const result = searchForPlant(zoneId, floraState, roll, floraSettings.searchRolls);
  if (!result.found) {
    return { found: false, healAmount: 0, floraType: null, narrative: 'No healing plants found in this area.' };
  }
  const healing = applyPlantHealing(result.plant, player, result.supercharged);
  return { found: true, healAmount: healing.hpRestored, floraType: result.plant.id, narrative: healing.narrative };
}
