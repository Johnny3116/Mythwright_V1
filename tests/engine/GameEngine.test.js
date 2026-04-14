import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  createInitialState,
  createPlayerState,
  checkWinConditions,
  gameReducer,
  serializeState,
  deserializeState,
  GameState,
  TurnPhase,
  ActionTypes,
} from '../../src/engine/GameEngine.js';
import { loadBlueprint } from '../../src/engine/BlueprintLoader.js';

const rawBlueprint = JSON.parse(
  readFileSync(resolve(process.cwd(), 'campaigns/monster-hunt-tzorath.json'), 'utf-8')
);
const { data: blueprint } = loadBlueprint(rawBlueprint);

// Helper: build a roll object matching the engine's rollD20() shape
function roll(n) { return { natural: n, modified: n }; }

describe('GameEngine', () => {
  describe('createInitialState', () => {
    it('creates state in LOBBY phase', () => {
      const state = createInitialState(blueprint);
      expect(state.phase).toBe(GameState.LOBBY);
    });

    it('initializes boss from stage 0 data', () => {
      const state = createInitialState(blueprint);
      const stage0 = blueprint.enemies.boss.stages[0];
      expect(state.boss.currentStage).toBe(0);
      expect(state.boss.maxHp).toBe(stage0.maxHp);
      expect(state.boss.hp).toBe(stage0.maxHp);
    });

    it('initializes with empty players map', () => {
      const state = createInitialState(blueprint);
      expect(Object.keys(state.players)).toHaveLength(0);
    });

    it('initializes floraState as an object keyed by zone', () => {
      const state = createInitialState(blueprint);
      expect(typeof state.floraState).toBe('object');
    });

    it('initializes round at 0', () => {
      const state = createInitialState(blueprint);
      expect(state.round).toBe(0);
    });
  });

  describe('createPlayerState', () => {
    it('creates player state from blueprint class', () => {
      const p = createPlayerState('peer-1', 'Alice', 'assault', blueprint);
      expect(p.id).toBe('peer-1');
      expect(p.name).toBe('Alice');
      expect(p.classId).toBe('assault');
      expect(p.hp).toBeGreaterThan(0);
      expect(p.maxHp).toBe(p.hp);
      expect(p.alive).toBe(true);
    });

    it('throws for unknown classId', () => {
      expect(() => createPlayerState('p1', 'Alice', 'badclass', blueprint)).toThrow();
    });
  });

  describe('gameReducer', () => {
    let state;
    beforeEach(() => {
      state = createInitialState(blueprint);
    });

    it('returns state unchanged for unknown action', () => {
      const next = gameReducer(state, { type: 'UNKNOWN_ACTION_XYZ' });
      expect(next).toEqual(state);
    });

    it('SET_BLUEPRINT replaces blueprint', () => {
      const fakeBp = { zones: [] };
      const next = gameReducer(state, { type: ActionTypes.SET_BLUEPRINT, payload: { blueprint: fakeBp } });
      expect(next.blueprint).toEqual(fakeBp);
    });

    it('ADD_NARRATIVE appends to narrativeLog', () => {
      const next = gameReducer(state, { type: ActionTypes.ADD_NARRATIVE, payload: { text: 'Hello!' } });
      expect(next.narrativeLog).toHaveLength(1);
      expect(next.narrativeLog[0].text).toBe('Hello!');
    });

    it('ADD_NARRATIVE is immutable — does not mutate original', () => {
      gameReducer(state, { type: ActionTypes.ADD_NARRATIVE, payload: { text: 'Test' } });
      expect(state.narrativeLog).toHaveLength(0);
    });

    it('START_CHARACTER_SELECT transitions phase', () => {
      const next = gameReducer(state, { type: ActionTypes.START_CHARACTER_SELECT });
      expect(next.phase).toBe(GameState.CHARACTER_SELECT);
    });

    it('PLAYER_REGISTER creates a player entry', () => {
      const next = gameReducer(state, {
        type: ActionTypes.PLAYER_REGISTER,
        payload: { peerId: 'p1', playerName: 'Alice', isHost: true },
      });
      expect(next.players.p1).toBeDefined();
      expect(next.players.p1.name).toBe('Alice');
      expect(next.players.p1.isHost).toBe(true);
    });

    it('PLAYER_SELECT_CLASS creates full player state from blueprint', () => {
      let s = gameReducer(state, {
        type: ActionTypes.PLAYER_REGISTER,
        payload: { peerId: 'p1', playerName: 'Alice' },
      });
      s = gameReducer(s, {
        type: ActionTypes.PLAYER_SELECT_CLASS,
        payload: { peerId: 'p1', classId: 'assault', playerName: 'Alice' },
      });
      const cls = blueprint.classes.find((c) => c.id === 'assault');
      expect(s.players.p1.classId).toBe('assault');
      expect(s.players.p1.hp).toBe(cls.baseStats.hp);
    });

    it('START_GAME transitions to TURN_LOOP', () => {
      let s = gameReducer(state, {
        type: ActionTypes.PLAYER_REGISTER,
        payload: { peerId: 'p1', playerName: 'Alice' },
      });
      s = gameReducer(s, {
        type: ActionTypes.PLAYER_SELECT_CLASS,
        payload: { peerId: 'p1', classId: 'assault', playerName: 'Alice' },
      });
      s = gameReducer(s, { type: ActionTypes.START_GAME });
      expect(s.phase).toBe(GameState.TURN_LOOP);
      expect(s.round).toBe(1);
    });

    it('PLAYER_ATTACK with a hit reduces boss HP', () => {
      // Set up a game with one player
      let s = gameReducer(state, {
        type: ActionTypes.PLAYER_REGISTER,
        payload: { peerId: 'p1', playerName: 'Alice' },
      });
      s = gameReducer(s, {
        type: ActionTypes.PLAYER_SELECT_CLASS,
        payload: { peerId: 'p1', classId: 'assault', playerName: 'Alice' },
      });
      s = gameReducer(s, { type: ActionTypes.START_GAME });

      const bossBefore = s.boss.hp;
      // Roll 20 = guaranteed critical hit
      s = gameReducer(s, {
        type: ActionTypes.PLAYER_ATTACK,
        payload: { playerId: 'p1', roll: roll(20) },
      });
      expect(s.boss.hp).toBeLessThan(bossBefore);
    });

    it('PLAYER_ATTACK with a miss does not change boss HP', () => {
      let s = gameReducer(state, {
        type: ActionTypes.PLAYER_REGISTER,
        payload: { peerId: 'p1', playerName: 'Alice' },
      });
      s = gameReducer(s, {
        type: ActionTypes.PLAYER_SELECT_CLASS,
        payload: { peerId: 'p1', classId: 'assault', playerName: 'Alice' },
      });
      s = gameReducer(s, { type: ActionTypes.START_GAME });

      const bossBefore = s.boss.hp;
      // Roll 1 = critFail/fumble — no damage dealt (critFail range is [1,1] in blueprint)
      s = gameReducer(s, {
        type: ActionTypes.PLAYER_ATTACK,
        payload: { playerId: 'p1', roll: roll(1) },
      });
      expect(s.boss.hp).toBe(bossBefore);
    });

    it('BOSS_ATTACK with a hit reduces player HP', () => {
      let s = gameReducer(state, {
        type: ActionTypes.PLAYER_REGISTER,
        payload: { peerId: 'p1', playerName: 'Alice' },
      });
      s = gameReducer(s, {
        type: ActionTypes.PLAYER_SELECT_CLASS,
        payload: { peerId: 'p1', classId: 'assault', playerName: 'Alice' },
      });
      s = gameReducer(s, { type: ActionTypes.START_GAME });

      const playerBefore = s.players.p1.hp;
      s = gameReducer(s, {
        type: ActionTypes.BOSS_ATTACK,
        payload: { targetId: 'p1', roll: roll(20) },
      });
      expect(s.players.p1.hp).toBeLessThan(playerBefore);
    });

    it('BOSS_BURROW sets isBurrowed', () => {
      let s = gameReducer(state, {
        type: ActionTypes.PLAYER_REGISTER,
        payload: { peerId: 'p1', playerName: 'Alice' },
      });
      s = gameReducer(s, {
        type: ActionTypes.PLAYER_SELECT_CLASS,
        payload: { peerId: 'p1', classId: 'assault', playerName: 'Alice' },
      });
      s = gameReducer(s, { type: ActionTypes.START_GAME });
      s = gameReducer(s, { type: ActionTypes.BOSS_BURROW });
      expect(s.boss.isBurrowed).toBe(true);
    });

    it('SET_GAME_OVER transitions to GAME_OVER', () => {
      const next = gameReducer(state, {
        type: ActionTypes.SET_GAME_OVER,
        payload: { winner: 'players', condition: 'bossDefeated' },
      });
      expect(next.phase).toBe(GameState.GAME_OVER);
      expect(next.gameOverResult.winner).toBe('players');
    });

    it('LOAD_STATE replaces state wholesale', () => {
      const snapshot = { phase: GameState.TURN_LOOP, round: 5 };
      const next = gameReducer(state, { type: ActionTypes.LOAD_STATE, payload: snapshot });
      expect(next.phase).toBe(GameState.TURN_LOOP);
      expect(next.round).toBe(5);
    });
  });

  describe('checkWinConditions', () => {
    let state;
    beforeEach(() => {
      state = createInitialState(blueprint);
    });

    it('returns over:false when players alive and boss has HP', () => {
      state = {
        ...state,
        players: {
          p1: { id: 'p1', hp: 100, alive: true },
          p2: { id: 'p2', hp: 80, alive: true },
        },
      };
      const result = checkWinConditions(state, blueprint);
      expect(result.over).toBe(false);
      expect(result.winner).toBeNull();
    });

    it('returns boss wins when all players are dead (hp 0)', () => {
      state = {
        ...state,
        players: {
          p1: { id: 'p1', hp: 0, alive: false },
          p2: { id: 'p2', hp: 0, alive: false },
        },
      };
      const result = checkWinConditions(state, blueprint);
      expect(result.over).toBe(true);
      expect(result.winner).toBe('boss');
      expect(result.condition).toBe('allPlayersDead');
    });

    it('returns players win when boss is at final stage with 0 HP', () => {
      const finalStageIndex = blueprint.enemies.boss.stages.length - 1;
      state = {
        ...state,
        boss: { ...state.boss, currentStage: finalStageIndex, hp: 0, alive: false },
        players: { p1: { id: 'p1', hp: 50, alive: true } },
      };
      const result = checkWinConditions(state, blueprint);
      expect(result.over).toBe(true);
      expect(result.winner).toBe('players');
      expect(result.condition).toBe('bossDefeated');
    });

    it('does not trigger win when boss is not at final stage', () => {
      state = {
        ...state,
        boss: { ...state.boss, currentStage: 0, hp: 0, alive: false },
        players: { p1: { id: 'p1', hp: 50, alive: true } },
      };
      const result = checkWinConditions(state, blueprint);
      // Only final stage triggers players win
      expect(result.over).toBe(false);
    });
  });

  describe('serializeState / deserializeState', () => {
    it('serialize returns valid JSON string', () => {
      const state = createInitialState(blueprint);
      const json = serializeState(state);
      expect(typeof json).toBe('string');
      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('deserialize restores state from JSON string', () => {
      let s = createInitialState(blueprint);
      s = gameReducer(s, { type: ActionTypes.ADD_NARRATIVE, payload: { text: 'Saved!' } });
      const json = serializeState(s);
      const restored = deserializeState(json);
      expect(restored.narrativeLog[0].text).toBe('Saved!');
    });

    it('roundtrip preserves boss and player data', () => {
      let s = createInitialState(blueprint);
      s = gameReducer(s, {
        type: ActionTypes.PLAYER_REGISTER,
        payload: { peerId: 'p1', playerName: 'Alice' },
      });
      s = gameReducer(s, {
        type: ActionTypes.PLAYER_SELECT_CLASS,
        payload: { peerId: 'p1', classId: 'assault', playerName: 'Alice' },
      });
      const json = serializeState(s);
      const restored = deserializeState(json);
      expect(restored.players.p1.name).toBe('Alice');
      expect(restored.boss.hp).toBe(s.boss.hp);
    });
  });

  describe('headless game loop — 10 rounds without throwing', () => {
    it('runs full turns via reducer without errors', () => {
      let s = createInitialState(blueprint);

      // Register and select class for 3 players
      for (const [pid, name, cls] of [
        ['p1', 'Alice', 'assault'],
        ['p2', 'Bob', 'trapper'],
        ['p3', 'Carol', 'medic'],
      ]) {
        s = gameReducer(s, {
          type: ActionTypes.PLAYER_REGISTER,
          payload: { peerId: pid, playerName: name },
        });
        s = gameReducer(s, {
          type: ActionTypes.PLAYER_SELECT_CLASS,
          payload: { peerId: pid, classId: cls, playerName: name },
        });
      }

      s = gameReducer(s, { type: ActionTypes.START_GAME });
      expect(s.phase).toBe(GameState.TURN_LOOP);

      for (let round = 0; round < 10; round++) {
        if (s.phase === GameState.GAME_OVER) break;

        // Player turns — attack with roll 15 (always a hit)
        for (const pid of ['p1', 'p2', 'p3']) {
          if (s.players[pid]?.alive && s.phase !== GameState.GAME_OVER) {
            s = gameReducer(s, {
              type: ActionTypes.PLAYER_ATTACK,
              payload: { playerId: pid, roll: roll(15) },
            });
          }
        }

        if (s.phase === GameState.GAME_OVER) break;

        // Boss turn — attack first living player
        const target = Object.values(s.players).find((p) => p.alive);
        if (target) {
          s = gameReducer(s, {
            type: ActionTypes.BOSS_ATTACK,
            payload: { targetId: target.id, roll: roll(10) },
          });
        }

        s = gameReducer(s, { type: ActionTypes.RUN_ENVIRONMENT });
        s = gameReducer(s, { type: ActionTypes.ADVANCE_PHASE });
      }

      // Must not have thrown — any terminal state is valid
      expect([GameState.TURN_LOOP, GameState.GAME_OVER]).toContain(s.phase);
    });
  });
});
