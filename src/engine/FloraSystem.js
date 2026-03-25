/**
 * FloraSystem — Healing plant spawn and search
 */

import { rollInRange } from './DiceSystem.js';

/**
 * Spawn flora across zones based on blueprint weights.
 * @param {Array} zones - Blueprint zones array
 * @param {object} floraSettings - Blueprint systems.flora
 * @returns {object} Map of zoneId → flora state { plantId, plantName, healAmount }
 */
export function spawnFlora(zones, floraSettings) {
  if (!floraSettings?.enabled) return {};

  const floraState = {};
  const plants = floraSettings.plants || [];
  if (plants.length === 0) return {};

  for (const zone of zones) {
    const weight = zone.flora?.spawnWeight ?? 1.0;
    if (weight <= 0) continue;

    // Weighted random: roll to decide if zone gets a plant
    const spawnRoll = rollInRange(1, 10);
    if (spawnRoll <= Math.floor(weight * 10)) {
      const plant = pickPlant(plants);
      if (plant) {
        floraState[zone.id] = {
          plantId: plant.id,
          plantName: plant.name,
          healAmount: plant.healAmount,
          additionalEffect: plant.additionalEffect,
        };
      }
    }
  }

  return floraState;
}

/**
 * Relocate flora every N turns as specified in blueprint.
 * @param {object} floraState - Current flora state
 * @param {Array} zones
 * @param {object} floraSettings
 * @param {number} currentRound
 * @returns {object} Updated flora state
 */
export function relocateFlora(floraState, zones, floraSettings, currentRound) {
  const interval = floraSettings?.respawnInterval || 3;
  if (currentRound % interval !== 0) return floraState;

  // Respawn flora from scratch on relocation rounds
  return spawnFlora(zones, floraSettings);
}

/**
 * Resolve a player's search for flora in their current zone.
 * @param {object} player
 * @param {string} zoneId
 * @param {object} floraState
 * @param {object} floraSettings
 * @param {number} roll - D20 roll
 * @returns {{ found: boolean, healAmount: number, floraType: string|null, narrative: string }}
 */
export function searchFlora(player, zoneId, floraState, floraSettings, roll) {
  const hasFlora = floraState && floraState[zoneId];
  if (!hasFlora) {
    return {
      found: false,
      healAmount: 0,
      floraType: null,
      narrative: `${player.name} searches but finds no medicinal plants here.`,
    };
  }

  const searchRolls = floraSettings?.searchRolls || { fail: [1, 10], found: [11, 19], supercharged: [20, 20] };
  const plant = floraState[zoneId];

  if (roll >= searchRolls.supercharged[0] && roll <= searchRolls.supercharged[1]) {
    const healAmount = Math.floor(plant.healAmount * 1.5);
    return {
      found: true,
      healAmount,
      floraType: plant.plantId,
      narrative: `${player.name} discovers a supercharged ${plant.plantName}! Heals ${healAmount} HP! ${plant.additionalEffect || ''}`,
    };
  }

  if (roll >= searchRolls.found[0] && roll <= searchRolls.found[1]) {
    return {
      found: true,
      healAmount: plant.healAmount,
      floraType: plant.plantId,
      narrative: `${player.name} finds ${plant.plantName} and heals ${plant.healAmount} HP!`,
    };
  }

  return {
    found: false,
    healAmount: 0,
    floraType: null,
    narrative: `${player.name} searches but can't find the plant (rolled ${roll}).`,
  };
}

/**
 * Pick a random plant based on spawn chance ranges.
 * @param {Array} plants
 * @returns {object|null}
 */
function pickPlant(plants) {
  const roll = rollInRange(1, 20);
  for (const plant of plants) {
    const [min, max] = plant.spawnChance;
    if (roll >= min && roll <= max) return plant;
  }
  // Fallback: pick first plant
  return plants[0] || null;
}
