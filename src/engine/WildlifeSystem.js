/**
 * WildlifeSystem — Boss hunting behaviour and player intervention.
 */

/**
 * Process the boss hunting wildlife in a zone.
 *
 * @param {string} zoneId
 * @param {object} gameState     { boss: { zoneId } }
 * @param {object} blueprint     Full blueprint object
 * @param {number} roll          D20 roll
 * @returns {{ hunted:boolean, bossBuffed:boolean, buffAmount:number, narrative:string }}
 */
export function processBossHunt(zoneId, gameState, blueprint, roll) {
  const zone = (blueprint.zones ?? []).find(z => z.id === zoneId);
  if (!zone?.wildlife) {
    return { hunted: false, bossBuffed: false, buffAmount: 0, narrative: 'No wildlife in this zone.' };
  }

  const { bossHuntRolls } = blueprint.systems?.wildlife ?? {};
  if (!bossHuntRolls) {
    return { hunted: false, bossBuffed: false, buffAmount: 0, narrative: 'Wildlife system not configured.' };
  }

  const isFail = roll >= bossHuntRolls.fail[0] && roll <= bossHuntRolls.fail[1];
  if (isFail) {
    return {
      hunted: false,
      bossBuffed: false,
      buffAmount: 0,
      narrative: `${zone.wildlife.creature} escapes into the undergrowth!`,
    };
  }

  const isEatBonus = roll >= bossHuntRolls.eatBonus[0] && roll <= bossHuntRolls.eatBonus[1];
  const baseHpBuff = zone.wildlife.bossEffect?.hp ?? 0;
  const buffAmount = Math.floor(isEatBonus ? baseHpBuff * 1.5 : baseHpBuff);

  return {
    hunted: true,
    bossBuffed: buffAmount > 0,
    buffAmount,
    narrative: isEatBonus
      ? `Tzorath devours the ${zone.wildlife.creature}, feasting greedily! Gains ${buffAmount} HP.`
      : `Tzorath hunts the ${zone.wildlife.creature} and gains ${buffAmount} HP.`,
  };
}

/**
 * Resolve a player attempting to drive off the boss from attacking wildlife.
 *
 * @param {object} player      Player state (for context)
 * @param {string} zoneId
 * @param {object} blueprint
 * @param {number} roll
 * @returns {{ success:boolean, playerDamage:number, narrative:string }}
 */
export function playerIntervention(player, zoneId, blueprint, roll) {
  const zone = (blueprint.zones ?? []).find(z => z.id === zoneId);
  if (!zone?.wildlife) {
    return { success: false, playerDamage: 0, narrative: 'No wildlife to protect here.' };
  }

  const { hitRanges } = blueprint.settings ?? {};
  const isMiss = hitRanges
    ? roll >= hitRanges.miss[0] && roll <= hitRanges.miss[1]
    : roll <= 5;

  if (isMiss) {
    const damage = zone.wildlife.attackDamage ?? 0;
    return {
      success: false,
      playerDamage: damage,
      narrative: `You failed to protect the ${zone.wildlife.creature} and took ${damage} damage!`,
    };
  }

  return {
    success: true,
    playerDamage: 0,
    narrative: `You drove off Tzorath and protected the ${zone.wildlife.creature}!`,
  };
}
