/**
 * GameEngine — Core state machine, game loop, and orchestrator
 *
 * States: LOBBY → CHARACTER_SELECT → GAME_SETUP → TURN_LOOP → GAME_OVER
 *
 * This module integrates all other engine modules and exposes
 * a clean API consumed by GM drivers and the React context.
 */

import { loadBlueprint } from './BlueprintLoader.js';
import { rollD20, rollBetween, createRollHistory } from './DiceSystem.js';
import { resolveCombat } from './CombatResolver.js';
import { createEffectTracker, applyEffect, tickEffects } from './StatusEffects.js';
import { createTurnManager, TurnPhase } from './TurnManager.js';
import { selectBossAction, shouldBossRetreat, selectRetreatZone } from './BehaviorTree.js';
import { checkEvolution, evolve, isFinalForm } from './EvolutionSystem.js';
import { attemptSetTrap, getPlacedTraps, triggerTraps, getAvailableTraps } from './TrapSystem.js';
import { getZoneWildlife, resolveBossHunt, resolveWildlifeAttack, canPlayerIntervene } from './WildlifeSystem.js';
import { spawnFlora, relocateFlora, searchForPlant, applyPlantHealing } from './FloraSystem.js';
import { resolveRetreat, getRetreatModifier, canRetreatFromZone } from './RetreatSystem.js';

// ─── State Machine Constants ───────────────────────────────────────────────────

export const GameState = {
  LOBBY: 'LOBBY',
  CHARACTER_SELECT: 'CHARACTER_SELECT',
  GAME_SETUP: 'GAME_SETUP',
  TURN_LOOP: 'TURN_LOOP',
  GAME_OVER: 'GAME_OVER',
};

export { TurnPhase };

// ─── Win Condition Checker (pure function) ─────────────────────────────────────

/**
 * Check win/lose conditions against the current state.
 *
 * @param {object} state - Full game state
 * @param {object} blueprint - Campaign blueprint
 * @returns {{ over: boolean, winner: 'players'|'boss'|null, condition: string|null }}
 */
export function checkWinConditions(state, blueprint) {
  const players = Object.values(state.players);
  const allDead = players.length > 0 && players.every((p) => p.hp <= 0);

  // Check lose conditions
  for (const cond of blueprint.loseConditions) {
    if (cond.type === 'allPlayersDead' && allDead) {
      return { over: true, winner: 'boss', condition: 'allPlayersDead' };
    }
    if (cond.type === 'bossReachesFinalForm' && !cond.optional) {
      // Only lose if boss reached final form and optional is false — but normally winning kills the boss at final form
      // This condition is checked separately when boss evolves to final form without being defeated
    }
  }

  // Check win conditions
  for (const cond of blueprint.winConditions) {
    if (cond.type === 'bossDefeated') {
      const bossAtFinalStage = state.boss.stage === cond.stage;
      const bossDefeated = state.boss.hp <= 0;
      if (bossAtFinalStage && bossDefeated) {
        return { over: true, winner: 'players', condition: 'bossDefeated' };
      }
    }
  }

  return { over: false, winner: null, condition: null };
}

// ─── Initial State Builder (pure function) ─────────────────────────────────────

/**
 * Create the initial game state from a parsed blueprint.
 * @param {object} blueprint - Parsed campaign blueprint
 * @returns {object} Fully initialized game state
 */
export function createInitialState(blueprint) {
  const firstStage = blueprint.enemies.boss.stages[0];
  const startingZone = blueprint.zones[0];

  return {
    gameState: GameState.LOBBY,
    phase: TurnPhase.PLAYER_TURN,
    round: 1,
    players: {},
    boss: {
      id: blueprint.enemies.boss.id,
      name: blueprint.enemies.boss.name,
      stage: firstStage.stage,
      maxHp: firstStage.maxHp,
      hp: firstStage.maxHp,
      damage: firstStage.damage,
      defense: firstStage.defense,
      currentZoneId: startingZone.id,
      effects: [],
      damageReceived: 0,
    },
    zones: Object.fromEntries(
      blueprint.zones.map((z) => [z.id, { ...z, traps: [], flora: null }])
    ),
    traps: Object.fromEntries(blueprint.zones.map((z) => [z.id, []])),
    flora: {},
    turnOrder: [],
    log: [],
    winResult: null,
  };
}

// ─── Game State Reducer (pure function) ───────────────────────────────────────

