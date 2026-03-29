/**
 * constants — Application-wide constants
 */

export const APP_VERSION = '0.1.0';

/**
 * Canonical TurnPhase enum — single source of truth used by TurnManager and GameEngine.
 * Both modules import from here; do NOT redefine locally.
 */
export const TurnPhase = {
  PLAYER_TURN: 'PLAYER_TURN',
  BOSS_TURN: 'BOSS_TURN',
  ENVIRONMENT: 'ENVIRONMENT',
  CHECK_WIN: 'CHECK_WIN',
  NEXT_ROUND: 'NEXT_ROUND',
};

/** Default model ID for AIDriver. Update here to change the AI model globally. */
export const DEFAULT_AI_MODEL = 'claude-haiku-4-5-20251001';

export const GM_DRIVER_TYPES = {
  HUMAN: 'human',
  SCRIPTED: 'scripted',
  AI: 'ai',
};

export const PLAYER_ACTIONS = {
  ATTACK: 'ATTACK',
  USE_ABILITY: 'USE_ABILITY',
  SET_TRAP: 'SET_TRAP',
  USE_ITEM: 'USE_ITEM',
  MOVE: 'MOVE',
  RETREAT: 'RETREAT',
  SEARCH_FLORA: 'SEARCH_FLORA',
  END_TURN: 'END_TURN',
};

export const DICE_FACES = 20;

export const DEFAULT_HEARTBEAT_INTERVAL = 5000;

export const SAVE_FILE_PREFIX = 'mythwright-save-';
