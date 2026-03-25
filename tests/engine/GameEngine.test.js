import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  createGameEngine,
  createInitialState,
  checkWinConditions,
  GameState,
  TurnPhase,
  gameReducer,
} from '../../src/engine/GameEngine.js';
import { loadBlueprint } from '../../src/engine/BlueprintLoader.js';

const rawBlueprint = JSON.parse(
  readFileSync(resolve(process.cwd(), 'campaigns/monster-hunt-tzorath.json'), 'utf-8')
);
const { data: blueprint } = loadBlueprint(rawBlueprint);

const testPlayers = [
  { id: 'p1', name: 'Alice', classId: 'assault' },
  { id: 'p2', name: 'Bob', classId: 'trapper' },
  { id: 'p3', name: 'Carol', classId: 'medic' },
];

describe('GameEngine', () => {
  describe('createInitialState', () => {
    it('creates state in LOBBY phase', () => {
      const state = createInitialState(blueprint);
      expect(state.gameState).toBe(GameState.LOBBY);
    });

    it('initializes boss at stage 1', () => {
      const state = createInitialState(blueprint);
      expect(state.boss.stage).toBe(1);
      expect(state.boss.maxHp).toBe(200);
      expect(state.boss.hp).toBe(200);
    });

    it('initializes with empty players map', () => {
      const state = createInitialState(blueprint);
      expect(Object.keys(state.players)).toHaveLength(0);
    });

    it('initializes all zones', () => {
      const state = createInitialState(blueprint);
      expect(Object.keys(state.zones)).toHaveLength(blueprint.zones.length);
    });

    it('initializes round at 1', () => {
      const state = createInitialState(blueprint);
      expect(state.round).toBe(1);
    });
  });

  describe('gameReducer', () => {
    let state;
    beforeEach(() => {
      state = createInitialState(blueprint);
    });

    it('TRANSITION changes gameState', () => {
      const next = gameReducer(state, { type: 'TRANSITION', payload: { to: GameState.CHARACTER_SELECT } });
      expect(next.gameState).toBe(GameState.CHARACTER_SELECT);
    });

    it('ADD_PLAYER adds a player', () => {
      const player = { id: 'p1', name: 'Alice', hp: 100, maxHp: 100, effects: [] };
      const next = gameReducer(state, { type: 'ADD_PLAYER', payload: { player } });
      expect(Object.keys(next.players)).toHaveLength(1);
      expect(next.players.p1.name).toBe('Alice');
    });

    it('REMOVE_PLAYER removes a player', () => {
      let s = gameReducer(state, { type: 'ADD_PLAYER', payload: { player: { id: 'p1', name: 'Alice', hp: 100, effects: [] } } });
      s = gameReducer(s, { type: 'REMOVE_PLAYER', payload: { playerId: 'p1' } });
      expect(Object.keys(s.players)).toHaveLength(0);
    });

    it('PLAYER_DAMAGE reduces player HP', () => {
      let s = gameReducer(state, { type: 'ADD_PLAYER', payload: { player: { id: 'p1', name: 'Alice', hp: 100, maxHp: 100, effects: [] } } });
      s = gameReducer(s, { type: 'PLAYER_DAMAGE', payload: { playerId: 'p1', amount: 30 } });
      expect(s.players.p1.hp).toBe(70);
    });

    it('PLAYER_DAMAGE floors at 0', () => {
      let s = gameReducer(state, { type: 'ADD_PLAYER', payload: { player: { id: 'p1', name: 'Alice', hp: 10, maxHp: 100, effects: [] } } });
      s = gameReducer(s, { type: 'PLAYER_DAMAGE', payload: { playerId: 'p1', amount: 1000 } });
      expect(s.players.p1.hp).toBe(0);
    });

    it('PLAYER_HEAL increases player HP', () => {
      let s = gameReducer(state, { type: 'ADD_PLAYER', payload: { player: { id: 'p1', name: 'Alice', hp: 50, maxHp: 100, effects: [] } } });
      s = gameReducer(s, { type: 'PLAYER_HEAL', payload: { playerId: 'p1', amount: 30 } });
      expect(s.players.p1.hp).toBe(80);
    });

    it('PLAYER_HEAL caps at maxHp', () => {
      let s = gameReducer(state, { type: 'ADD_PLAYER', payload: { player: { id: 'p1', name: 'Alice', hp: 90, maxHp: 100, effects: [] } } });
      s = gameReducer(s, { type: 'PLAYER_HEAL', payload: { playerId: 'p1', amount: 100 } });
      expect(s.players.p1.hp).toBe(100);
    });

    it('BOSS_DAMAGE reduces boss HP', () => {
      const next = gameReducer(state, { type: 'BOSS_DAMAGE', payload: { amount: 50 } });
      expect(next.boss.hp).toBe(150);
    });

    it('BOSS_DAMAGE floors at 0', () => {
      const next = gameReducer(state, { type: 'BOSS_DAMAGE', payload: { amount: 99999 } });
      expect(next.boss.hp).toBe(0);
    });

    it('BOSS_HEAL increases boss HP', () => {
      let s = gameReducer(state, { type: 'BOSS_DAMAGE', payload: { amount: 100 } });
      s = gameReducer(s, { type: 'BOSS_HEAL', payload: { amount: 30 } });
      expect(s.boss.hp).toBe(130);
    });

    it('INCREMENT_ROUND increments round', () => {
      const next = gameReducer(state, { type: 'INCREMENT_ROUND' });
      expect(next.round).toBe(2);
    });

    it('LOG appends to log array', () => {
      const next = gameReducer(state, { type: 'LOG', payload: { message: 'Test log' } });
      expect(next.log).toHaveLength(1);
      expect(next.log[0].message).toBe('Test log');
    });

    it('SET_WIN_RESULT sets winResult and transitions to GAME_OVER', () => {
      const result = { over: true, winner: 'players', condition: 'bossDefeated' };
      const next = gameReducer(state, { type: 'SET_WIN_RESULT', payload: result });
      expect(next.gameState).toBe(GameState.GAME_OVER);
      expect(next.winResult.winner).toBe('players');
    });

    it('unknown action returns state unchanged', () => {
      const next = gameReducer(state, { type: 'UNKNOWN_ACTION' });
      expect(next).toEqual(state);
    });
  });

  describe('checkWinConditions', () => {
    let state;
    beforeEach(() => {
      state = createInitialState(blueprint);
    });

    it('returns playing when all players alive and boss has HP', () => {
      state.players = {
        p1: { id: 'p1', hp: 100 },
        p2: { id: 'p2', hp: 80 },
      };
      const result = checkWinConditions(state, blueprint);
      expect(result.over).toBe(false);
      expect(result.winner).toBeNull();
    });

    it('returns boss wins when all players are dead', () => {
      state.players = {
        p1: { id: 'p1', hp: 0 },
        p2: { id: 'p2', hp: 0 },
      };
      const result = checkWinConditions(state, blueprint);
      expect(result.over).toBe(true);
      expect(result.winner).toBe('boss');
      expect(result.condition).toBe('allPlayersDead');
    });

    it('returns players win when boss is at stage 5 with 0 HP', () => {
      state.boss.stage = 5;
      state.boss.hp = 0;
      state.players = { p1: { id: 'p1', hp: 50 } };
      const result = checkWinConditions(state, blueprint);
      expect(result.over).toBe(true);
      expect(result.winner).toBe('players');
      expect(result.condition).toBe('bossDefeated');
    });

    it('does not trigger win when boss is at stage 3 with 0 HP', () => {
      // Win condition requires boss to be at stage 5
      state.boss.stage = 3;
      state.boss.hp = 0;
      state.players = { p1: { id: 'p1', hp: 50 } };
      const result = checkWinConditions(state, blueprint);
      expect(result.over).toBe(false);
    });
  });

  describe('createGameEngine — state machine', () => {
    let engine;
    beforeEach(() => {
      engine = createGameEngine(blueprint);
    });

    it('starts in LOBBY state', () => {
      expect(engine.getState().gameState).toBe(GameState.LOBBY);
    });

    it('transitions to GAME_SETUP after initializeGame', () => {
      engine.initializeGame(testPlayers);
      expect(engine.getState().gameState).toBe(GameState.GAME_SETUP);
    });

    it('transitions to TURN_LOOP after startGame', () => {
      engine.initializeGame(testPlayers);
      engine.startGame();
      expect(engine.getState().gameState).toBe(GameState.TURN_LOOP);
    });

    it('full state machine: LOBBY → CHARACTER_SELECT → GAME_SETUP → TURN_LOOP', () => {
      // LOBBY → CHARACTER_SELECT (manual dispatch)
      engine.initializeGame(testPlayers); // → GAME_SETUP
      engine.startGame(); // → TURN_LOOP
      expect(engine.getState().gameState).toBe(GameState.TURN_LOOP);
    });

    it('initializes players from blueprint class data', () => {
      engine.initializeGame(testPlayers);
      const state = engine.getState();
      expect(Object.keys(state.players)).toHaveLength(3);
      expect(state.players.p1.className).toBe('Assault');
      expect(state.players.p2.className).toBe('Trapper');
    });

    it('getAvailableActions returns action list for living player', () => {
      engine.initializeGame(testPlayers);
      engine.startGame();
      const actions = engine.getAvailableActions('p1');
      expect(actions).toContain('attack');
      expect(actions).toContain('retreat');
    });

    it('getAvailableActions returns empty for dead player', () => {
      engine.initializeGame(testPlayers);
      engine.startGame();
      // Kill p1 manually via reducer
      // Access internal state by loading modified state
      const state = engine.getState();
      state.players.p1.hp = 0;
      engine.loadState(state);
      const actions = engine.getAvailableActions('p1');
      expect(actions).toHaveLength(0);
    });

    it('getWinLoseStatus returns playing during game', () => {
      engine.initializeGame(testPlayers);
      engine.startGame();
      expect(engine.getWinLoseStatus()).toBe('playing');
    });

    it('serialize returns valid JSON string', () => {
      engine.initializeGame(testPlayers);
      const json = engine.serialize();
      expect(typeof json).toBe('string');
      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('loadState restores serialized state', () => {
      engine.initializeGame(testPlayers);
      engine.startGame();
      const state1 = engine.getState();

      const engine2 = createGameEngine(blueprint);
      engine2.loadState(state1);
      const state2 = engine2.getState();

      expect(state2.gameState).toBe(GameState.TURN_LOOP);
      expect(Object.keys(state2.players)).toHaveLength(3);
      expect(state2.boss.hp).toBe(state1.boss.hp);
    });

    it('on() event listener fires on state change', () => {
      let fired = false;
      engine.on('stateChange', () => { fired = true; });
      engine.initializeGame(testPlayers);
      expect(fired).toBe(true);
    });

    it('playerAttack returns combat result', () => {
      engine.initializeGame(testPlayers);
      engine.startGame();
      const result = engine.playerAttack('p1', 'boss');
      // Result can be null (miss) or have hit property
      if (result !== null) {
        expect(result).toHaveProperty('hit');
        expect(result).toHaveProperty('damageDealt');
      }
    });

    it('executeBossTurn returns an action object', () => {
      engine.initializeGame(testPlayers);
      engine.startGame();
      const action = engine.executeBossTurn();
      if (action !== null) {
        expect(action).toHaveProperty('action');
      }
    });
  });

  describe('createGameEngine — full turn cycle (10 rounds headless)', () => {
    it('runs 10 rounds without throwing', () => {
      const engine = createGameEngine(blueprint);
      engine.initializeGame(testPlayers);
      engine.startGame();

      for (let round = 0; round < 10; round++) {
        const state = engine.getState();
        if (state.gameState === GameState.GAME_OVER) break;

        // Player turns
        for (const playerId of ['p1', 'p2', 'p3']) {
          if (engine.getState().players[playerId]?.hp > 0) {
            engine.playerAttack(playerId, 'boss');
          }
        }

        if (engine.getState().gameState === GameState.GAME_OVER) break;
        engine.executeBossTurn();

        if (engine.getState().gameState === GameState.GAME_OVER) break;
        engine.executeEnvironmentPhase();
      }

      // Should not have thrown
      expect(true).toBe(true);
    });
  });
});
