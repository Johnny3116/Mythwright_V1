/**
 * WildlifeSystem — Wildlife spawn, hunt, and combat
 */

/**
 * Process boss wildlife hunting behavior for a given zone.
 * @param {string} zoneId
 * @param {object} gameState
 * @param {object} blueprint
 * @param {number} roll - D20 roll
 * @returns {{ hunted: boolean, bossBuffed: boolean, buffAmount: number, narrative: string }}
 */
export function processBossHunt(zoneId, gameState, blueprint, roll) {
  const zone = blueprint.zones.find(z => z.id === zoneId);
  if (!zone || !zone.wildlife) {
    return { hunted: false, bossBuffed: false, buffAmount: 0, narrative: '' };
  }

  const wildlifeSettings = blueprint.systems?.wildlife;
  if (!wildlifeSettings?.enabled) {
    return { hunted: false, bossBuffed: false, buffAmount: 0, narrative: '' };
  }

  const huntRolls = wildlifeSettings.bossHuntRolls;
  const wildlife = zone.wildlife;

  const failRange = huntRolls.fail;
  const eatRange = huntRolls.eat;
  const eatBonusRange = huntRolls.eatBonus;

  if (roll >= failRange[0] && roll <= failRange[1]) {
    return {
      hunted: false,
      bossBuffed: false,
      buffAmount: 0,
      narrative: `The ${wildlife.creature} evades the boss!`,
    };
  }

  let buffAmount = 0;
  let narrative = '';

  if (roll >= eatBonusRange[0] && roll <= eatBonusRange[1]) {
    // Bonus eat — full wildlife buff
    buffAmount = wildlife.bossEffect?.hp || 0;
    narrative = `The boss devours the ${wildlife.creature}, gaining ${buffAmount} HP and power!`;
  } else if (roll >= eatRange[0] && roll <= eatRange[1]) {
    // Normal eat — partial buff
    buffAmount = Math.floor((wildlife.bossEffect?.hp || 0) * 0.5);
    narrative = `The boss hunts and eats the ${wildlife.creature}, regaining ${buffAmount} HP!`;
  }

  return {
    hunted: true,
    bossBuffed: buffAmount > 0,
    buffAmount,
    narrative,
  };
}

/**
 * Resolve a player intervening to protect wildlife.
 * @param {object} player
 * @param {string} zoneId
 * @param {object} blueprint
 * @param {number} roll
 * @returns {{ success: boolean, playerDamage: number, narrative: string }}
 */
export function playerIntervention(player, zoneId, blueprint, roll) {
  const zone = blueprint.zones.find(z => z.id === zoneId);
  if (!zone || !zone.wildlife) {
    return { success: false, playerDamage: 0, narrative: 'No wildlife to protect here.' };
  }

  const wildlife = zone.wildlife;
  const attackChance = wildlife.attackChance || [1, 5];

  // Player takes damage if roll is within wildlife attack range
  if (roll >= attackChance[0] && roll <= attackChance[1]) {
    const damage = wildlife.attackDamage || 10;
    return {
      success: false,
      playerDamage: damage,
      narrative: `The ${wildlife.creature} attacks ${player.name} for ${damage} damage during the intervention!`,
    };
  }

  return {
    success: true,
    playerDamage: 0,
    narrative: `${player.name} successfully intervenes and protects the ${wildlife.creature}!`,
  };
}

/**
 * Check if wildlife attacks a player in a zone (random encounter).
 * @param {object} player
 * @param {string} zoneId
 * @param {object} blueprint
 * @param {number} roll
 * @returns {{ attacked: boolean, damage: number, narrative: string }}
 */
export function checkWildlifeAttack(player, zoneId, blueprint, roll) {
  const zone = blueprint.zones.find(z => z.id === zoneId);
  if (!zone || !zone.wildlife) {
    return { attacked: false, damage: 0, narrative: '' };
  }

  const wildlife = zone.wildlife;
  const attackChance = wildlife.attackChance || [1, 5];

  if (roll >= attackChance[0] && roll <= attackChance[1]) {
    const damage = typeof wildlife.attackDamage === 'number' ? wildlife.attackDamage : 10;
    return {
      attacked: true,
      damage,
      narrative: `A ${wildlife.creature} attacks ${player.name} for ${damage} damage!`,
    };
  }

  return { attacked: false, damage: 0, narrative: '' };
}
