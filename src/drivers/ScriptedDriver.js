/**
 * ScriptedDriver — Automated blueprint-driven GM implementation
 * Auto-resolves all non-player turns using blueprint behavior trees.
 */

import { evaluateBehaviorTree, selectTarget } from '@engine/BehaviorTree.js';
import { rollD20 } from '@engine/DiceSystem.js';
import { ActionTypes } from '@engine/GameEngine.js';

/**
 * Create a Scripted Driver instance.
 * @returns {object} Driver instance implementing DriverInterface
 */
export function createScriptedDriver() {
  return {
    selectBossAction,
    getNarrative,
    selectTarget: async (strategy, players) => selectTarget(strategy, players),
  };
}

/**
 * Auto-select a boss action based on current stage behavior tree.
 * @param {object} gameState
 * @param {object} blueprint
 * @returns {Promise<{ action: string, target: string|null, params: object }>}
 */
export async function selectBossAction(gameState, blueprint) {
  const { boss } = gameState;
  if (!boss) return { action: 'idle', target: null, params: {} };

  const stages = blueprint.enemies.boss.stages;
  const currentStage = stages[boss.currentStage];
  if (!currentStage) return { action: 'idle', target: null, params: {} };

  const roll = rollD20();
  return evaluateBehaviorTree(currentStage, gameState, roll.raw);
}

/**
 * Pull narrative text from blueprint for a given trigger event.
 * @param {string} trigger
 * @param {object} gameState
 * @param {object} blueprint
 * @returns {Promise<string>}
 */
export async function getNarrative(trigger, gameState, blueprint) {
  const narrative = blueprint.narrative || {};

  switch (trigger) {
    case 'intro':
      return narrative.intro || 'The hunt begins!';
    case 'victory':
      return narrative.victoryText || 'Victory!';
    case 'defeat':
      return narrative.defeatText || 'Defeat...';
    case 'boss_attack':
      return `${gameState.boss?.name || 'The boss'} attacks!`;
    case 'evolution': {
      const stageIndex = gameState.boss?.currentStage || 0;
      const keys = ['stage1to2', 'stage2to3', 'stage3to4', 'stage4toFinal'];
      const evoNarrative = narrative.bossEvolutionNarrative;
      return evoNarrative?.[keys[stageIndex - 1]] || `The boss evolves to stage ${stageIndex + 1}!`;
    }
    default:
      return '';
  }
}

/**
 * Map behavior tree action to GameEngine action type.
 * @param {object} bossAction - { action, target, params }
 * @returns {object} { type, payload }
 */
export function bossActionToDispatch(bossAction, roll) {
  const { action, target, params } = bossAction;

  switch (action) {
    case 'attack':
      return { type: ActionTypes.BOSS_ATTACK, payload: { targetId: target, roll } };
    case 'aoe_attack':
      return { type: ActionTypes.BOSS_AOE_ATTACK, payload: { roll } };
    case 'multi_attack':
      return { type: ActionTypes.BOSS_ATTACK, payload: { targetId: target, roll } };
    case 'burrow':
      return { type: ActionTypes.BOSS_BURROW, payload: {} };
    case 'grab':
      return { type: ActionTypes.BOSS_GRAB, payload: { targetId: target } };
    case 'dodge':
      return { type: ActionTypes.BOSS_DODGE, payload: {} };
    default:
      return { type: ActionTypes.BOSS_END_TURN, payload: {} };
  }
}