/**
 * Main state reducer — pure function for use with React's useReducer.
 * @param {object} state - Current game state
 * @param {object} action - { type, payload }
 * @returns {object} New game state
 */
export function gameReducer(state, action) {
  switch (action.type) {
    case 'TRANSITION':
      return { ...state, gameState: action.payload.to };

    case 'ADD_PLAYER': {
      const { player } = action.payload;
      return {
        ...state,
        players: { ...state.players, [player.id]: player },
        turnOrder: [...state.turnOrder, player.id],
      };
    }

    case 'REMOVE_PLAYER': {
      const { playerId } = action.payload;
      const newPlayers = { ...state.players };
      delete newPlayers[playerId];
      return {
        ...state,
        players: newPlayers,
        turnOrder: state.turnOrder.filter((id) => id !== playerId),
      };
    }

    case 'PLAYER_DAMAGE': {
      const { playerId, amount } = action.payload;
      const player = state.players[playerId];
      if (!player) return state;
      return {
        ...state,
        players: {
          ...state.players,
          [playerId]: { ...player, hp: Math.max(0, player.hp - amount) },
        },
      };
    }

    case 'PLAYER_HEAL': {
      const { playerId, amount } = action.payload;
      const player = state.players[playerId];
      if (!player) return state;
      return {
        ...state,
        players: {
          ...state.players,
          [playerId]: { ...player, hp: Math.min(player.maxHp, player.hp + amount) },
        },
      };
    }

    case 'BOSS_DAMAGE': {
      const { amount } = action.payload;
      return {
        ...state,
        boss: {
          ...state.boss,
          hp: Math.max(0, state.boss.hp - amount),
          damageReceived: (state.boss.damageReceived || 0) + amount,
        },
      };
    }

    case 'BOSS_HEAL': {
      const { amount } = action.payload;
      return {
        ...state,
        boss: { ...state.boss, hp: Math.min(state.boss.maxHp, state.boss.hp + amount) },
      };
    }

    case 'BOSS_EVOLVE': {
      const { newBossState } = action.payload;
      return { ...state, boss: newBossState };
    }

    case 'BOSS_MOVE': {
      const { zoneId } = action.payload;
      return { ...state, boss: { ...state.boss, currentZoneId: zoneId } };
    }

    case 'PLAYER_MOVE': {
      const { playerId, zoneId } = action.payload;
      const player = state.players[playerId];
      if (!player) return state;
      return {
        ...state,
        players: { ...state.players, [playerId]: { ...player, currentZoneId: zoneId } },
      };
    }

    case 'ADD_TRAP': {
      const { zoneId, trap } = action.payload;
      const zoneTraps = [...(state.traps[zoneId] || []), trap];
      return { ...state, traps: { ...state.traps, [zoneId]: zoneTraps } };
    }

    case 'DEACTIVATE_TRAP': {
      const { zoneId, trapId } = action.payload;
      const zoneTraps = (state.traps[zoneId] || []).map((t) =>
        t.id === trapId ? { ...t, active: false } : t
      );
      return { ...state, traps: { ...state.traps, [zoneId]: zoneTraps } };
    }

    case 'SET_FLORA': {
      return { ...state, flora: action.payload.flora };
    }

    case 'COLLECT_FLORA': {
      const { zoneId } = action.payload;
      return {
        ...state,
        flora: { ...state.flora, [zoneId]: state.flora[zoneId] ? { ...state.flora[zoneId], collected: true } : null },
      };
    }

    case 'APPLY_EFFECT': {
      const { entityId, effect } = action.payload;
      if (entityId === 'boss') {
        return { ...state, boss: applyEffect(state.boss, effect) };
      }
      const player = state.players[entityId];
      if (!player) return state;
      return { ...state, players: { ...state.players, [entityId]: applyEffect(player, effect) } };
    }

    case 'SET_PHASE': {
      return { ...state, phase: action.payload.phase };
    }

    case 'INCREMENT_ROUND': {
      return { ...state, round: state.round + 1 };
    }

    case 'SET_TURN_ORDER': {
      return { ...state, turnOrder: action.payload.order };
    }

    case 'LOG': {
      return { ...state, log: [...state.log, { round: state.round, ...action.payload }] };
    }

    case 'SET_WIN_RESULT': {
      return { ...state, winResult: action.payload, gameState: GameState.GAME_OVER };
    }

    default:
      return state;
  }
}

// ─── Game Engine Factory ───────────────────────────────────────────────────────

