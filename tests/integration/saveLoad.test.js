/**
 * Integration Tests — Save / Load
 *
 * Verifies that mid-game state can be fully serialized to JSON and
 * deserialized back to a playable state with no data loss.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  createInitialState,
  gameReducer,
  GameState,
  ActionTypes,
  serializeState,
  deserializeState,
} from '../../src/engine/GameEngine.js';
import { loadBlueprint } from '../../src/engine/BlueprintLoader.js';

const rawBlueprint = JSON.parse(
  readFileSync(resolve(process.cwd(), 'campaigns/monster-hunt-tzorath.json'), 'utf-8'),
);
const { data: blueprint } = loadBlueprint(rawBlueprint);

function roll(n) {
  return { natural: n, modified: n };
}

/**
 * Build a mid-game state: 2 players, 3 rounds of combat.
 */
function buildMidGameState() {
  let s = createInitialState(blueprint);
  s = gameReducer(s, { type: ActionTypes.START_CHARACTER_SELECT });

  for (const [id, name, classId] of [
    ['p1', 'Alice', 'assault'],
    ['p2', 'Bob', 'trapper'],
  ]) {
    s = gameReducer(s, {
      type: ActionTypes.PLAYER_REGISTER,
      payload: { peerId: id, playerName: name },
    });
    s = gameReducer(s, {
      type: ActionTypes.PLAYER_SELECT_CLASS,
      payload: { peerId: id, classId, playerName: name },
    });
  }

  s = gameReducer(s, { type: ActionTypes.START_GAME });

  // Simulate 3 rounds of combat
  for (let r = 0; r < 3; r++) {
    if (s.phase === GameState.GAME_OVER) break;
    s = gameReducer(s, {
      type: ActionTypes.PLAYER_ATTACK,
      payload: { playerId: 'p1', roll: roll(15) },
    });
    if (s.phase !== GameState.GAME_OVER) {
      s = gameReducer(s, {
        type: ActionTypes.BOSS_ATTACK,
        payload: { targetId: 'p1', roll: roll(10) },
      });
    }
    s = gameReducer(s, { type: ActionTypes.RUN_ENVIRONMENT });
    s = gameReducer(s, { type: ActionTypes.ADVANCE_PHASE });
  }

  return s;
}

// ─── Serialize ────────────────────────────────────────────────────────────────

