/**
 * Integration Tests — GM Drivers
 *
 * Verifies that the HumanDriver and ScriptedDriver both implement the
 * DriverInterface correctly: consistent return shapes, action mapping to
 * GameEngine ActionTypes, and promise lifecycle management.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  createScriptedDriver,
  selectBossAction,
  getNarrative,
  bossActionToDispatch,
} from '../../src/drivers/ScriptedDriver.js';
import {
  createHumanDriver,
  humanActionToDispatch,
} from '../../src/drivers/HumanDriver.js';
import { ActionTypes } from '../../src/engine/GameEngine.js';

const rawBlueprint = JSON.parse(
  readFileSync(resolve(process.cwd(), 'campaigns/monster-hunt-tzorath.json'), 'utf-8'),
);

/** Build a minimal game state for driver testing. */
function mockGameState(stage = 1) {
  return {
    boss: {
      currentStage: stage,
      hp: 150,
      maxHp: 200,
      alive: true,
      isBurrowed: false,
    },
    players: {
      p1: { id: 'p1', name: 'Alice', hp: 80, alive: true, currentZoneId: 'verdant-maw' },
      p2: { id: 'p2', name: 'Bob', hp: 60, alive: true, currentZoneId: 'obsidian-grotto' },
    },
  };
}

// ─── ScriptedDriver ───────────────────────────────────────────────────────────

describe('ScriptedDriver — factory', () => {
  it('returns a driver object with required methods', () => {
    const driver = createScriptedDriver();
    expect(typeof driver.selectBossAction).toBe('function');
    expect(typeof driver.getNarrative).toBe('function');
    expect(typeof driver.selectTarget).toBe('function');
  });
});

describe('ScriptedDriver — selectBossAction', () => {
  it('returns an action object with action, target, params keys', async () => {
    const result = await selectBossAction(mockGameState(1), rawBlueprint);
    expect(result).toHaveProperty('action');
    expect(result).toHaveProperty('target');
    expect(result).toHaveProperty('params');
  });

  it('returns idle when boss is null', async () => {
    const result = await selectBossAction({ boss: null }, rawBlueprint);
    expect(result.action).toBe('idle');
    expect(result.target).toBeNull();
  });

  it('returns idle when stage data does not exist', async () => {
    const result = await selectBossAction({ boss: { currentStage: 999 } }, rawBlueprint);
    expect(result.action).toBe('idle');
  });

  it('returns a valid action for every boss stage (1-5)', async () => {
    const validActions = new Set([
      'attack', 'aoe_attack', 'multi_attack', 'burrow', 'grab', 'dodge', 'idle',
    ]);
    for (let stage = 1; stage <= 5; stage++) {
      const result = await selectBossAction(mockGameState(stage), rawBlueprint);
      expect(validActions.has(result.action)).toBe(true);
    }
  });

  it('params is always an object (never null/undefined)', async () => {
    for (let stage = 1; stage <= 5; stage++) {
      const result = await selectBossAction(mockGameState(stage), rawBlueprint);
      expect(typeof result.params).toBe('object');
    }
  });
});

describe('ScriptedDriver — getNarrative', () => {
  const triggers = ['intro', 'victory', 'defeat', 'boss_attack', 'evolution'];

  for (const trigger of triggers) {
    it(`returns a string for trigger: "${trigger}"`, async () => {
      const result = await getNarrative(trigger, mockGameState(), rawBlueprint);
      expect(typeof result).toBe('string');
    });
  }

  it('returns a non-empty string for intro', async () => {
    const result = await getNarrative('intro', mockGameState(), rawBlueprint);
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns a non-empty string for victory', async () => {
    const result = await getNarrative('victory', mockGameState(), rawBlueprint);
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns a string for unknown trigger (empty or fallback)', async () => {
    const result = await getNarrative('__unknown_trigger__', mockGameState(), rawBlueprint);
    expect(typeof result).toBe('string');
  });
});

