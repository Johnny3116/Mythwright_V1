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

/**
 * Canonical GameState enum — single source of truth.
 * GameEngine re-exports this; do NOT redefine locally.
 */
export const GameState = {
  LOBBY: 'LOBBY',
  CHARACTER_SELECT: 'CHARACTER_SELECT',
  GAME_SETUP: 'GAME_SETUP',
  TURN_LOOP: 'TURN_LOOP',
  GAME_OVER: 'GAME_OVER',
};

/**
 * Canonical ActionTypes enum — single source of truth.
 * GameEngine re-exports this; do NOT redefine locally.
 */
export const ActionTypes = {
  // Lobby / setup
  SET_BLUEPRINT: 'SET_BLUEPRINT',
  SET_GM_MODE: 'SET_GM_MODE',
  START_CHARACTER_SELECT: 'START_CHARACTER_SELECT',
  PLAYER_REGISTER: 'PLAYER_REGISTER',
  PLAYER_SELECT_CLASS: 'PLAYER_SELECT_CLASS',
  START_GAME: 'START_GAME',

  // In-game player actions
  PLAYER_ATTACK: 'PLAYER_ATTACK',
  PLAYER_USE_ABILITY: 'PLAYER_USE_ABILITY',
  PLAYER_SET_TRAP: 'PLAYER_SET_TRAP',
  PLAYER_RETREAT: 'PLAYER_RETREAT',
  PLAYER_SEARCH_FLORA: 'PLAYER_SEARCH_FLORA',
  PLAYER_MOVE: 'PLAYER_MOVE',
  PLAYER_SEARCH: 'PLAYER_SEARCH',
  PLAYER_HEAL: 'PLAYER_HEAL',
  PLAYER_FLEE: 'PLAYER_FLEE',
  PLAYER_END_TURN: 'PLAYER_END_TURN',

  // Boss actions
  BOSS_ATTACK: 'BOSS_ATTACK',
  BOSS_AOE_ATTACK: 'BOSS_AOE_ATTACK',
  BOSS_BURROW: 'BOSS_BURROW',
  BOSS_GRAB: 'BOSS_GRAB',
  BOSS_DODGE: 'BOSS_DODGE',
  BOSS_MOVE: 'BOSS_MOVE',
  BOSS_END_TURN: 'BOSS_END_TURN',

  // Environment phase
  RUN_ENVIRONMENT: 'RUN_ENVIRONMENT',

  // Phase / round control
  ADVANCE_PHASE: 'ADVANCE_PHASE',

  // Win/Lose
  SET_GAME_OVER: 'SET_GAME_OVER',

  // Save/Load
  LOAD_STATE: 'LOAD_STATE',

  // Narrator
  ADD_NARRATIVE: 'ADD_NARRATIVE',

  // Dice animation
  SET_ROLL_RESULT: 'SET_ROLL_RESULT',

  // UI state
  CLEAR_EVOLVING: 'CLEAR_EVOLVING',
  RESET_TO_LOBBY: 'RESET_TO_LOBBY',
};