describe('Save/Load — serialize', () => {
  it('serializes mid-game state to a valid JSON string', () => {
    const s = buildMidGameState();
    const json = serializeState(s);
    expect(typeof json).toBe('string');
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('serialized JSON is self-consistent (re-stringify round-trip)', () => {
    const s = buildMidGameState();
    const json = serializeState(s);
    const parsed = JSON.parse(json);
    expect(() => JSON.stringify(parsed)).not.toThrow();
  });

  it('serialized JSON contains all required top-level fields', () => {
    const s = buildMidGameState();
    const parsed = JSON.parse(serializeState(s));
    for (const field of ['phase', 'round', 'boss', 'players', 'narrativeLog']) {
      expect(parsed).toHaveProperty(field);
    }
  });

  it('serialized boss contains HP and stage', () => {
    const s = buildMidGameState();
    const { boss } = JSON.parse(serializeState(s));
    expect(typeof boss.hp).toBe('number');
    expect(typeof boss.maxHp).toBe('number');
    expect(typeof boss.currentStage).toBe('number');
  });

  it('serialized players contains all player entries', () => {
    const s = buildMidGameState();
    const { players } = JSON.parse(serializeState(s));
    expect(players.p1).toBeDefined();
    expect(players.p2).toBeDefined();
  });
});

// ─── Deserialize ──────────────────────────────────────────────────────────────

describe('Save/Load — deserialize', () => {
  it('restores game phase', () => {
    const s = buildMidGameState();
    const restored = deserializeState(serializeState(s));
    expect(restored.phase).toBe(s.phase);
  });

  it('restores round counter', () => {
    const s = buildMidGameState();
    const restored = deserializeState(serializeState(s));
    expect(restored.round).toBe(s.round);
  });

  it('restores boss HP and stage', () => {
    const s = buildMidGameState();
    const restored = deserializeState(serializeState(s));
    expect(restored.boss.hp).toBe(s.boss.hp);
    expect(restored.boss.maxHp).toBe(s.boss.maxHp);
    expect(restored.boss.currentStage).toBe(s.boss.currentStage);
    expect(restored.boss.alive).toBe(s.boss.alive);
  });

  it('restores player HP and class for all players', () => {
    const s = buildMidGameState();
    const restored = deserializeState(serializeState(s));
    for (const pid of ['p1', 'p2']) {
      expect(restored.players[pid]).toBeDefined();
      expect(restored.players[pid].hp).toBe(s.players[pid].hp);
      expect(restored.players[pid].name).toBe(s.players[pid].name);
      expect(restored.players[pid].classId).toBe(s.players[pid].classId);
      expect(restored.players[pid].alive).toBe(s.players[pid].alive);
    }
  });

  it('restores narrative log entries', () => {
    const s = buildMidGameState();
    const restored = deserializeState(serializeState(s));
    expect(restored.narrativeLog).toHaveLength(s.narrativeLog.length);
    if (s.narrativeLog.length > 0) {
      expect(restored.narrativeLog[0].text).toBe(s.narrativeLog[0].text);
    }
  });

  it('restores player order array', () => {
    const s = buildMidGameState();
    const restored = deserializeState(serializeState(s));
    expect(restored.playerOrder).toEqual(s.playerOrder);
  });
});

// ─── Resume gameplay after load ───────────────────────────────────────────────

describe('Save/Load — resume gameplay', () => {
  it('loaded state accepts player attacks', () => {
    const s = buildMidGameState();
    let restored = deserializeState(serializeState(s));

    const bossBefore = restored.boss.hp;
    restored = gameReducer(restored, {
      type: ActionTypes.PLAYER_ATTACK,
      payload: { playerId: 'p1', roll: roll(20) }, // critical hit
    });

    expect(restored.boss.hp).toBeLessThan(bossBefore);
  });

  it('loaded state accepts boss attacks', () => {
    const s = buildMidGameState();
    let restored = deserializeState(serializeState(s));

    expect(() => {
      restored = gameReducer(restored, {
        type: ActionTypes.BOSS_ATTACK,
        payload: { targetId: 'p1', roll: roll(18) },
      });
    }).not.toThrow();
  });

  it('win conditions still trigger correctly after load', () => {
    const s = buildMidGameState();
    let restored = deserializeState(serializeState(s));

    // Use final stage (retreatThreshold: null) so no evolution fires before win check
    const finalStage = blueprint.enemies.boss.stages.find((st) => st.retreatThreshold === null);
    restored = gameReducer(restored, {
      type: ActionTypes.LOAD_STATE,
      payload: {
        ...restored,
        boss: { ...restored.boss, currentStage: finalStage.stage, hp: 1, alive: true },
      },
    });

    restored = gameReducer(restored, {
      type: ActionTypes.PLAYER_ATTACK,
      payload: { playerId: 'p1', roll: roll(20) },
    });
    // Win condition is evaluated in ADVANCE_PHASE
    restored = gameReducer(restored, { type: ActionTypes.ADVANCE_PHASE });

    expect(restored.phase).toBe(GameState.GAME_OVER);
    expect(restored.gameOverResult.winner).toBe('players');
  });

  it('can serialize again after resuming (double round-trip)', () => {
    const s = buildMidGameState();
    let restored = deserializeState(serializeState(s));

    // Play one more action
    restored = gameReducer(restored, {
      type: ActionTypes.PLAYER_ATTACK,
      payload: { playerId: 'p1', roll: roll(15) },
    });

    // Serialize the resumed state
    expect(() => serializeState(restored)).not.toThrow();
    const json2 = serializeState(restored);
    expect(() => JSON.parse(json2)).not.toThrow();
  });
});
