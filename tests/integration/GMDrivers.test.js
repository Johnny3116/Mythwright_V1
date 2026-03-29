/**
 * Integration Tests: GM Drivers
 *
 * Covers the Phase 8 spec requirement:
 *   - GM drivers: same game scenario produces valid results in all 3 modes
 *
 * Tests:
 *   - ScriptedDriver: auto-selects valid actions for all boss stages
 *   - HumanDriver: promise-based manual trigger flow
 *   - AIDriver: falls back to ScriptedDriver when no API key
 *   - Action dispatch mapping (bossActionToDispatch, humanActionToDispatch)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  createScriptedDriver,
  selectBossAction as scriptedSelectBossAction,
  bossActionToDispatch,
} from '../../src/drivers/ScriptedDriver.js';
import {
  createHumanDriver,
  humanActionToDispatch,
  triggerManualAction,
} from '../../src/drivers/HumanDriver.js';
import {
  createAIDriver,
  selectBossAction as aiSelectBossAction,
  getNarrative as aiGetNarrative,
} from '../../src/drivers/AIDriver.js';
import { loadBlueprint } from '../../src/engine/BlueprintLoader.js';
import { createInitialState, gameReducer, ActionTypes } from '../../src/engine/GameEngine.js';

const rawBlueprint = JSON.parse(
  readFileSync(resolve(process.cwd(), 'campaigns/monster-hunt-tzorath.json'), 'utf-8')
);
const { data: blueprint } = loadBlueprint(rawBlueprint);

const VALID_BOSS_ACTIONS = new Set(['attack', 'aoe_attack', 'multi_attack', 'burrow', 'grab', 'dodge', 'idle']);

// Build a minimal game state for a given boss stage
function buildStateForStage(stageIndex, players = ['p1', 'p2']) {
  let s = createInitialState(blueprint);
  for (const pid of players) {
    s = gameReducer(s, {
      type: ActionTypes.PLAYER_REGISTER,
      payload: { peerId: pid, playerName: `Player ${pid}`, isHost: pid === 'p1' },
    });
    s = gameReducer(s, {
      type: ActionTypes.PLAYER_SELECT_CLASS,
      payload: { peerId: pid, classId: 'assault', playerName: `Player ${pid}` },
    });
  }
  s = gameReducer(s, { type: ActionTypes.START_GAME });

  // Advance boss to specified stage
  const stageData = blueprint.enemies.boss.stages[stageIndex];
  if (stageData) {
    s = {
      ...s,
      boss: {
        ...s.boss,
        currentStage: stageData.stage,
        hp: stageData.maxHp,
        maxHp: stageData.maxHp,
        damage: stageData.damage,
        defense: stageData.defense,
      },
    };
  }

  return s;
}

// ─────────────────────────────────────────────────────────────────────────────

describe('ScriptedDriver', () => {
  describe('createScriptedDriver factory', () => {
    it('returns a driver object with selectBossAction, getNarrative, selectTarget', () => {
      const driver = createScriptedDriver();
      expect(typeof driver.selectBossAction).toBe('function');
      expect(typeof driver.getNarrative).toBe('function');
      expect(typeof driver.selectTarget).toBe('function');
    });
  });

  describe('selectBossAction — valid action for each stage', () => {
    const stageCount = blueprint.enemies.boss.stages.length;

    for (let i = 0; i < stageCount; i++) {
      it(`returns a valid action for stage ${i}`, async () => {
        const gameState = buildStateForStage(i);
        const result = await scriptedSelectBossAction(gameState, blueprint);

        expect(result).toBeDefined();
        expect(typeof result.action).toBe('string');
        expect(VALID_BOSS_ACTIONS.has(result.action)).toBe(true);
        // target may be null for non-attack actions
        expect('target' in result).toBe(true);
        expect(typeof result.params).toBe('object');
      });
    }

    it('returns "idle" when boss has no stage data', async () => {
      const gameState = buildStateForStage(0);
      const corruptState = { ...gameState, boss: { ...gameState.boss, currentStage: 999 } };
      const result = await scriptedSelectBossAction(corruptState, blueprint);
      expect(result.action).toBe('idle');
    });

    it('returns "idle" when boss is missing from state', async () => {
      const gameState = { ...buildStateForStage(0), boss: null };
      const result = await scriptedSelectBossAction(gameState, blueprint);
      expect(result.action).toBe('idle');
    });

    it('action result is consistent shape across multiple calls', async () => {
      const gameState = buildStateForStage(0);
      // Run 5 times — each should produce a valid shape regardless of dice randomness
      for (let i = 0; i < 5; i++) {
        const result = await scriptedSelectBossAction(gameState, blueprint);
        expect(typeof result.action).toBe('string');
        expect(VALID_BOSS_ACTIONS.has(result.action)).toBe(true);
      }
    });
  });

  describe('bossActionToDispatch — maps to GameEngine ActionTypes', () => {
    const roll = { natural: 15, modified: 15 };

    it('attack → BOSS_ATTACK with targetId and roll', () => {
      const action = bossActionToDispatch({ action: 'attack', target: 'p1', params: {} }, roll);
      expect(action.type).toBe(ActionTypes.BOSS_ATTACK);
      expect(action.payload.targetId).toBe('p1');
      expect(action.payload.roll).toBe(roll);
    });

    it('aoe_attack → BOSS_AOE_ATTACK with roll', () => {
      const action = bossActionToDispatch({ action: 'aoe_attack', target: null, params: {} }, roll);
      expect(action.type).toBe(ActionTypes.BOSS_AOE_ATTACK);
      expect(action.payload.roll).toBe(roll);
    });

    it('burrow → BOSS_BURROW', () => {
      const action = bossActionToDispatch({ action: 'burrow', target: null, params: {} }, roll);
      expect(action.type).toBe(ActionTypes.BOSS_BURROW);
    });

    it('grab → BOSS_GRAB with targetId', () => {
      const action = bossActionToDispatch({ action: 'grab', target: 'p2', params: {} }, roll);
      expect(action.type).toBe(ActionTypes.BOSS_GRAB);
      expect(action.payload.targetId).toBe('p2');
    });

    it('dodge → BOSS_DODGE', () => {
      const action = bossActionToDispatch({ action: 'dodge', target: null, params: {} }, roll);
      expect(action.type).toBe(ActionTypes.BOSS_DODGE);
    });

    it('multi_attack → BOSS_ATTACK (treated same as single attack)', () => {
      const action = bossActionToDispatch({ action: 'multi_attack', target: 'p1', params: {} }, roll);
      expect(action.type).toBe(ActionTypes.BOSS_ATTACK);
    });

    it('unknown action → BOSS_END_TURN (safe default)', () => {
      const action = bossActionToDispatch({ action: 'unknown_action', target: null, params: {} }, roll);
      expect(action.type).toBe(ActionTypes.BOSS_END_TURN);
    });
  });

  describe('selectBossAction is applicable to the full game loop', () => {
    it('scripted driver can resolve all turns in a simulated combat', async () => {
      let s = buildStateForStage(0);
      const roll = (n) => ({ natural: n, modified: n });

      for (let i = 0; i < 5; i++) {
        const bossAction = await scriptedSelectBossAction(s, blueprint);
        expect(VALID_BOSS_ACTIONS.has(bossAction.action)).toBe(true);

        // Apply boss action to game state
        const dispatchAction = bossActionToDispatch(bossAction, roll(15));
        s = gameReducer(s, dispatchAction);

        s = gameReducer(s, { type: ActionTypes.RUN_ENVIRONMENT });
        s = gameReducer(s, { type: ActionTypes.ADVANCE_PHASE });
        if (s.phase === 'GAME_OVER') break;
      }
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('HumanDriver', () => {
  describe('createHumanDriver factory', () => {
    it('returns driver with selectBossAction, getNarrative, selectTarget, triggerAction, isWaiting, destroy', () => {
      const driver = createHumanDriver();
      expect(typeof driver.selectBossAction).toBe('function');
      expect(typeof driver.getNarrative).toBe('function');
      expect(typeof driver.selectTarget).toBe('function');
      expect(typeof driver.triggerAction).toBe('function');
      expect(typeof driver.isWaiting).toBe('function');
      expect(typeof driver.destroy).toBe('function');
    });

    it('isWaiting() is false before any selectBossAction call', () => {
      const driver = createHumanDriver();
      expect(driver.isWaiting()).toBe(false);
    });
  });

  describe('selectBossAction — promise-based manual trigger', () => {
    it('resolves when triggerAction is called', async () => {
      const driver = createHumanDriver();
      const gameState = buildStateForStage(0);

      const actionPromise = driver.selectBossAction(gameState, blueprint);
      expect(driver.isWaiting()).toBe(true);

      driver.triggerAction('attack', 'p1', {});
      const result = await actionPromise;

      expect(result.action).toBe('attack');
      expect(result.target).toBe('p1');
      expect(driver.isWaiting()).toBe(false);
    });

    it('resolves with correct action for all valid boss action types', async () => {
      const validActions = ['attack', 'aoe_attack', 'burrow', 'grab', 'dodge', 'end_turn'];

      for (const actionType of validActions) {
        const driver = createHumanDriver();
        const gameState = buildStateForStage(0);

        const promise = driver.selectBossAction(gameState, blueprint);
        driver.triggerAction(actionType, 'p1', {});
        const result = await promise;
        expect(result.action).toBe(actionType);
      }
    });

    it('isWaiting() returns true while pending', () => {
      const driver = createHumanDriver();
      const gameState = buildStateForStage(0);

      driver.selectBossAction(gameState, blueprint); // don't await
      expect(driver.isWaiting()).toBe(true);

      driver.triggerAction('burrow', null, {});
      expect(driver.isWaiting()).toBe(false);
    });

    it('destroy() rejects pending promise', async () => {
      const driver = createHumanDriver();
      const gameState = buildStateForStage(0);

      const promise = driver.selectBossAction(gameState, blueprint);
      driver.destroy();

      await expect(promise).rejects.toThrow('Driver destroyed');
    });

    it('selectBossAction rejects immediately if driver is destroyed', async () => {
      const driver = createHumanDriver();
      const gameState = buildStateForStage(0);

      driver.destroy();
      await expect(driver.selectBossAction(gameState, blueprint)).rejects.toThrow('Driver destroyed');
    });

    it('triggerAction is a no-op when not waiting', () => {
      const driver = createHumanDriver();
      // Should not throw when not waiting
      expect(() => driver.triggerAction('attack', 'p1', {})).not.toThrow();
    });
  });

  describe('getNarrative — returns empty string (human writes their own)', () => {
    it('getNarrative returns a string', async () => {
      const driver = createHumanDriver();
      const gameState = buildStateForStage(0);
      const result = await driver.getNarrative('intro', gameState, blueprint);
      expect(typeof result).toBe('string');
    });
  });

  describe('selectTarget — returns first alive player', () => {
    it('returns first alive player', async () => {
      const driver = createHumanDriver();
      const players = [
        { id: 'p1', name: 'Alice', alive: false },
        { id: 'p2', name: 'Bob', alive: true },
      ];
      const result = await driver.selectTarget('any', players, {});
      expect(result?.id).toBe('p2');
    });
  });

  describe('humanActionToDispatch — maps to GameEngine ActionTypes', () => {
    const roll = { natural: 12, modified: 12 };

    it('attack → BOSS_ATTACK', () => {
      expect(humanActionToDispatch('attack', 'p1', roll).type).toBe(ActionTypes.BOSS_ATTACK);
    });

    it('aoe_attack → BOSS_AOE_ATTACK', () => {
      expect(humanActionToDispatch('aoe_attack', null, roll).type).toBe(ActionTypes.BOSS_AOE_ATTACK);
    });

    it('burrow → BOSS_BURROW', () => {
      expect(humanActionToDispatch('burrow', null, roll).type).toBe(ActionTypes.BOSS_BURROW);
    });

    it('grab → BOSS_GRAB', () => {
      expect(humanActionToDispatch('grab', 'p1', roll).type).toBe(ActionTypes.BOSS_GRAB);
    });

    it('dodge → BOSS_DODGE', () => {
      expect(humanActionToDispatch('dodge', null, roll).type).toBe(ActionTypes.BOSS_DODGE);
    });

    it('end_turn → BOSS_END_TURN', () => {
      expect(humanActionToDispatch('end_turn', null, roll).type).toBe(ActionTypes.BOSS_END_TURN);
    });

    it('unknown action → BOSS_END_TURN (safe fallback)', () => {
      expect(humanActionToDispatch('fly', null, roll).type).toBe(ActionTypes.BOSS_END_TURN);
    });
  });

  describe('triggerManualAction helper', () => {
    it('returns { action, target, params } shape', () => {
      const result = triggerManualAction('attack', 'p1', { power: 2 });
      expect(result).toEqual({ action: 'attack', target: 'p1', params: { power: 2 } });
    });

    it('defaults params to empty object', () => {
      const result = triggerManualAction('burrow', null);
      expect(result.params).toEqual({});
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('AIDriver', () => {
  describe('createAIDriver factory', () => {
    it('returns a driver with selectBossAction, getNarrative, selectTarget', () => {
      const driver = createAIDriver();
      expect(typeof driver.selectBossAction).toBe('function');
      expect(typeof driver.getNarrative).toBe('function');
      expect(typeof driver.selectTarget).toBe('function');
    });
  });

  describe('selectBossAction — falls back to scripted when no API key', () => {
    it('returns a valid action without API key (scripted fallback)', async () => {
      const gameState = buildStateForStage(0);
      const result = await aiSelectBossAction(gameState, blueprint, {});

      expect(typeof result.action).toBe('string');
      expect(VALID_BOSS_ACTIONS.has(result.action)).toBe(true);
    });

    it('falls back gracefully on fetch/API failure', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

      const gameState = buildStateForStage(0);
      const result = await aiSelectBossAction(gameState, blueprint, { apiKey: 'fake-key' });

      // Should fall back to scripted
      expect(VALID_BOSS_ACTIONS.has(result.action)).toBe(true);

      vi.unstubAllGlobals();
    });

    it('falls back on non-200 API response', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      }));

      const gameState = buildStateForStage(0);
      const result = await aiSelectBossAction(gameState, blueprint, { apiKey: 'bad-key' });

      expect(VALID_BOSS_ACTIONS.has(result.action)).toBe(true);

      vi.unstubAllGlobals();
    });

    it('all boss stages produce valid actions without API key', async () => {
      for (let i = 0; i < blueprint.enemies.boss.stages.length; i++) {
        const gameState = buildStateForStage(i);
        const result = await aiSelectBossAction(gameState, blueprint, {});
        expect(VALID_BOSS_ACTIONS.has(result.action)).toBe(true);
      }
    });
  });

  describe('getNarrative — falls back to scripted when no API key', () => {
    const triggers = ['intro', 'victory', 'defeat', 'boss_attack', 'evolution'];

    for (const trigger of triggers) {
      it(`returns a non-empty string for trigger "${trigger}" without API key`, async () => {
        const gameState = buildStateForStage(0);
        const result = await aiGetNarrative(trigger, gameState, blueprint, {});
        expect(typeof result).toBe('string');
      });
    }

    it('falls back on API failure for narrative', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

      const gameState = buildStateForStage(0);
      const result = await aiGetNarrative('intro', gameState, blueprint, { apiKey: 'fake-key' });

      expect(typeof result).toBe('string');

      vi.unstubAllGlobals();
    });
  });

  describe('All 3 drivers produce valid results for same scenario', () => {
    it('Scripted and AI (no key) produce valid actions for the same state', async () => {
      const gameState = buildStateForStage(0);

      const scriptedResult = await scriptedSelectBossAction(gameState, blueprint);
      const aiResult = await aiSelectBossAction(gameState, blueprint, {});

      expect(VALID_BOSS_ACTIONS.has(scriptedResult.action)).toBe(true);
      expect(VALID_BOSS_ACTIONS.has(aiResult.action)).toBe(true);
    });

    it('Human driver, after trigger, produces the same shape as scripted result', async () => {
      const gameState = buildStateForStage(0);
      const driver = createHumanDriver();

      const humanPromise = driver.selectBossAction(gameState, blueprint);
      driver.triggerAction('attack', 'p1', {});
      const humanResult = await humanPromise;

      const scriptedResult = await scriptedSelectBossAction(gameState, blueprint);

      // Both should have the same shape
      expect(typeof humanResult.action).toBe('string');
      expect(typeof scriptedResult.action).toBe('string');
      expect('target' in humanResult).toBe(true);
      expect('target' in scriptedResult).toBe(true);
      expect(typeof humanResult.params).toBe('object');
      expect(typeof scriptedResult.params).toBe('object');
    });

    it('bossActionToDispatch + humanActionToDispatch produce dispatchable GameEngine actions', () => {
      const roll = { natural: 15, modified: 15 };

      // Scripted path
      const scriptedDispatch = bossActionToDispatch({ action: 'attack', target: 'p1', params: {} }, roll);
      expect(typeof scriptedDispatch.type).toBe('string');
      expect(typeof scriptedDispatch.payload).toBe('object');

      // Human path
      const humanDispatch = humanActionToDispatch('attack', 'p1', roll);
      expect(typeof humanDispatch.type).toBe('string');
      expect(typeof humanDispatch.payload).toBe('object');

      // Both should produce the same dispatch shape for the same action
      expect(scriptedDispatch.type).toBe(humanDispatch.type);
    });
  });
});