describe('ScriptedDriver — bossActionToDispatch', () => {
  const hitRoll = { natural: 15, modified: 15 };

  it('maps "attack" → BOSS_ATTACK with targetId', () => {
    const dispatch = bossActionToDispatch({ action: 'attack', target: 'p1', params: {} }, hitRoll);
    expect(dispatch.type).toBe(ActionTypes.BOSS_ATTACK);
    expect(dispatch.payload.targetId).toBe('p1');
    expect(dispatch.payload.roll).toEqual(hitRoll);
  });

  it('maps "aoe_attack" → BOSS_AOE_ATTACK', () => {
    const dispatch = bossActionToDispatch({ action: 'aoe_attack', target: null, params: {} }, hitRoll);
    expect(dispatch.type).toBe(ActionTypes.BOSS_AOE_ATTACK);
  });

  it('maps "multi_attack" → BOSS_ATTACK', () => {
    const dispatch = bossActionToDispatch({ action: 'multi_attack', target: 'p2', params: {} }, hitRoll);
    expect(dispatch.type).toBe(ActionTypes.BOSS_ATTACK);
    expect(dispatch.payload.targetId).toBe('p2');
  });

  it('maps "burrow" → BOSS_BURROW', () => {
    const dispatch = bossActionToDispatch({ action: 'burrow', target: null, params: {} }, null);
    expect(dispatch.type).toBe(ActionTypes.BOSS_BURROW);
  });

  it('maps "grab" → BOSS_GRAB with targetId', () => {
    const dispatch = bossActionToDispatch({ action: 'grab', target: 'p1', params: {} }, null);
    expect(dispatch.type).toBe(ActionTypes.BOSS_GRAB);
    expect(dispatch.payload.targetId).toBe('p1');
  });

  it('maps "dodge" → BOSS_DODGE', () => {
    const dispatch = bossActionToDispatch({ action: 'dodge', target: null, params: {} }, null);
    expect(dispatch.type).toBe(ActionTypes.BOSS_DODGE);
  });

  it('maps unknown action → BOSS_END_TURN', () => {
    const dispatch = bossActionToDispatch({ action: '__unknown__', target: null, params: {} }, null);
    expect(dispatch.type).toBe(ActionTypes.BOSS_END_TURN);
  });
});

// ─── HumanDriver ─────────────────────────────────────────────────────────────

describe('HumanDriver — factory', () => {
  it('returns a driver object with required methods', () => {
    const driver = createHumanDriver();
    expect(typeof driver.selectBossAction).toBe('function');
    expect(typeof driver.getNarrative).toBe('function');
    expect(typeof driver.triggerAction).toBe('function');
    expect(typeof driver.isWaiting).toBe('function');
    expect(typeof driver.destroy).toBe('function');
  });

  it('starts with isWaiting() === false', () => {
    const driver = createHumanDriver();
    expect(driver.isWaiting()).toBe(false);
  });
});

describe('HumanDriver — selectBossAction (promise lifecycle)', () => {
  it('returns a pending promise that resolves when triggerAction is called', async () => {
    const driver = createHumanDriver();
    const promise = driver.selectBossAction(mockGameState(), rawBlueprint);
    expect(driver.isWaiting()).toBe(true);

    driver.triggerAction('attack', 'p1', {});
    const result = await promise;

    expect(result.action).toBe('attack');
    expect(result.target).toBe('p1');
    expect(result.params).toEqual({});
    expect(driver.isWaiting()).toBe(false);
  });

  it('resolves with correct action type from triggerAction', async () => {
    const driver = createHumanDriver();
    const promise = driver.selectBossAction(mockGameState(), rawBlueprint);

    driver.triggerAction('burrow', null, { reason: 'test' });
    const result = await promise;

    expect(result.action).toBe('burrow');
    expect(result.target).toBeNull();
    expect(result.params.reason).toBe('test');
  });

  it('isWaiting() is true while promise is pending', async () => {
    const driver = createHumanDriver();
    const promise = driver.selectBossAction(mockGameState(), rawBlueprint);
    expect(driver.isWaiting()).toBe(true);
    // Cleanup: destroy and await rejection so the promise doesn't leak
    driver.destroy();
    await promise.catch(() => {});
  });

  it('destroy() rejects the pending promise with "Driver destroyed"', async () => {
    const driver = createHumanDriver();
    const promise = driver.selectBossAction(mockGameState(), rawBlueprint);

    driver.destroy();

    await expect(promise).rejects.toThrow('Driver destroyed');
  });

  it('destroy() prevents new promises from hanging (rejects immediately)', async () => {
    const driver = createHumanDriver();
    driver.destroy();

    await expect(driver.selectBossAction(mockGameState(), rawBlueprint))
      .rejects.toThrow('Driver destroyed');
  });

  it('isWaiting() is false after destroy()', async () => {
    const driver = createHumanDriver();
    const promise = driver.selectBossAction(mockGameState(), rawBlueprint);
    driver.destroy();
    // Catch the rejection to prevent unhandled promise rejection
    await promise.catch(() => {});
    expect(driver.isWaiting()).toBe(false);
  });
});

