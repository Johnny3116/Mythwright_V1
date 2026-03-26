import { createContext, useContext, useReducer, useCallback } from 'react';
import { gameReducer, createInitialState, ActionTypes, GameState } from '@engine/GameEngine.js';
import { serializeState, deserializeState } from '@engine/GameEngine.js';
import { SAVE_FILE_PREFIX } from '@utils/constants.js';

const GameContext = createContext(null);

/**
 * Initial stub state before blueprint is loaded.
 */
const stubInitialState = {
  phase: GameState.LOBBY,
  turnPhase: null,
  turnState: null,
  round: 0,
  blueprint: null,
  gmMode: 'scripted',
  players: {},
  playerOrder: [],
  boss: null,
  placedTraps: [],
  floraState: {},
  narrativeLog: [],
  lastRoll: null,
  gameOverResult: null,
  pendingBossAction: null,
  isEvolving: false,
};

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, stubInitialState);

  /**
   * Save game state to a JSON file download.
   */
  const saveGame = useCallback(() => {
    const json = serializeState(state);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const campaignId = state.blueprint?.meta?.title?.replace(/\s+/g, '-').toLowerCase() || 'game';
    a.href = url;
    a.download = `${SAVE_FILE_PREFIX}${campaignId}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [state]);

  /**
   * Load a game save file and restore state.
   */
  const loadGame = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const savedState = deserializeState(e.target.result);
        dispatch({ type: ActionTypes.LOAD_STATE, payload: savedState });
      } catch (err) {
        console.error('Failed to load save:', err);
      }
    };
    reader.readAsText(file);
  }, []);

  const value = {
    state,
    dispatch,
    saveGame,
    loadGame,
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}

export function useGameContext() {
  const context = useContext(GameContext);
  if (context === undefined || context === null) {
    throw new Error('useGameContext must be used within a GameProvider');
  }
  return context;
}
