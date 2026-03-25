/**
 * GameEngine — Core state machine and game loop
 *
 * States: LOBBY → CHARACTER_SELECT → GAME_SETUP → TURN_LOOP → GAME_OVER
 */

export const GameState = {
  LOBBY: 'LOBBY',
  CHARACTER_SELECT: 'CHARACTER_SELECT',
  GAME_SETUP: 'GAME_SETUP',
  TURN_LOOP: 'TURN_LOOP',
  GAME_OVER: 'GAME_OVER',
};

export const TurnPhase = {
  PLAYER_TURN: 'PLAYER_TURN',
  BOSS_TURN: 'BOSS_TURN',
  ENVIRONMENT: 'ENVIRONMENT',
  CHECK_WIN: 'CHECK_WIN',
  NEXT_ROUND: 'NEXT_ROUND',
};

/**
 * Create the initial game state from a parsed blueprint.
 * @param {object} blueprint - Parsed campaign blueprint
 * @returns {object} Initial game state
 */
export function createInitialState(blueprint) {
  // TODO: Implement in Phase 2
  throw new Error('GameEngine.createInitialState not yet implemented');
}

/**
 * Main state reducer — pure function.
 * @param {object} state - Current game state
 * @param {object} action - { type, payload }
 * @returns {object} New game state
 */
export function gameReducer(state, action) {
  // TODO: Implement in Phase 2
  throw new Error('GameEngine.gameReducer not yet implemented');
}

/**
 * Check win/lose conditions against current state.
 * @param {object} state
 * @param {object} blueprint
 * @returns {{ over: boolean, winner: 'players'|'boss'|null, condition: string|null }}
 */
export function checkWinConditions(state, blueprint) {
  // TODO: Implement in Phase 2
  throw new Error('GameEngine.checkWinConditions not yet implemented');
}
