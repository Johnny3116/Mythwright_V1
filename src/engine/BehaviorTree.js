/**
 * BehaviorTree — Monster AI behavior selection
 * Reads enemy stage data from the blueprint and selects actions.
 * All probabilities are read from blueprint behavior data — never hardcoded.
 */

import { rollBetween } from './DiceSystem.js';
import { selectBossMoveTarget, hasMobsInZone } from './SpatialEngine.js';

/**
 * Select the boss's action for this turn based on stage behavior data and a D20 roll.
 *
 * @param {object} bossState - { hp, maxHp, stage, currentZoneId, effects[] }
 * @param {object[]} players - Array of living player states { id, hp, zoneId, damageDealt? }
 * @param {string} currentZoneId - Zone the boss currently occupies
 * @param {object} roll - Result from rollD20(): { natural, modified }
 * @param {object} stageData - Blueprint boss stage data (enemies.boss.stages[n])
 * @returns {{
 *   action: string,
 *   target: string|"all"|"wildlife"|null,
 *   damage: number,
 *   effects: object[],
 *   narrative: string
 * }}
 */
export function selectBossAction(bossState, players, currentZoneId, roll, stageData, gameState = null) {
  const behavior = stageData.behavior || {};
  const rollVal = roll.natural; // Use natural roll (1-20) for behavior checks

  // Movement: on a very high roll (18-20), boss may move to hunt wildlife or stalk players
  // Only consider movement if gameState is provided (has blueprint + zoneMobs)
  if (rollVal >= 18 && gameState?.blueprint) {
    const hasWildlifeNearby = gameState.blueprint.zones.some(
      (z) => z.id !== currentZoneId && hasMobsInZone(z.id, gameState)
    );
    if (hasWildlifeNearby) {
      const targetZoneId = selectBossMoveTarget(bossState, gameState, gameState.blueprint, roll);
      if (targetZoneId && targetZoneId !== currentZoneId) {
        const targetZone = gameState.blueprint.zones.find((z) => z.id === targetZoneId);
        return {
          action: 'move',
          target: targetZoneId,
          damage: 0,
          effects: [],
          narrative: `${stageData.name} moves toward ${targetZone?.name || targetZoneId}, hunting for prey!`,
        };
      }
    }
  }

  // Check special behaviors in priority order
  // Each chance is a 0-1 probability converted to a 1-20 threshold
  const dodge = behavior.dodgeChance ?? 0;
  const burrow = behavior.burrowChance ?? 0;
  const grab = behavior.grabChance ?? 0;
  const aoe = behavior.aoeAttack ?? false;
  const extraAttacks = behavior.extraAttacks ?? 0;

  // Dodge check: e.g. 10% → triggers on roll 1-2 (out of 20)
  if (dodge > 0 && rollVal <= Math.round(dodge * 20)) {
    return {
      action: 'dodge',
      target: null,
      damage: 0,
      effects: [{ type: 'untargetable', duration: 1, source: 'dodge' }],
      narrative: `${stageData.name} evades and becomes untargetable this round!`,
    };
  }

  // Burrow check
  if (burrow > 0 && rollVal <= Math.round(burrow * 20)) {
    return {
      action: 'burrow',
      target: null,
      damage: 0,
      effects: [{ type: 'untargetable', duration: 1, source: 'burrow' }],
      narrative: `${stageData.name} burrows underground, becoming untargetable for 1 turn!`,
    };
  }

  // Grab check — targets a single player, disables them
  if (grab > 0 && rollVal <= Math.round(grab * 20)) {
    const livePlayers = players.filter((p) => p.hp > 0);
    if (livePlayers.length > 0) {
      const target = selectBossTarget(livePlayers, 'random');
      const [min, max] = stageData.damage;
      const damage = rollBetween(min, max);
      return {
        action: 'grab',
        target,
        damage,
        effects: [{ type: 'immobilize', duration: 1, source: 'grab' }],
        narrative: `${stageData.name} grabs ${target}, dealing ${damage} damage and immobilizing them!`,
      };
    }
  }

  // AOE attack (final form)
  if (aoe) {
    const [min, max] = stageData.damage;
    const damage = rollBetween(min, max);
    return {
      action: 'aoe_attack',
      target: 'all',
      damage,
      effects: [],
      narrative: `${stageData.name} unleashes a devastating AOE strike for ${damage} damage to all players!`,
    };
  }

  // Standard attack — pick target
  const livePlayers = players.filter((p) => p.hp > 0);
  if (livePlayers.length === 0) {
    return { action: 'hunt_wildlife', target: 'wildlife', damage: 0, effects: [], narrative: `${stageData.name} hunts nearby wildlife.` };
  }

  const target = selectBossTarget(livePlayers, 'random');
  const [min, max] = stageData.damage;
  const damage = rollBetween(min, max);

  const actions = [{ action: 'attack', target, damage, effects: [], narrative: `${stageData.name} attacks ${target} for ${damage} damage!` }];

  // Extra attacks (stage 4+)
  for (let i = 0; i < extraAttacks; i++) {
    const extraTarget = selectBossTarget(livePlayers, 'random');
    const extraDamage = rollBetween(min, max);
    actions.push({ action: 'attack', target: extraTarget, damage: extraDamage, effects: [], narrative: `${stageData.name} strikes again at ${extraTarget} for ${extraDamage} damage!` });
  }

  // Return primary action; extra attacks are bundled as additionalAttacks
  return { ...actions[0], additionalAttacks: actions.slice(1) };
}

