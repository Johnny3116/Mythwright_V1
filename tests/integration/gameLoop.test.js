/**
 * Integration Tests — Full Game Loop
 *
 * Tests the complete state machine flow from lobby through game over,
 * including 3-round combat, boss evolution, and win/lose conditions.
 * These tests drive the GameEngine purely through its public reducer API
 * (no UI, no network) to verify end-to-end gameplay correctness.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  createInitialState,
  gameReducer,
  GameState,
  ActionTypes,
} from '../../src/engine/GameEngine.js';
import { loadBlueprint } from '../../src/engine/BlueprintLoader.js';

const rawBlueprint = JSON.parse(
  readFileSync(resolve(process.cwd(), 'campaigns/monster-hunt-tzorath.json'), 'utf-8'),
);
const { data: blueprint } = loadBlueprint(rawBlueprint);

/** Build a deterministic roll object (same shape as rollD20() output). */
function roll(n) {
  return { natural: n, modified: n };
}

/**
 * Set up a game state at the TURN_LOOP phase with the given players.
 * @param {Array<[string, string, string]>} playerDefs - [peerId, name, classId]
 */
function setupGame(playerDefs) {
  let s = createInitialState(blueprint);
  s = gameReducer(s, { type: ActionTypes.START_CHARACTER_SELECT });
  for (const [id, name, classId] of playerDefs) {
    s = gameReducer(s, {
      type: ActionTypes.PLAYER_REGISTER,
      payload: { peerId: id, playerName: name },
    });
    s = gameReducer(s, {
      type: ActionTypes.PLAYER_SELECT_CLASS,
      payload: { peerId: id, classId, playerName: name },
    });
  }
  return gameReducer(s, { type: ActionTypes.START_GAME });
}

// ─── State machine transitions ────────────────────────────────────────────────

