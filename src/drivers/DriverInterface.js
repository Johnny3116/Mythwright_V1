/**
 * DriverInterface — Abstract GM driver interface
 * All GM drivers (Human, Scripted, AI) must implement these functions.
 */

/**
 * Base driver interface definition.
 * Drivers implement these methods to control non-player turns.
 *
 * @interface
 */
export const DriverInterface = {
  /**
   * Called when the boss turn begins. Must return a boss action.
   * @param {object} gameState
   * @param {object} blueprint
   * @returns {Promise<{ action: string, target: string|null, params: object }>}
   */
  selectBossAction: async (gameState, blueprint) => {
    throw new Error('DriverInterface.selectBossAction must be implemented');
  },

  /**
   * Called when narrative should be advanced (story beat, evolution, etc.)
   * @param {string} trigger - Event type that triggered narration
   * @param {object} gameState
   * @param {object} blueprint
   * @returns {Promise<string>} Narrative text to display
   */
  getNarrative: async (trigger, gameState, blueprint) => {
    throw new Error('DriverInterface.getNarrative must be implemented');
  },

  /**
   * Called when the GM needs to select a target.
   * @param {string} strategy
   * @param {Array} players
   * @param {object} gameState
   * @returns {Promise<object>} Selected target
   */
  selectTarget: async (strategy, players, gameState) => {
    throw new Error('DriverInterface.selectTarget must be implemented');
  },
};
