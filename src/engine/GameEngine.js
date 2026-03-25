/**
 * GameEngine — Core state machine and game loop.
 *
 * States: LOBBY → CHARACTER_SELECT → GAME_SETUP → TURN_LOOP → GAME_OVER
 */

import { resolveCombat } from './CombatResolver.js';
import { initializeTurnOrder, advanceTurn, getActiveEntity, skipDeadPlayers, TurnPhase } from './TurnManager.js';
import { evaluateBehaviorTree } from './BehaviorTree.js';
import { checkEvolutionThreshold, applyEvolution } from './EvolutionSystem.js';

export const GameState = {
  LOBBY: 'LOBBY',
  CHARACTER_SELECT: 'CHARACTER_SELECT',
  GAME_SETUP: 'GAME_SETUP',
  TURN_LOOP: 'TURN_LOOP',
  GAME_OVER: 'GAME_OVER',
};

export { TurnPhase };

// ---------------------------------------------------------------------------
// State factory
// ---------------------------------------------------------------------------

/**
 * Build the blank initial state from a parsed blueprint.
 * @param {object} blueprint
 * @returns {object}
 */
export function createInitialState(blueprint) {
  return {
    phase: GameState.LOBBY,
    players: [],
    boss: null,
    turnState: null,
    traps: [],
    floraState: {},
    narrative: [],
    gameOver: null,
    round: 0,
    // Keep a reference to the blueprint ID so saves can detect mismatches
    campaignId: blueprint?.meta?.title ?? 'unknown',
  };
}

// ---------------------------------------------------------------------------
// Available actions
// ---------------------------------------------------------------------------

function getAvailableActions(state, playerId) {
  if (state.phase !== GameState.TURN_LOOP) return [];
  const active = getActiveEntity(state.turnState);
  if (active !== playerId) return [];
  const player = state.players.find(p => p.id === playerId);
  if (!player || !player.isAlive) return [];
  return ['attack', 'move', 'set_trap', 'search_flora', 'use_ability', 'retreat'];
}

// ---------------------------------------------------------------------------
// Win / lose condition checker
// ---------------------------------------------------------------------------

/**
 * @param {object} state
 * @param {object} blueprint
 * @returns {{ over:boolean, winner:'players'|'boss'|null, condition:string|null }}
 */
export function checkWinConditions(state, blueprint) {
  // Lose: all players dead
  if (state.players.length > 0 && state.players.every(p => !p.isAlive)) {
    return { over: true, winner: 'boss', condition: 'allPlayersDead' };
  }

  // Win: boss defeated at required stage
  for (const cond of blueprint?.winConditions ?? []) {
    if (cond.type === 'bossDefeated') {
      const reqStage = cond.stage ?? (blueprint.enemies?.boss?.stages?.length ?? 1);
      if (state.boss && state.boss.hp <= 0 && state.boss.currentStage >= reqStage) {
        return { over: true, winner: 'players', condition: 'bossDefeated' };
      }
    }
  }

  return { over: false, winner: null, condition: null };
}

// ---------------------------------------------------------------------------
// Pure reducer
// ---------------------------------------------------------------------------

/**
 * Pure state reducer — returns new state without mutating input.
 * @param {object} state
 * @param {{ type:string, payload?:object }} action
 * @param {object} blueprint
 * @returns {object}
 */
