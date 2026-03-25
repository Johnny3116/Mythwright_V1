/**
 * EvolutionSystem — Boss stage transitions
 * Monitors HP thresholds and triggers evolution sequences.
 */

/**
 * Check if the boss should evolve based on current HP and stage data.
 * @param {object} bossState - Current boss state { hp, currentStage }
 * @param {Array} stages - Blueprint enemies.boss.stages array
 * @returns {{ shouldEvolve: boolean, nextStageIndex: number|null }}
 */
export function checkEvolutionThreshold(bossState, stages) {
  const currentStageIndex = bossState.currentStage;
  const currentStage = stages[currentStageIndex];

  if (!currentStage) return { shouldEvolve: false, nextStageIndex: null };

  // Final stage never evolves
  if (currentStage.retreatThreshold === null) {
    return { shouldEvolve: false, nextStageIndex: null };
  }

  const nextStageIndex = currentStageIndex + 1;
  if (nextStageIndex >= stages.length) {
    return { shouldEvolve: false, nextStageIndex: null };
  }

  const shouldEvolve = bossState.hp <= currentStage.retreatThreshold;
  return {
    shouldEvolve,
    nextStageIndex: shouldEvolve ? nextStageIndex : null,
  };
}

/**
 * Apply evolution to boss state — transition to next stage, apply HP recovery.
 * @param {object} bossState
 * @param {object} nextStage - Blueprint stage data
 * @returns {object} Updated boss state
 */
export function applyEvolution(bossState, nextStage) {
  const recovery = nextStage.retreatRecovery || 0;
  const newHp = Math.min(nextStage.maxHp, bossState.hp + recovery);

  return {
    ...bossState,
    currentStage: bossState.currentStage + 1,
    hp: newHp,
    maxHp: nextStage.maxHp,
    damage: nextStage.damage,
    defense: nextStage.defense,
    zone: nextStage.behavior?.retreatZone || bossState.zone,
    statusEffects: [],
    hasActedThisTurn: false,
    isBurrowed: false,
  };
}

/**
 * Get the narrative text for a stage transition.
 * @param {number} stageIndex - The new stage index (0-based)
 * @param {object} narrative - Blueprint narrative block
 * @returns {string}
 */
export function getEvolutionNarrative(stageIndex, narrative) {
  const keys = ['stage1to2', 'stage2to3', 'stage3to4', 'stage4toFinal'];
  const evo = narrative?.bossEvolutionNarrative;
  if (!evo) return 'The boss evolves into a more powerful form!';
  const key = keys[stageIndex - 1];
  return evo[key] || `The boss evolves to stage ${stageIndex + 1}!`;
}

/**
 * Check if boss is at final stage.
 * @param {object} bossState
 * @param {Array} stages
 * @returns {boolean}
 */
export function isFinalStage(bossState, stages) {
  return bossState.currentStage >= stages.length - 1;
}
