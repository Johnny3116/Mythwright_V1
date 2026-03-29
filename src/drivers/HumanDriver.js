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
  let pendingResolve = null;

  const driver = {
    _pendingResolve: null,

    /**
     * Wait for the host to manually select a boss action.
     * Returns a promise that resolves when triggerManualAction is called.
     * Accepts an optional AbortSignal so callers can cancel mid-turn (e.g. on
     * driver swap or component unmount) without leaking the pending Promise.
     * @param {object} gameState
     * @param {object} blueprint
     * @param {AbortSignal} [signal]
     */
    selectBossAction: async (gameState, blueprint, signal) => {
      return new Promise((resolve, reject) => {
        if (signal?.aborted) {
          reject(new DOMException('Aborted', 'AbortError'));
          return;
        }
        driver._pendingResolve = resolve;
        if (signal) {
          signal.addEventListener('abort', () => {
            driver._pendingResolve = null;
            reject(new DOMException('Aborted', 'AbortError'));
          }, { once: true });
        }
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
      }
    },

    isWaiting: () => driver._pendingResolve !== null,

    /**
     * Cancel any pending selectBossAction promise and clean up.
     * Call this when the driver is destroyed or swapped out mid-turn.
     */
    destroy: () => {
      driver._pendingResolve = null;
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
