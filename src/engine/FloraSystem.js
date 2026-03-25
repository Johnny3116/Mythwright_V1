/**
 * FloraSystem — Healing plant spawn, relocation, and search.
 */

// ---------------------------------------------------------------------------
// Internal helper
// ---------------------------------------------------------------------------

function getPlantByRoll(roll, plants) {
  return plants.find(p => roll >= p.spawnChance[0] && roll <= p.spawnChance[1]) ?? null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Spawn flora across zones using blueprint weights.
 *
 * @param {object[]} zones
 * @param {{ plants:object[], maxPerZone:number }} floraSettings
 * @returns {Record<string, { plantId:string, zoneId:string }>}
 */
export function spawnFlora(zones, floraSettings) {
  const { plants } = floraSettings;
  const floraState = {};

  zones.forEach(zone => {
    if (!(zone.flora?.spawnWeight > 0)) return;

    const buf = new Uint8Array(1);
    crypto.getRandomValues(buf);
    const roll = (buf[0] % 20) + 1;
    const plant = getPlantByRoll(roll, plants);
    if (plant) {
      floraState[zone.id] = { plantId: plant.id, zoneId: zone.id };
    }
  });

  return floraState;
}

/**
 * Relocate flora every N turns (respawnInterval from blueprint).
 *
 * @param {object} floraState     Current flora state
 * @param {object[]} zones
 * @param {object} floraSettings
 * @param {number} currentRound
 * @returns {object}  Updated flora state (re-spawned if interval hit)
 */
export function relocateFlora(floraState, zones, floraSettings, currentRound) {
  if (currentRound % (floraSettings.respawnInterval ?? 3) !== 0) return floraState;
  return spawnFlora(zones, floraSettings);
}

/**
 * Resolve a player searching for flora in their zone.
 *
 * @param {object} player
 * @param {string} zoneId
 * @param {object} floraState
 * @param {{ searchRolls:object, plants:object[] }} floraSettings
 * @param {number} roll   D20 roll
 * @returns {{ found:boolean, healAmount:number, floraType:string|null, narrative:string }}
 */
export function searchFlora(player, zoneId, floraState, floraSettings, roll) {
  const floraInZone = floraState[zoneId];

  if (!floraInZone) {
    return { found: false, healAmount: 0, floraType: null, narrative: 'No medicinal plants here.' };
  }

  const { searchRolls, plants } = floraSettings;
  const isFail = roll >= searchRolls.fail[0] && roll <= searchRolls.fail[1];

  if (isFail) {
    return { found: false, healAmount: 0, floraType: null, narrative: 'You search thoroughly but find nothing useful.' };
  }

  const plant = plants.find(p => p.id === floraInZone.plantId);
  if (!plant) {
    return { found: false, healAmount: 0, floraType: null, narrative: 'You cannot identify the plants here.' };
  }

  const isSupercharged = roll >= searchRolls.supercharged[0] && roll <= searchRolls.supercharged[1];
  const healAmount = isSupercharged ? Math.floor(plant.healAmount * 1.5) : plant.healAmount;

  return {
    found: true,
    healAmount,
    floraType: plant.id,
    narrative: isSupercharged
      ? `A potent ${plant.name}! You heal for ${healAmount} HP. ${plant.additionalEffect}`
      : `You found ${plant.name} and healed for ${healAmount} HP.`,
  };
}