/**
 * Select a boss target from live players using a targeting strategy.
 *
 * @param {object[]} players - Array of living player states { id, hp, damageDealt? }
 * @param {string} strategy - 'random' | 'lowest_hp' | 'highest_threat' | 'nearest'
 * @returns {string} Target player ID
 */
export function selectBossTarget(players, strategy = 'random') {
  if (!players || players.length === 0) return null;

  switch (strategy) {
    case 'lowest_hp': {
      const sorted = [...players].sort((a, b) => a.hp - b.hp);
      return sorted[0].id;
    }
    case 'highest_threat': {
      const sorted = [...players].sort((a, b) => (b.damageDealt || 0) - (a.damageDealt || 0));
      return sorted[0].id;
    }
    case 'nearest':
      // Without spatial distance data, fall through to random
      return players[rollBetween(0, players.length - 1)].id;
    case 'random':
    default:
      return players[rollBetween(0, players.length - 1)].id;
  }
}

/**
 * Determine if the boss should retreat based on its current HP and stage data.
 *
 * @param {object} bossState - { hp }
 * @param {object} stageData - Blueprint stage data with retreatThreshold
 * @returns {boolean}
 */
export function shouldBossRetreat(bossState, stageData) {
  if (stageData.retreatThreshold === null || stageData.retreatThreshold === undefined) return false;
  return bossState.hp <= stageData.retreatThreshold;
}

/**
 * Return the zone ID the boss retreats to for this stage.
 *
 * @param {object} stageData - Blueprint stage data
 * @returns {string|null}
 */
export function selectRetreatZone(stageData) {
  return stageData.behavior?.retreatZone ?? null;
}

// ─── Legacy functional API ────────────────────────────────────────────────────

/**
 * Evaluate the behavior tree for the current boss stage and select an action.
 * @param {object} bossStage - Current stage data from blueprint enemies.boss.stages[]
 * @param {object} gameState - Current game state { players, boss }
 * @param {object} roll - D20 roll result
 * @returns {{ action: string, target: string|null, params: object }}
 */
export function evaluateBehaviorTree(bossStage, gameState, roll) {
  const players = Object.values(gameState.players || {}).filter((p) => p.hp > 0);
  const result = selectBossAction(gameState.boss, players, gameState.boss?.zone ?? gameState.boss?.currentZoneId, roll, bossStage, gameState);
  return { action: result.action, target: result.target, params: { damage: result.damage, effects: result.effects } };
}

/**
 * Select a target based on targeting strategy.
 * @param {string} strategy
 * @param {object[]} players
 * @returns {object} Selected player state
 */
export function selectTarget(strategy, players) {
  const id = selectBossTarget(players, strategy);
  return players.find((p) => p.id === id) ?? players[0];
}