describe('HumanDriver — getNarrative', () => {
  it('returns empty string (human host writes their own narrative)', async () => {
    const driver = createHumanDriver();
    const result = await driver.getNarrative('intro', mockGameState(), rawBlueprint);
    expect(result).toBe('');
  });

  it('returns empty string for all triggers', async () => {
    const driver = createHumanDriver();
    for (const trigger of ['intro', 'victory', 'defeat', 'boss_attack', 'evolution']) {
      const result = await driver.getNarrative(trigger, mockGameState(), rawBlueprint);
      expect(result).toBe('');
    }
  });
});

describe('HumanDriver — humanActionToDispatch', () => {
  const hitRoll = { natural: 12, modified: 12 };

  it('maps "attack" → BOSS_ATTACK with targetId and roll', () => {
    const dispatch = humanActionToDispatch('attack', 'p1', hitRoll);
    expect(dispatch.type).toBe(ActionTypes.BOSS_ATTACK);
    expect(dispatch.payload.targetId).toBe('p1');
    expect(dispatch.payload.roll).toEqual(hitRoll);
  });

  it('maps "aoe_attack" → BOSS_AOE_ATTACK', () => {
    const dispatch = humanActionToDispatch('aoe_attack', null, hitRoll);
    expect(dispatch.type).toBe(ActionTypes.BOSS_AOE_ATTACK);
  });

  it('maps "burrow" → BOSS_BURROW', () => {
    const dispatch = humanActionToDispatch('burrow', null, null);
    expect(dispatch.type).toBe(ActionTypes.BOSS_BURROW);
  });

  it('maps "grab" → BOSS_GRAB with targetId', () => {
    const dispatch = humanActionToDispatch('grab', 'p2', null);
    expect(dispatch.type).toBe(ActionTypes.BOSS_GRAB);
    expect(dispatch.payload.targetId).toBe('p2');
  });

  it('maps "dodge" → BOSS_DODGE', () => {
    const dispatch = humanActionToDispatch('dodge', null, null);
    expect(dispatch.type).toBe(ActionTypes.BOSS_DODGE);
  });

  it('maps "end_turn" → BOSS_END_TURN', () => {
    const dispatch = humanActionToDispatch('end_turn', null, null);
    expect(dispatch.type).toBe(ActionTypes.BOSS_END_TURN);
  });

  it('maps unknown action → BOSS_END_TURN (safe default)', () => {
    const dispatch = humanActionToDispatch('__unknown__', null, null);
    expect(dispatch.type).toBe(ActionTypes.BOSS_END_TURN);
  });
});

// ─── Cross-driver consistency ─────────────────────────────────────────────────

describe('GM Drivers — consistent interface', () => {
  it('both drivers return action objects with the same shape', async () => {
    const scripted = createScriptedDriver();
    const human = createHumanDriver();
    const gameState = mockGameState(1);

    // Scripted resolves automatically
    const scriptedResult = await scripted.selectBossAction(gameState, rawBlueprint);

    // Human resolves when triggerAction is called
    const humanPromise = human.selectBossAction(gameState, rawBlueprint);
    human.triggerAction('attack', 'p1', {});
    const humanResult = await humanPromise;

    for (const result of [scriptedResult, humanResult]) {
      expect(result).toHaveProperty('action');
      expect(result).toHaveProperty('target');
      expect(result).toHaveProperty('params');
      expect(typeof result.action).toBe('string');
    }
  });

  it('both bossActionToDispatch and humanActionToDispatch map "attack" to BOSS_ATTACK', () => {
    const r = { natural: 14, modified: 14 };
    const scriptedDispatch = bossActionToDispatch({ action: 'attack', target: 'p1', params: {} }, r);
    const humanDispatch = humanActionToDispatch('attack', 'p1', r);

    expect(scriptedDispatch.type).toBe(ActionTypes.BOSS_ATTACK);
    expect(humanDispatch.type).toBe(ActionTypes.BOSS_ATTACK);
    expect(scriptedDispatch.payload.targetId).toBe(humanDispatch.payload.targetId);
  });
});
