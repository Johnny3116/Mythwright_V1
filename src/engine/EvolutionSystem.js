/**
 * EvolutionSystem — Boss stage transitions.
 * Monitors HP thresholds and applies evolution (stage advance + HP recovery).
 */

/**
 * Check whether the boss should evolve.
 * @param {{ hp:number, currentStage:number }} bossState
 * @param {object[]} stages  blueprint.enemies.boss.stages
 * @returns {{ shouldEvolve:boolean, nextStageIndex:number|null }}
 */
export function checkEvolutionThreshold(bossState, stages) {
  const currentStageIndex = bossState.currentStage - 1; // stages are 1-indexed
  const currentStage = stages[currentStageIndex];

  if (!currentStage || currentStage.retreatThreshold === null || currentStage.retreatThreshold === undefined) {
    return { shouldEvolve: false, nextStageIndex: null };
  }

  if (bossState.hp <= currentStage.retreatThreshold) {
    const nextIndex = currentStageIndex + 1;
    if (nextIndex < stages.length) {
      return { shouldEvolve: true, nextStageIndex: nextIndex };
    }
  }

  return { shouldEvolve: false, nextStageIndex: null };
}

/**
 * Apply evolution — transition boss to next stage with HP recovery and new stats.
 * @param {object} bossState   Current boss state
 * @param {object} nextStage   The next stage object from blueprint
 * @returns {object}  Updated boss state
 */
export function applyEvolution(bossState, nextStage) {
  const recoveredHp = Math.min(
    bossState.hp + (nextStage.retreatRecovery ?? 0),
    nextStage.maxHp
  );

  return {
    ...bossState,
    currentStage: nextStage.stage,
    name: nextStage.name,
    hp: recoveredHp,
    maxHp: nextStage.maxHp,
    damage: nextStage.damage,
    defense: nextStage.defense,
    zoneId: nextStage.behavior?.retreatZone ?? bossState.zoneId,
  };
}

/**
 * Get the narrative text for a stage transition.
 * @param {number} fromStage  1-based current stage
 * @param {object} narrative  blueprint.narrative
 * @returns {string}
 */
export function getEvolutionNarrative(fromStage, narrative) {
  const evNarrative = narrative?.bossEvolutionNarrative ?? {};
  // Keys are 'stage1to2', 'stage2to3', etc.
  const key = `stage${fromStage}to${fromStage === 4 ? 'Final' : fromStage + 1}`;
  return evNarrative[key] ?? `Stage ${fromStage} → ${fromStage + 1} evolution!`;
}

/**
 * Returns true when the boss is on its final (non-retreating) stage.
 * @param {object} bossState
 * @param {object[]} stages
 * @returns {boolean}
 */
export function isFinalForm(bossState, stages) {
  const idx = bossState.currentStage - 1;
  const stage = stages[idx];
  return stage?.retreatThreshold === null || stage?.retreatThreshold === undefined;
}
