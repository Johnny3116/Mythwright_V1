/**
 * BehaviorTree — Monster AI state machine.
 * Reads stage data from blueprint and resolves boss actions deterministically.
 */

/**
 * Evaluate the boss behavior tree for the current stage and return an action.
 *
 * @param {object} bossStage  Stage data from blueprint (e.g. stages[0])
 * @param {object} gameState  Current game state { players:[], boss:{} }
 * @param {number} roll       D20 roll (1–20) for behaviour selection
 * @returns {{ action:string, target:string|null, params:object }}
 */
export function evaluateBehaviorTree(bossStage, gameState, roll) {
  const { behavior } = bossStage;
  const alivePlayers = (gameState.players ?? []).filter(p => (p.hp ?? 0) > 0 && p.isAlive !== false);

  // Each chance is a fraction of 20 faces
  // Dodge (stage 1)
  if (behavior.dodgeChance && roll <= Math.floor(behavior.dodgeChance * 20)) {
    return { action: 'dodge', target: null, params: {} };
  }

  // Burrow (stage 2)
  if (behavior.burrowChance && roll <= Math.floor(behavior.burrowChance * 20)) {
    return { action: 'burrow', target: null, params: {} };
  }

  // Grab (stage 3)
  if (behavior.grabChance && roll <= Math.floor(behavior.grabChance * 20)) {
    const target = selectTarget('random', alivePlayers);
    return { action: 'grab', target: target?.id ?? null, params: { disabledTurns: 1 } };
  }

  // AOE (stage 5 — Final Form)
  if (behavior.aoeAttack) {
    return {
      action: 'aoe_attack',
      target: 'all',
      params: { extraAttacks: behavior.extraAttacks ?? 0 },
    };
  }

  // Default single attack (with extra attacks for stage 4)
  const target = selectTarget('random', alivePlayers);
  return {
    action: 'attack',
    target: target?.id ?? null,
    params: { extraAttacks: behavior.extraAttacks ?? 0 },
  };
}

/**
 * Select a target from alive players using the given strategy.
 *
 * @param {'random'|'lowest_hp'|'lowest-hp'|'highest_threat'|'highest-damage-dealt'} strategy
 * @param {object[]} players  Array of player states with `id`, `hp`, `damageDealt` fields
 * @returns {object|null}
 */
export function selectTarget(strategy, players) {
  const alive = players.filter(p => (p.hp ?? 0) > 0 && p.isAlive !== false);
  if (alive.length === 0) return null;

  if (strategy === 'lowest_hp' || strategy === 'lowest-hp') {
    return alive.reduce((min, p) => (p.hp < min.hp ? p : min));
  }

  if (strategy === 'highest_threat' || strategy === 'highest-damage-dealt') {
    return alive.reduce((max, p) =>
      ((p.damageDealt ?? 0) > (max.damageDealt ?? 0) ? p : max)
    );
  }

  // Default: random (crypto-safe)
  const buf = new Uint8Array(1);
  crypto.getRandomValues(buf);
  return alive[buf[0] % alive.length];
}

/**
 * Determine whether the boss should retreat based on its HP and stage data.
 * @param {object} bossState  { hp:number, currentStage:number }
 * @param {object} bossStage  Current stage data (with retreatThreshold)
 * @returns {boolean}
 */
export function shouldBossRetreat(bossState, bossStage) {
  if (bossStage.retreatThreshold === null || bossStage.retreatThreshold === undefined) {
    return false; // Final form never retreats
  }
  return bossState.hp <= bossStage.retreatThreshold;
}

/**
 * Get the retreat zone ID for a given stage.
 * @param {object} bossStage
 * @returns {string|null}
 */
export function getRetreatZone(bossStage) {
  return bossStage.behavior?.retreatZone ?? null;
}