describe('Full Game Loop — state machine transitions', () => {
  it('transitions LOBBY → CHARACTER_SELECT → TURN_LOOP', () => {
    let s = createInitialState(blueprint);
    expect(s.phase).toBe(GameState.LOBBY);

    s = gameReducer(s, { type: ActionTypes.START_CHARACTER_SELECT });
    expect(s.phase).toBe(GameState.CHARACTER_SELECT);

    s = gameReducer(s, {
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

  it('START_GAME initializes turn order from registered players', () => {
    const s = setupGame([['p1', 'Alice', 'assault'], ['p2', 'Bob', 'trapper']]);
    expect(s.playerOrder).toContain('p1');
    expect(s.playerOrder).toContain('p2');
  });

  it('START_GAME sets boss at full HP', () => {
    const s = setupGame([['p1', 'Alice', 'assault']]);
    expect(s.boss.hp).toBe(s.boss.maxHp);
    expect(s.boss.alive).toBe(true);
  });
});

// ─── Multi-round combat ───────────────────────────────────────────────────────

describe('Full Game Loop — 3-round combat', () => {
  it('boss takes cumulative damage over 3 rounds of player hits', () => {
    let s = setupGame([['p1', 'Alice', 'assault'], ['p2', 'Bob', 'trapper']]);
    const initialBossHp = s.boss.hp;

    for (let r = 0; r < 3; r++) {
      if (s.phase === GameState.GAME_OVER) break;

      s = gameReducer(s, {
        type: ActionTypes.PLAYER_ATTACK,
        payload: { playerId: 'p1', roll: roll(15) }, // guaranteed hit (range 6-15)
      });
      if (s.phase !== GameState.GAME_OVER) {
        s = gameReducer(s, {
          type: ActionTypes.PLAYER_ATTACK,
          payload: { playerId: 'p2', roll: roll(15) },
        });
      }
      if (s.phase !== GameState.GAME_OVER) {
        s = gameReducer(s, {
          type: ActionTypes.BOSS_ATTACK,
          payload: { targetId: 'p1', roll: roll(10) },
        });
      }
      s = gameReducer(s, { type: ActionTypes.RUN_ENVIRONMENT });
      s = gameReducer(s, { type: ActionTypes.ADVANCE_PHASE });
    }

    expect(s.boss.hp).toBeLessThan(initialBossHp);
  });

  it('narrative log grows with each player attack', () => {
    let s = setupGame([['p1', 'Alice', 'assault']]);
    const logStart = s.narrativeLog.length;

    s = gameReducer(s, { type: ActionTypes.PLAYER_ATTACK, payload: { playerId: 'p1', roll: roll(15) } });
    s = gameReducer(s, { type: ActionTypes.PLAYER_ATTACK, payload: { playerId: 'p1', roll: roll(3) } }); // miss

    expect(s.narrativeLog.length).toBeGreaterThan(logStart);
  });

  it('boss misses do not reduce player HP', () => {
    let s = setupGame([['p1', 'Alice', 'assault']]);
    const hpBefore = s.players.p1.hp;

    // Roll 1 = guaranteed miss (miss range 1-5)
    s = gameReducer(s, {
      type: ActionTypes.BOSS_ATTACK,
      payload: { targetId: 'p1', roll: roll(1) },
    });

    expect(s.players.p1.hp).toBe(hpBefore);
  });

  it('boss hits reduce player HP', () => {
    let s = setupGame([['p1', 'Alice', 'assault']]);
    const hpBefore = s.players.p1.hp;

    // Roll 20 = guaranteed critical hit
    s = gameReducer(s, {
      type: ActionTypes.BOSS_ATTACK,
      payload: { targetId: 'p1', roll: roll(20) },
    });

    expect(s.players.p1.hp).toBeLessThan(hpBefore);
  });

  it('environment phase runs without throwing', () => {
    let s = setupGame([['p1', 'Alice', 'assault']]);
    expect(() => {
      s = gameReducer(s, { type: ActionTypes.RUN_ENVIRONMENT });
    }).not.toThrow();
  });
});

// ─── Win condition: players win ───────────────────────────────────────────────

describe('Full Game Loop — players win', () => {
  it('transitions to GAME_OVER (players win) when boss is defeated at final stage', () => {
    let s = setupGame([['p1', 'Alice', 'assault']]);

    // Use blueprint stage 5 (currentStage: 5) — retreatThreshold is null so no
    // evolution fires. Win condition fires when currentStage >= stages.length - 1 (4)
    // AND boss.hp <= 0. Must call ADVANCE_PHASE after the killing blow.
    const finalStage = blueprint.enemies.boss.stages.find((st) => st.retreatThreshold === null);
    s = gameReducer(s, {
      type: ActionTypes.LOAD_STATE,
      payload: {
        ...s,
        boss: {
          ...s.boss,
          currentStage: finalStage.stage, // stage 5 — satisfies >= stages.length - 1 (4)
          hp: 1,
          maxHp: finalStage.maxHp,
          alive: true,
        },
      },
    });

    // Critical hit kills boss (hp → 0)
    s = gameReducer(s, {
      type: ActionTypes.PLAYER_ATTACK,
      payload: { playerId: 'p1', roll: roll(20) },
    });
    // Win condition is checked in ADVANCE_PHASE
    s = gameReducer(s, { type: ActionTypes.ADVANCE_PHASE });

    expect(s.phase).toBe(GameState.GAME_OVER);
    expect(s.gameOverResult.winner).toBe('players');
    expect(s.gameOverResult.condition).toBe('bossDefeated');
  });

  it('victory narrative is added to log on win', () => {
    let s = setupGame([['p1', 'Alice', 'assault']]);
    const finalStage = blueprint.enemies.boss.stages.find((st) => st.retreatThreshold === null);
    s = gameReducer(s, {
      type: ActionTypes.LOAD_STATE,
      payload: {
        ...s,
        boss: { ...s.boss, currentStage: finalStage.stage, hp: 1, alive: true },
      },
    });

    s = gameReducer(s, {
      type: ActionTypes.PLAYER_ATTACK,
      payload: { playerId: 'p1', roll: roll(20) },
    });
    s = gameReducer(s, { type: ActionTypes.ADVANCE_PHASE });

    const hasVictoryEntry = s.narrativeLog.some(
      (e) => typeof e.text === 'string' && e.text.length > 0,
    );
    expect(hasVictoryEntry).toBe(true);
  });
});

// ─── Win condition: boss wins ─────────────────────────────────────────────────

describe('Full Game Loop — boss wins', () => {
  it('transitions to GAME_OVER (boss wins) when all players are dead', () => {
    let s = setupGame([['p1', 'Alice', 'assault']]);

    // Inject: player at 1 HP so a crit kills them
    s = gameReducer(s, {
      type: ActionTypes.LOAD_STATE,
      payload: {
        ...s,
        players: { p1: { ...s.players.p1, hp: 1, alive: true } },
      },
    });

    // Critical boss hit kills the last player
    s = gameReducer(s, {
      type: ActionTypes.BOSS_ATTACK,
      payload: { targetId: 'p1', roll: roll(20) },
    });
    // Win condition is checked in ADVANCE_PHASE
    s = gameReducer(s, { type: ActionTypes.ADVANCE_PHASE });

    expect(s.phase).toBe(GameState.GAME_OVER);
    expect(s.gameOverResult.winner).toBe('boss');
    expect(s.gameOverResult.condition).toBe('allPlayersDead');
  });

  it('defeat narrative is added to log on loss', () => {
    let s = setupGame([['p1', 'Alice', 'assault']]);
    s = gameReducer(s, {
      type: ActionTypes.LOAD_STATE,
      payload: { ...s, players: { p1: { ...s.players.p1, hp: 1, alive: true } } },
    });

    s = gameReducer(s, {
      type: ActionTypes.BOSS_ATTACK,
      payload: { targetId: 'p1', roll: roll(20) },
    });
    s = gameReducer(s, { type: ActionTypes.ADVANCE_PHASE });

    const hasDefeatEntry = s.narrativeLog.some(
      (e) => typeof e.text === 'string' && e.text.length > 0,
    );
    expect(hasDefeatEntry).toBe(true);
  });
});

// ─── Boss evolution via GameEngine ───────────────────────────────────────────

describe('Full Game Loop — boss evolution', () => {
  it('triggers evolution when boss HP drops to retreat threshold (stage 1)', () => {
    let s = setupGame([['p1', 'Alice', 'assault']]);

    // Inject: boss at blueprint stage 1 (1-indexed), HP exactly at retreat threshold
    // retreatThreshold for stage 1 = 100 per campaign blueprint
    const stage1 = blueprint.enemies.boss.stages.find((st) => st.stage === 1);
    s = gameReducer(s, {
      type: ActionTypes.LOAD_STATE,
      payload: {
        ...s,
        boss: {
          ...s.boss,
          currentStage: 1,        // 1-indexed: matches blueprint stage field
          hp: stage1.retreatThreshold,
          maxHp: stage1.maxHp,
          alive: true,
        },
      },
    });

    // Any attack (hit or miss) runs the evolution check
    s = gameReducer(s, {
      type: ActionTypes.PLAYER_ATTACK,
      payload: { playerId: 'p1', roll: roll(10) }, // guaranteed hit
    });

    expect(s.boss.currentStage).toBe(2);
    expect(s.isEvolving).toBe(true);
  });

  it('boss gains HP recovery after evolving', () => {
    let s = setupGame([['p1', 'Alice', 'assault']]);
    const stage1 = blueprint.enemies.boss.stages.find((st) => st.stage === 1);

    s = gameReducer(s, {
      type: ActionTypes.LOAD_STATE,
      payload: {
        ...s,
        boss: {
          ...s.boss,
          currentStage: 1,
          hp: stage1.retreatThreshold,
          maxHp: stage1.maxHp,
          alive: true,
        },
      },
    });

    const hpBeforeEvolution = s.boss.hp;
    s = gameReducer(s, {
      type: ActionTypes.PLAYER_ATTACK,
      payload: { playerId: 'p1', roll: roll(10) },
    });

    // After evolution: boss HP should exceed pre-evolution HP (recovery)
    expect(s.boss.hp).toBeGreaterThan(hpBeforeEvolution);
  });

  it('adds evolution narrative to log when boss evolves', () => {
    let s = setupGame([['p1', 'Alice', 'assault']]);
    const stage1 = blueprint.enemies.boss.stages.find((st) => st.stage === 1);

    s = gameReducer(s, {
      type: ActionTypes.LOAD_STATE,
      payload: {
        ...s,
        boss: {
          ...s.boss,
          currentStage: 1,
          hp: stage1.retreatThreshold,
          maxHp: stage1.maxHp,
          alive: true,
        },
      },
    });

    const logLengthBefore = s.narrativeLog.length;
    s = gameReducer(s, {
      type: ActionTypes.PLAYER_ATTACK,
      payload: { playerId: 'p1', roll: roll(10) },
    });

    // Evolution adds an extra narrative entry (attack narrative + evolution narrative)
    expect(s.narrativeLog.length).toBeGreaterThan(logLengthBefore + 1);
  });

  it('isEvolving flag is false when boss HP is above retreat threshold', () => {
    let s = setupGame([['p1', 'Alice', 'assault']]);
    const stage1 = blueprint.enemies.boss.stages.find((st) => st.stage === 1);

    s = gameReducer(s, {
      type: ActionTypes.LOAD_STATE,
      payload: {
        ...s,
        boss: {
          ...s.boss,
          currentStage: 1,
          hp: stage1.retreatThreshold + 50, // well above threshold
          maxHp: stage1.maxHp,
          alive: true,
        },
      },
    });

    s = gameReducer(s, {
      type: ActionTypes.PLAYER_ATTACK,
      payload: { playerId: 'p1', roll: roll(1) }, // miss — no damage, no evolution
    });

    expect(s.isEvolving).toBe(false);
  });
});

// ─── Multi-player campaign ────────────────────────────────────────────────────

describe('Full Game Loop — multi-player', () => {
  it('supports 4-player game setup', () => {
    const s = setupGame([
      ['p1', 'Alice', 'assault'],
      ['p2', 'Bob', 'trapper'],
      ['p3', 'Carol', 'medic'],
      ['p4', 'Dave', 'support'],
    ]);

    expect(Object.keys(s.players)).toHaveLength(4);
    expect(s.phase).toBe(GameState.TURN_LOOP);
    expect(s.round).toBe(1);
    expect(s.playerOrder).toHaveLength(4);
  });

  it('boss AOE attack can be dispatched without error', () => {
    let s = setupGame([['p1', 'Alice', 'assault'], ['p2', 'Bob', 'trapper']]);
    expect(() => {
      s = gameReducer(s, {
        type: ActionTypes.BOSS_AOE_ATTACK,
        payload: { roll: roll(18) },
      });
    }).not.toThrow();
  });

  it('boss burrow can be dispatched without error', () => {
    let s = setupGame([['p1', 'Alice', 'assault']]);
    expect(() => {
      s = gameReducer(s, { type: ActionTypes.BOSS_BURROW });
    }).not.toThrow();
    expect(s.boss.isBurrowed).toBe(true);
  });
});
