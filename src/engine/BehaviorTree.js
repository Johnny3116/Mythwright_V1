/**
 * BehaviorTree — Monster AI state machine
 * Reads enemy stage data from blueprint and selects actions deterministically.
 */

import { rollInRange } from './DiceSystem.js';

/**
 * Evaluate the behavior tree for the current boss stage and select an action.
 * @param {object} bossStage - Current stage data from blueprint enemies.boss.stages[]
 * @param {object} gameState - Current game state
 * @param {number} roll - D20 roll for action selection
 * @returns {{ action: string, target: string|null, params: object }}
 */
export function evaluateBehaviorTree(bossStage, gameState, roll) {
  const behavior = bossStage.behavior || {};
  const alivePlayers = Object.values(gameState.players || {}).filter(p => p.alive !== false);

  if (alivePlayers.length === 0) {
    return { action: 'idle', target: null, params: {} };
  }

  // Stage 5: AOE attack hits all players
  if (behavior.aoeAttack) {
    return {
      action: 'aoe_attack',
      target: null,
      params: { targets: alivePlayers.map(p => p.id) },
    };
  }

  // Dodge attempt (Stage 1) — use incoming roll for determinism
  if (behavior.dodgeChance && roll <= Math.floor(behavior.dodgeChance * 20)) {
    return { action: 'dodge', target: null, params: {} };
  }

  // Burrow (Stage 2) — roll 1-4 out of 20 triggers burrow
  if (behavior.burrowChance && roll <= Math.floor(behavior.burrowChance * 20)) {
    return { action: 'burrow', target: null, params: { duration: 1 } };
  }

  // Grab (Stage 3)
  if (behavior.grabChance && roll <= Math.floor(behavior.grabChance * 20)) {
    const target = selectTarget('random', alivePlayers);
    return { action: 'grab', target: target?.id || null, params: { duration: 1 } };
  }

  // Default: attack a player
  const target = selectTarget('random', alivePlayers);

  // Extra attacks (Stage 4)
  if (behavior.extraAttacks && behavior.extraAttacks > 0) {
    return {
      action: 'multi_attack',
      target: target?.id || null,
      params: { attackCount: 1 + behavior.extraAttacks },
    };
  }

  return { action: 'attack', target: target?.id || null, params: {} };
}

/**
 * Select a target based on targeting strategy.
 * @param {string} strategy - 'random' | 'lowest-hp' | 'highest-damage-dealt'
 * @param {Array} players - Array of alive player states
 * @returns {object} Selected player state
 */
export function selectTarget(strategy, players) {
  if (!players || players.length === 0) return null;

  const alive = players.filter(p => p.alive !== false && p.hp > 0);
  if (alive.length === 0) return null;

  switch (strategy) {
    case 'lowest-hp':
      return alive.reduce((min, p) => (p.hp < min.hp ? p : min), alive[0]);

    case 'highest-damage-dealt':
      return alive.reduce(
        (max, p) => ((p.damageDealt || 0) > (max.damageDealt || 0) ? p : max),
        alive[0]
      );

    case 'random':
    default: {
      const idx = rollInRange(0, alive.length - 1);
      return alive[idx];
    }
  }
}