export function gameReducer(state, action, blueprint) {
  switch (action.type) {
    // ------------------------------------------------------------------
    case 'INIT_GAME':
      return { ...state, phase: GameState.CHARACTER_SELECT };

    // ------------------------------------------------------------------
    case 'START_GAME': {
      const rawPlayers = action.payload?.players ?? state.players;
      const stage0 = blueprint.enemies.boss.stages[0];

      const players = rawPlayers.map(p => {
        const cls = (blueprint.classes ?? []).find(c => c.id === p.classId) ?? blueprint.classes[0];
        return {
          id: p.id,
          name: p.name ?? p.id,
          classId: cls.id,
          hp: cls.baseStats.hp,
          maxHp: cls.baseStats.hp,
          damage: cls.baseStats.damage,
          defense: cls.baseStats.defense,
          zoneId: 'verdant-maw',
          statusEffects: [],
          damageDealt: 0,
          isAlive: true,
        };
      });

      const boss = {
        id: blueprint.enemies.boss.id,
        name: stage0.name,
        hp: stage0.maxHp,
        maxHp: stage0.maxHp,
        currentStage: 1,
        zoneId: 'verdant-maw',
        damage: stage0.damage,
        defense: stage0.defense,
        statusEffects: [],
      };

      return {
        ...state,
        phase: GameState.TURN_LOOP,
        players,
        boss,
        turnState: initializeTurnOrder(players),
        round: 1,
        narrative: [...state.narrative, 'The hunt begins!'],
      };
    }

    // ------------------------------------------------------------------
    case 'PLAYER_ATTACK': {
      const { playerId, roll, damageSeed } = action.payload ?? {};
      const active = getActiveEntity(state.turnState);
      if (active !== playerId) return state; // out-of-turn — reject

      const player = state.players.find(p => p.id === playerId);
      if (!player?.isAlive) return state;

      const result = resolveCombat(
        { damage: player.damage, statusEffects: player.statusEffects },
        { defense: state.boss.defense, statusEffects: state.boss.statusEffects },
        roll,
        blueprint.settings
      );

      // Optionally override damage seed for reproducibility in tests
      const actualDamage = damageSeed !== undefined
        ? Math.max(0, damageSeed - (state.boss.defense ?? 0))
        : result.damageDealt;

      const newBossHp = Math.max(0, state.boss.hp - (damageSeed !== undefined ? actualDamage : result.damageDealt));

      let newBoss = { ...state.boss, hp: newBossHp };

      // Check evolution
      const evo = checkEvolutionThreshold(newBoss, blueprint.enemies.boss.stages);
      if (evo.shouldEvolve) {
        newBoss = applyEvolution(newBoss, blueprint.enemies.boss.stages[evo.nextStageIndex]);
      }

      const newPlayers = state.players.map(p =>
        p.id === playerId ? { ...p, damageDealt: p.damageDealt + result.damageDealt } : p
      );

      return {
        ...state,
        players: newPlayers,
        boss: newBoss,
        narrative: [...state.narrative, result.narrative],
      };
    }

    // ------------------------------------------------------------------
    case 'PLAYER_MOVE': {
      const { playerId, zoneId } = action.payload ?? {};
      const newPlayers = state.players.map(p =>
        p.id === playerId ? { ...p, zoneId } : p
      );
      return { ...state, players: newPlayers };
    }

    // ------------------------------------------------------------------
    case 'BOSS_TURN': {
      const { roll } = action.payload ?? {};
      const stageIdx = state.boss.currentStage - 1;
      const bossStage = blueprint.enemies.boss.stages[stageIdx];
      const bossAction = evaluateBehaviorTree(bossStage, state, roll);

      if (bossAction.action === 'dodge' || bossAction.action === 'burrow') {
        return { ...state, narrative: [...state.narrative, `Boss uses ${bossAction.action}!`] };
      }

      const targets = bossAction.target === 'all'
        ? state.players.filter(p => p.isAlive)
        : state.players.filter(p => p.id === bossAction.target && p.isAlive);

      if (targets.length === 0) return state;

      let newPlayers = state.players;
      const narrativeParts = [];

      targets.forEach(target => {
        const result = resolveCombat(
          { damage: state.boss.damage, statusEffects: state.boss.statusEffects },
          { defense: target.defense, statusEffects: target.statusEffects },
          roll,
          blueprint.settings
        );
        const newHp = Math.max(0, target.hp - result.damageDealt);
        newPlayers = newPlayers.map(p =>
          p.id === target.id ? { ...p, hp: newHp, isAlive: newHp > 0 } : p
        );
        narrativeParts.push(`${target.name}: ${result.narrative}`);
      });

      return { ...state, players: newPlayers, narrative: [...state.narrative, ...narrativeParts] };
    }

    // ------------------------------------------------------------------
    case 'ENVIRONMENT_PHASE':
      // Placeholder: tick status effects, relocate flora, process wildlife
      return { ...state, narrative: [...state.narrative, 'Environment phase resolved.'] };

    // ------------------------------------------------------------------
    case 'NEXT_TURN': {
      let newTurnState = advanceTurn(state.turnState, state.players.length);
      if (newTurnState.phase === TurnPhase.PLAYER_TURN) {
        newTurnState = skipDeadPlayers(newTurnState, state.players);
      }
      const newRound = newTurnState.phase === TurnPhase.PLAYER_TURN && newTurnState.round !== state.round
        ? newTurnState.round
        : state.round;
      return { ...state, turnState: newTurnState, round: newRound };
    }

    // ------------------------------------------------------------------
    case 'GAME_OVER':
      return {
        ...state,
        phase: GameState.GAME_OVER,
        gameOver: action.payload ?? { winner: null, condition: null },
      };

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a self-contained game engine instance.
 *
 * @param {object} blueprint  Parsed and validated campaign blueprint
 * @returns {GameEngineInstance}
 */
export function createGameEngine(blueprint) {
  let state = createInitialState(blueprint);
  const listeners = {};

  function emit(event, data) {
    (listeners[event] ?? []).forEach(cb => {
      try { cb(data); } catch (e) { /* swallow listener errors */ }
    });
  }

  function dispatch(action) {
    const next = gameReducer(state, action, blueprint);
    if (next !== state) {
      state = next;
      emit('stateChange', state);
    }

    // Automatically check win/lose conditions after every action
    const result = checkWinConditions(state, blueprint);
    if (result.over && state.phase !== GameState.GAME_OVER) {
      state = gameReducer(state, { type: 'GAME_OVER', payload: result }, blueprint);
      emit('gameOver', result);
      emit('stateChange', state);
    }

    return state;
  }

  return {
    /** @returns {object} Current game state (read-only reference). */
    getState: () => state,

    /** Dispatch an action through the reducer. */
    dispatch,

    /** Subscribe to events: 'stateChange', 'gameOver'. */
    on(event, cb) {
      listeners[event] = [...(listeners[event] ?? []), cb];
    },

    /** Transition LOBBY → CHARACTER_SELECT. */
    initializeGame() { return dispatch({ type: 'INIT_GAME' }); },

    /** Transition → TURN_LOOP with a list of { id, name, classId } players. */
    startGame(players) { return dispatch({ type: 'START_GAME', payload: { players } }); },

    /** Return actions available for the given player in the current state. */
    getAvailableActions(playerId) { return getAvailableActions(state, playerId); },

    /** Serialize the current state to a JSON string. */
    serialize() { return JSON.stringify(state); },

    /** Restore state from a JSON string (does NOT re-validate blueprint compat). */
    deserialize(data) {
      state = JSON.parse(data);
      emit('stateChange', state);
    },
  };
}
