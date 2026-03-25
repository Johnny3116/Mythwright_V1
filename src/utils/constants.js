/**
 * constants — Application-wide constants
 */

export const APP_VERSION = '0.1.0';

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