/**
 * Create a full game engine instance that orchestrates all modules.
 *
 * @param {object} blueprint - Validated campaign blueprint
 * @returns {object} Game engine instance
 */
export function createGameEngine(blueprint) {
  let state = createInitialState(blueprint);
  let turnManager = null;
  let rollHistory = createRollHistory();
  const effectTracker = createEffectTracker();

  // Simple pub/sub event system
  const listeners = {};

  function emit(eventName, data) {
    (listeners[eventName] || []).forEach((cb) => cb(data));
  }

  function dispatch(action) {
    state = gameReducer(state, action);
    emit('stateChange', state);
  }

  function log(message, data = {}) {
    dispatch({ type: 'LOG', payload: { message, ...data } });
    emit('narrativeUpdate', { message });
  }

  // ─── State Management ────────────────────────────────────────────────────────

  function getState() {
    return JSON.parse(JSON.stringify(state));
  }

  function loadState(savedState) {
    state = JSON.parse(JSON.stringify(savedState));
    if (state.gameState === GameState.TURN_LOOP && state.turnOrder.length > 0) {
      turnManager = createTurnManager(state.turnOrder, state.boss.id);
    }
    emit('stateChange', state);
  }

  function serialize() {
    return JSON.stringify({ state, rollHistory: rollHistory.serialize() });
  }

  // ─── Game Flow ───────────────────────────────────────────────────────────────

  function initializeGame(players) {
    // players: [{ id, name, classId }]
    const blueprintClasses = blueprint.classes;

    for (const p of players) {
      const cls = blueprintClasses.find((c) => c.id === p.classId) || blueprintClasses[0];
      const playerState = {
        id: p.id,
        name: p.name,
        classId: cls.id,
        className: cls.name,
        icon: cls.icon,
        hp: cls.baseStats.hp,
        maxHp: cls.baseStats.hp,
        damage: cls.baseStats.damage,
        defense: cls.baseStats.defense,
        specialAbility: cls.specialAbility,
        currentZoneId: blueprint.zones[0].id,
        effects: [],
        inventory: [],
        damageDealt: 0,
        consecutiveHits: 0,
        hasActedThisTurn: false,
      };
      dispatch({ type: 'ADD_PLAYER', payload: { player: playerState } });
    }

    dispatch({ type: 'TRANSITION', payload: { to: GameState.GAME_SETUP } });
    emit('stateChange', state);
  }

  function startGame() {
    if (state.gameState !== GameState.GAME_SETUP) return;

    // Initialize flora
    const flora = spawnFlora(blueprint.zones, blueprint.systems.flora.plants, 1);
    dispatch({ type: 'SET_FLORA', payload: { flora } });

    // Set up turn manager
    const playerIds = Object.keys(state.players);
    turnManager = createTurnManager(playerIds, state.boss.id);

    dispatch({ type: 'TRANSITION', payload: { to: GameState.TURN_LOOP } });
    dispatch({ type: 'SET_PHASE', payload: { phase: TurnPhase.PLAYER_TURN } });
    emit('turnStart', getCurrentTurn());
    log('The hunt begins!');
  }

  // ─── Player Actions ──────────────────────────────────────────────────────────

  function playerAttack(playerId, targetId) {
    const player = state.players[playerId];
    if (!player || player.hp <= 0) return null;

    const roll = rollD20();
    rollHistory.add(roll);
    emit('diceRoll', roll);

    const settings = blueprint.settings;
    const attacker = { damage: player.damage, modifiers: {} };

    // Apply damageMultiplier effect if present
    const dmMod = player.effects.find((e) => e.type === 'damageMultiplier');
    if (dmMod) attacker.modifiers.multiplier = dmMod.value;

    const defender = { defense: state.boss.defense, statusEffects: state.boss.effects };
    const result = resolveCombat(attacker, defender, roll, settings);

    if (result.hit) {
      dispatch({ type: 'BOSS_DAMAGE', payload: { amount: result.damageDealt } });

      // Track consecutive hits for special abilities
      const newConsecutiveHits = player.consecutiveHits + 1;
      const updatedPlayer = { ...player, consecutiveHits: newConsecutiveHits, damageDealt: player.damageDealt + result.damageDealt };
      dispatch({ type: 'REMOVE_PLAYER', payload: { playerId } });
      dispatch({ type: 'ADD_PLAYER', payload: { player: updatedPlayer } });

      emit('combat', { type: 'playerAttack', playerId, result });
      log(result.narrative, { playerId, result });

      // Check evolution
      _checkAndHandleEvolution();
    } else {
      log('The attack misses!', { playerId });
    }

    _checkWinLose();
    return result;
  }

  function playerUseAbility(playerId, targetId) {
    const player = state.players[playerId];
    if (!player || !player.specialAbility) return null;

    const ability = player.specialAbility;
    const effect = { ...ability.effect, source: `${playerId}-ability` };

    // Apply to target (boss or ally)
    const targetEntityId = targetId || 'boss';
    dispatch({ type: 'APPLY_EFFECT', payload: { entityId: targetEntityId, effect } });

    log(`${player.name} uses ${ability.name}!`);
    emit('stateChange', state);
    return { ability, effect };
  }

  function playerSetTrap(playerId, trapTypeId) {
    const player = state.players[playerId];
    if (!player) return null;

    const trapTypes = getAvailableTraps(blueprint);
    const trapType = trapTypes.find((t) => t.id === trapTypeId);
    if (!trapType) return { success: false, message: 'Unknown trap type.' };

    const roll = rollD20();
    rollHistory.add(roll);
    emit('diceRoll', roll);

    const zoneData = blueprint.zones.find((z) => z.id === player.currentZoneId);
    const result = attemptSetTrap(trapType, roll, zoneData);

    if (result.success) {
      const trap = { ...result.trapPlaced, zoneId: player.currentZoneId, placedRound: state.round };
      dispatch({ type: 'ADD_TRAP', payload: { zoneId: player.currentZoneId, trap } });
      log(`${player.name} placed a ${trapType.name} in ${zoneData?.name}!`);
    } else {
      log(`${player.name} failed to place the ${trapType.name}.`);
    }

    return result;
  }

  function playerMove(playerId, targetZoneId) {
    const player = state.players[playerId];
    if (!player) return false;

    const currentZone = blueprint.zones.find((z) => z.id === player.currentZoneId);
    if (!currentZone?.connectedZones?.includes(targetZoneId)) {
      return false;
    }

    dispatch({ type: 'PLAYER_MOVE', payload: { playerId, zoneId: targetZoneId } });
    log(`${player.name} moves to ${targetZoneId}.`);
    return true;
  }

  function playerRetreat(playerId) {
    const player = state.players[playerId];
    if (!player) return null;

    if (!canRetreatFromZone(blueprint, player.currentZoneId)) {
      return { outcome: 'blocked', narrative: 'You cannot retreat from this zone!' };
    }

    const roll = rollD20();
    rollHistory.add(roll);
    emit('diceRoll', roll);

    const modifier = getRetreatModifier(blueprint, player.currentZoneId) ?? 0;
    const result = resolveRetreat(roll, modifier, blueprint.systems.retreat.outcomes);

    if (result.outcome === 'success' || result.outcome === 'perfect') {
      const currentZone = blueprint.zones.find((z) => z.id === player.currentZoneId);
      const newZoneId = currentZone?.connectedZones?.[0];
      if (newZoneId) {
        dispatch({ type: 'PLAYER_MOVE', payload: { playerId, zoneId: newZoneId } });
      }
      if (result.outcome === 'perfect') {
        dispatch({ type: 'PLAYER_HEAL', payload: { playerId, amount: 10 } });
      }
    }

    log(result.narrative);
    return result;
  }

  function playerSearchFlora(playerId) {
    const player = state.players[playerId];
    if (!player) return null;

    if (!blueprint.systems.flora.enabled) return { found: false, narrative: 'Flora system is disabled.' };

    const roll = rollD20();
    rollHistory.add(roll);
    emit('diceRoll', roll);

    const result = searchForPlant(player.currentZoneId, state.flora, roll, blueprint.systems.flora.searchRolls);
    emit('floraEvent', result);

    if (result.found) {
      const healing = applyPlantHealing(result.plant, player, result.supercharged);
      dispatch({ type: 'PLAYER_HEAL', payload: { playerId, amount: healing.hpRestored } });
      dispatch({ type: 'COLLECT_FLORA', payload: { zoneId: player.currentZoneId } });

      for (const effect of healing.effectsApplied) {
        dispatch({ type: 'APPLY_EFFECT', payload: { entityId: playerId, effect } });
      }

      log(healing.narrative);
      return { found: true, ...healing };
    }

    log('No healing plants found in this area.');
    return { found: false };
  }

  function playerUseItem(playerId, itemId) {
    // Placeholder — item system to be expanded in Phase 5
    log(`${playerId} uses item ${itemId}.`);
    return null;
  }

  // ─── Boss Actions ────────────────────────────────────────────────────────────

  function executeBossTurn() {
    if (state.boss.hp <= 0) return null;

    const roll = rollD20();
    rollHistory.add(roll);
    emit('diceRoll', roll);

    const stageData = blueprint.enemies.boss.stages.find((s) => s.stage === state.boss.stage);
    const livePlayers = Object.values(state.players).filter((p) => p.hp > 0);

    const action = selectBossAction(state.boss, livePlayers, state.boss.currentZoneId, roll, stageData);
    emit('combat', { type: 'bossAction', action });

    const bossSettings = {
      hitRanges: blueprint.enemies.boss.hitRanges,
      critMultiplier: blueprint.settings.critMultiplier,
      lethalStrikeBonus: blueprint.enemies.boss.lethalStrikeBonus || 0,
    };

    function _applyBossAttack(targetId, damage) {
      const target = state.players[targetId];
      if (!target || target.hp <= 0) return;

      const attackRoll = rollD20();
      rollHistory.add(attackRoll);
      const bossAttacker = { damage: stageData.damage };
      const playerDefender = { defense: target.defense, statusEffects: target.effects };
      const combatResult = resolveCombat(bossAttacker, playerDefender, attackRoll, bossSettings);

      if (combatResult.hit) {
        dispatch({ type: 'PLAYER_DAMAGE', payload: { playerId: targetId, amount: combatResult.damageDealt } });
        log(combatResult.narrative);
        emit('combat', { type: 'bossAttack', targetId, result: combatResult });

        if (state.players[targetId]?.hp <= 0) {
          emit('playerDeath', { playerId: targetId });
          turnManager?.removeEntity(targetId);
          log(`${target.name} has fallen!`);
        }
      }
    }

    if (action.action === 'attack' || action.action === 'grab') {
      _applyBossAttack(action.target, action.damage);
      for (const effect of (action.effects || [])) {
        dispatch({ type: 'APPLY_EFFECT', payload: { entityId: action.target, effect } });
      }
      if (action.additionalAttacks) {
        for (const extra of action.additionalAttacks) {
          _applyBossAttack(extra.target, extra.damage);
        }
      }
    } else if (action.action === 'aoe_attack') {
      for (const p of livePlayers) {
        _applyBossAttack(p.id, action.damage);
      }
    } else if (action.action === 'dodge' || action.action === 'burrow') {
      for (const effect of (action.effects || [])) {
        dispatch({ type: 'APPLY_EFFECT', payload: { entityId: 'boss', effect } });
      }
      log(action.narrative);
    }

    // Check retreat/evolution after boss attacks
    _checkAndHandleEvolution();
    _checkWinLose();

    return action;
  }

  function executeEnvironmentPhase() {
    emit('stateChange', state);
    const currentRound = state.round;

    // Tick status effects for all entities
    for (const playerId of Object.keys(state.players)) {
      const player = state.players[playerId];
      if (player.hp <= 0) continue;
      const { entityState: updatedPlayer, damageDealt } = tickEffects(player);
      if (damageDealt > 0) {
        dispatch({ type: 'PLAYER_DAMAGE', payload: { playerId, amount: damageDealt } });
      }
      // Update player with new effects
      dispatch({ type: 'APPLY_EFFECT', payload: { entityId: playerId, effect: { type: '_sync', duration: 0 } } });
    }

    // Wildlife events for boss zone
    if (blueprint.systems.wildlife.enabled) {
      const wildlife = getZoneWildlife(blueprint, state.boss.currentZoneId);
      if (wildlife) {
        const huntRoll = rollD20();
        rollHistory.add(huntRoll);
        const huntResult = resolveBossHunt(wildlife, huntRoll, blueprint.systems.wildlife.bossHuntRolls);

        if (huntResult.outcome !== 'fail') {
          for (const buff of huntResult.buffsGained) {
            if (buff.type === 'hpRestore') {
              dispatch({ type: 'BOSS_HEAL', payload: { amount: buff.value } });
            } else {
              dispatch({ type: 'APPLY_EFFECT', payload: { entityId: 'boss', effect: buff } });
            }
          }
          log(huntResult.narrative);
          emit('wildlifeEvent', huntResult);
        }
      }
    }

    // Check trap triggers (boss may have moved)
    if (blueprint.systems.traps.enabled) {
      const trapResult = triggerTraps(state.boss.currentZoneId, state.boss, state, rollD20);
      for (const r of trapResult.results) {
        if (!r.escaped && r.damage > 0) {
          dispatch({ type: 'BOSS_DAMAGE', payload: { amount: r.damage } });
          log(`Trap triggered! Boss takes ${r.damage} damage.`);
          emit('trapTriggered', r);
        }
        dispatch({ type: 'DEACTIVATE_TRAP', payload: { zoneId: state.boss.currentZoneId, trapId: r.trap.id } });
      }
    }

    // Flora relocation
    if (blueprint.systems.flora.enabled) {
      const newFlora = relocateFlora(state.flora, blueprint.zones, currentRound, blueprint.systems.flora.respawnInterval);
      dispatch({ type: 'SET_FLORA', payload: { flora: newFlora } });
      emit('floraEvent', { type: 'relocate', round: currentRound });
    }

    // Increment round
    dispatch({ type: 'INCREMENT_ROUND' });
    emit('stateChange', state);
    _checkWinLose();
  }

  // ─── GM Override API ─────────────────────────────────────────────────────────

  let _overrideDiceValue = null;

  function overrideDiceRoll(value) {
    _overrideDiceValue = value;
  }

  function setBossTarget(playerId) {
    // Stored for use in next boss turn
    state._forcedBossTarget = playerId;
  }

  function triggerEvolution() {
    if (!isFinalForm(state.boss, blueprint)) {
      const { newState, narrative, retreatZone } = evolve(state.boss, blueprint);
      dispatch({ type: 'BOSS_EVOLVE', payload: { newBossState: newState } });
      if (retreatZone) dispatch({ type: 'BOSS_MOVE', payload: { zoneId: retreatZone } });
      log(narrative);
      emit('evolution', { newStage: newState.stage, narrative });
      emit('bossPhaseChange', { stage: newState.stage });
    }
  }

  function advanceStory() {
    const round = state.round;
    log(`Story advances to round ${round}.`);
    emit('narrativeUpdate', { round });
  }

  // ─── Query API ───────────────────────────────────────────────────────────────

  function getAvailableActions(playerId) {
    const player = state.players[playerId];
    if (!player || player.hp <= 0) return [];

    const actions = ['attack', 'useAbility', 'searchFlora', 'retreat', 'move'];

    if (blueprint.systems.traps.enabled) {
      actions.push('setTrap');
    }

    // Check immobilize
    if (player.effects?.some((e) => e.type === 'immobilize')) {
      return []; // Cannot act
    }

    return actions;
  }

  function getCurrentTurn() {
    if (!turnManager) return { entity: null, phase: state.phase, round: state.round };
    return {
      entity: turnManager.getCurrentEntity(),
      phase: turnManager.getPhase(),
      round: turnManager.getRound(),
    };
  }

  function getWinLoseStatus() {
    if (state.gameState === GameState.GAME_OVER) return state.winResult?.winner === 'players' ? 'won' : 'lost';
    return 'playing';
  }

  // ─── Pub/Sub ─────────────────────────────────────────────────────────────────

  function on(eventName, callback) {
    if (!listeners[eventName]) listeners[eventName] = [];
    listeners[eventName].push(callback);
    return () => {
      listeners[eventName] = listeners[eventName].filter((cb) => cb !== callback);
    };
  }

  // ─── Internal Helpers ─────────────────────────────────────────────────────────

  function _checkAndHandleEvolution() {
    const { shouldEvolve } = checkEvolution(state.boss, blueprint);
    if (shouldEvolve) {
      triggerEvolution();
    }
  }

  function _checkWinLose() {
    const result = checkWinConditions(state, blueprint);
    if (result.over) {
      dispatch({ type: 'SET_WIN_RESULT', payload: result });
      emit('gameOver', result);
    }
  }

  return {
    // State management
    getState,
    loadState,
    serialize,

    // Game flow
    initializeGame,
    startGame,

    // Player actions
    playerAttack,
    playerUseAbility,
    playerSetTrap,
    playerMove,
    playerRetreat,
    playerSearchFlora,
    playerUseItem,

    // Boss actions
    executeBossTurn,
    executeEnvironmentPhase,

    // GM overrides
    overrideDiceRoll,
    setBossTarget,
    triggerEvolution,
    advanceStory,

    // Queries
    getAvailableActions,
    getCurrentTurn,
    getWinLoseStatus,

    // Events
    on,
  };
}
