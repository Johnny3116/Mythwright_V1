/**
 * EvolutionSystem — Boss stage transitions
 * Monitors HP thresholds and triggers evolution sequences.
 */

/**
 * Check whether the boss should evolve.
 *
 * @param {object} bossState - { hp, stage }
 * @param {object} blueprint - Full campaign blueprint
 * @returns {{ shouldEvolve: boolean, currentStage: number, nextStage: number|null }}
 */
export function checkEvolution(bossState, blueprint) {
  const stages = blueprint.enemies.boss.stages;
  const currentStageData = stages.find((s) => s.stage === bossState.stage);

  if (!currentStageData) return { shouldEvolve: false, currentStage: bossState.stage, nextStage: null };
  if (currentStageData.retreatThreshold === null || currentStageData.retreatThreshold === undefined) {
    return { shouldEvolve: false, currentStage: bossState.stage, nextStage: null };
  }

  const nextStageData = stages.find((s) => s.stage === bossState.stage + 1);
  const shouldEvolve = bossState.hp <= currentStageData.retreatThreshold;

  return {
    shouldEvolve,
    currentStage: bossState.stage,
    nextStage: shouldEvolve && nextStageData ? nextStageData.stage : null,
  };
}

/**
 * Transition the boss to its next stage.
 *
 * @param {object} bossState - Current boss state
 * @param {object} blueprint - Full campaign blueprint
 * @returns {{ newState: object, narrative: string, retreatZone: string|null }}
 */
export function evolve(bossState, blueprint) {
  const stages = blueprint.enemies.boss.stages;
  const nextStageData = stages.find((s) => s.stage === bossState.stage + 1);

  if (!nextStageData) {
    return { newState: bossState, narrative: 'No further evolution.', retreatZone: null };
  }

  const recoveredHp = Math.min(
    nextStageData.maxHp,
    nextStageData.maxHp * 0.5 + (nextStageData.retreatRecovery || 0),
  );

  const newState = {
    ...bossState,
    stage: nextStageData.stage,
    maxHp: nextStageData.maxHp,
    hp: Math.floor(recoveredHp),
    damage: nextStageData.damage,
    defense: nextStageData.defense,
    currentZoneId: nextStageData.behavior?.retreatZone ?? bossState.currentZoneId,
  };

  const narrative = getEvolutionNarrative(bossState.stage, blueprint.narrative);
  const retreatZone = nextStageData.behavior?.retreatZone ?? null;

  return { newState, narrative, retreatZone };
}

/**
 * Check if the boss is already in its final form.
 *
 * @param {object} bossState - { stage }
 * @param {object} blueprint
 * @returns {boolean}
 */
export function isFinalForm(bossState, blueprint) {
  const stages = blueprint.enemies.boss.stages;
  return bossState.stage === stages[stages.length - 1].stage;
}

/**
 * Get the narrative text for a stage transition.
 * @param {number} fromStage - The stage the boss is leaving (1-based)
 * @param {object} narrative - Blueprint narrative block
 * @returns {string}
 */
export function getEvolutionNarrative(fromStage, narrative) {
  const evoNarrative = narrative?.bossEvolutionNarrative;
  if (!evoNarrative) return `The boss evolves to stage ${fromStage + 1}!`;

  const keys = Object.keys(evoNarrative);
  // Keys are like "stage1to2", "stage2to3", etc.
  const expectedKey = `stage${fromStage}to${fromStage + 1}`;
  // Also try "stage4toFinal" style
  const finalKey = `stage${fromStage}toFinal`;

  return evoNarrative[expectedKey] || evoNarrative[finalKey] || `The boss evolves to stage ${fromStage + 1}!`;
}

// ─── Legacy functional API (kept for backwards compatibility) ─────────────────

/**
 * Check if the boss should evolve based on current HP and stage data.
 * @param {object} bossState - { hp, stage }
 * @param {object[]} stages - Blueprint stages array
 * @returns {{ shouldEvolve: boolean, nextStageIndex: number|null }}
 */
export function checkEvolutionThreshold(bossState, stages) {
  const currentStageData = stages.find((s) => s.stage === bossState.stage);
  if (!currentStageData || currentStageData.retreatThreshold == null) {
    return { shouldEvolve: false, nextStageIndex: null };
  }
  const shouldEvolve = bossState.hp <= currentStageData.retreatThreshold;
  const nextIdx = shouldEvolve ? stages.findIndex((s) => s.stage === bossState.stage + 1) : null;
  return { shouldEvolve, nextStageIndex: nextIdx === -1 ? null : nextIdx };
}

/**
 * Apply evolution to boss state.
 * @param {object} bossState
 * @param {object} nextStage - Blueprint stage data
 * @returns {object} Updated boss state
 */
export function applyEvolution(bossState, nextStage) {
  const recoveredHp = Math.min(
    nextStage.maxHp,
    Math.floor(nextStage.maxHp * 0.5 + (nextStage.retreatRecovery || 0)),
  );
  return {
    ...bossState,
    stage: nextStage.stage,
    maxHp: nextStage.maxHp,
    hp: recoveredHp,
    damage: nextStage.damage,
    defense: nextStage.defense,
    currentZoneId: nextStage.behavior?.retreatZone ?? bossState.currentZoneId,
  };
}
