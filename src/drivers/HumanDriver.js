/**
 * HumanDriver — Human host GM implementation
 * All actions are manually triggered by the host via the GM Controls UI.
 * Returns a pending promise that the UI resolves when the human takes action.
 */

import { ActionTypes } from '@engine/GameEngine.js';

/**
 * Create a Human Driver instance.
 * The human driver awaits manual input rather than auto-resolving.
 * @returns {object} Driver instance
 */
export function createHumanDriver() {
  const driver = {
    _pendingResolve: null,
    _pendingReject: null,
    _cancelled: false,

    /**
     * Wait for the host to manually select a boss action.
     * Returns a promise that resolves when triggerAction is called.
     * Rejects immediately if the driver has been destroyed.
     */
    selectBossAction: async (gameState, blueprint) => {
      return new Promise((resolve, reject) => {
        if (driver._cancelled) {
          reject(new Error('Driver destroyed'));
          return;
        }
        driver._pendingResolve = resolve;
        driver._pendingReject = reject;
      });
    },

    getNarrative: async (trigger, gameState, blueprint) => {
      // Human host writes their own narrative — return empty for now
      return '';
    },

    selectTarget: async (strategy, players, gameState) => {
      // Human host selects target via UI — return first alive player as default
      return players.find(p => p.alive) || null;
    },

    /**
     * Called from GMControls UI when host manually triggers a boss action.
     * @param {string} action
     * @param {string|null} targetId
     * @param {object} params
     */
    triggerAction: (action, targetId, params = {}) => {
      if (driver._pendingResolve) {
        driver._pendingResolve({ action, target: targetId, params });
        driver._pendingResolve = null;
        driver._pendingReject = null;
      }
    },

    isWaiting: () => driver._pendingResolve !== null,

    /**
     * Cancel any pending selectBossAction promise and prevent new ones from hanging.
     */
    destroy: () => {
      driver._cancelled = true;
      if (driver._pendingReject) {
        driver._pendingReject(new Error('Driver destroyed'));
        driver._pendingResolve = null;
        driver._pendingReject = null;
      }
    },
  };

  return driver;
}

/**
 * Trigger a manual boss action (called from GM Controls UI).
 * @param {string} action
 * @param {string|null} targetId
 * @param {object} params
 * @returns {object} Action object
 */
export function triggerManualAction(action, targetId, params = {}) {
  return { action, target: targetId, params };
}

/**
 * Map human-selected action to GameEngine dispatch.
 * @param {string} action
 * @param {string|null} targetId
 * @param {number} roll
 * @returns {object}
 */
export function humanActionToDispatch(action, targetId, roll) {
  switch (action) {
    case 'attack':
      return { type: ActionTypes.BOSS_ATTACK, payload: { targetId, roll } };
    case 'aoe_attack':
      return { type: ActionTypes.BOSS_AOE_ATTACK, payload: { roll } };
    case 'burrow':
      return { type: ActionTypes.BOSS_BURROW, payload: {} };
    case 'grab':
      return { type: ActionTypes.BOSS_GRAB, payload: { targetId } };
    case 'dodge':
      return { type: ActionTypes.BOSS_DODGE, payload: {} };
    case 'end_turn':
      return { type: ActionTypes.BOSS_END_TURN, payload: {} };
    default:
      return { type: ActionTypes.BOSS_END_TURN, payload: {} };
  }
}
