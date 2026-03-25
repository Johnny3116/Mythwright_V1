/**
 * BehaviorTree — Monster AI state machine
 * Reads enemy stage data from blueprint and selects actions deterministically.
 */

/**
 * Evaluate the behavior tree for the current boss stage and select an action.
 * @param {object} bossStage - Current stage data from blueprint enemies.boss.stages[]
 * @param {object} gameState - Current game state
 * @param {number} roll - D20 roll for action selection
 * @returns {{ action: string, target: string|null, params: object }}
 */
export function evaluateBehaviorTree(bossStage, gameState, roll) {
  // TODO: Implement in Phase 2
  throw new Error('BehaviorTree.evaluateBehaviorTree not yet implemented');
}

/**
 * Select a target based on targeting strategy.
 * @param {string} strategy - 'random' | 'lowest-hp' | 'highest-damage-dealt'
 * @param {Array} players - Array of player states
 * @returns {object} Selected player state
 */
export function selectTarget(strategy, players) {
  // TODO: Implement in Phase 2
  throw new Error('BehaviorTree.selectTarget not yet implemented');
}
