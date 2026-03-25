import { createContext, useCallback, useContext, useReducer } from 'react';

// ---------------------------------------------------------------------------
// Action type constants
// ---------------------------------------------------------------------------

export const GameActions = {
  SET_BLUEPRINT: 'SET_BLUEPRINT',
  SET_GAME_PHASE: 'SET_GAME_PHASE',
  SET_GM_MODE: 'SET_GM_MODE',
  SET_GM_API_KEY: 'SET_GM_API_KEY',
  SET_TURN_TIMER: 'SET_TURN_TIMER',
  SET_MY_PLAYER_ID: 'SET_MY_PLAYER_ID',
  SET_IS_HOST: 'SET_IS_HOST',
  INIT_GAME_STATE: 'INIT_GAME_STATE',
  UPDATE_GAME_STATE: 'UPDATE_GAME_STATE',
  ADD_NARRATOR_ENTRY: 'ADD_NARRATOR_ENTRY',
  UPDATE_PLAYER: 'UPDATE_PLAYER',
  UPDATE_BOSS: 'UPDATE_BOSS',
  RESET: 'RESET',
};

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const initialState = {
  blueprint: null,
  gamePhase: 'lobby',
  gmMode: 'human',
  gmApiKey: '',
  turnTimerEnabled: false,
  turnTimerDuration: 60,
  myPlayerId: null,
  isHost: false,
  gameState: null,
};

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

function gameReducer(state, action) {
  switch (action.type) {
    case GameActions.SET_BLUEPRINT:
      return { ...state, blueprint: action.payload };

    case GameActions.SET_GAME_PHASE:
      return { ...state, gamePhase: action.payload };

    case GameActions.SET_GM_MODE:
      return { ...state, gmMode: action.payload };

    case GameActions.SET_GM_API_KEY:
      return { ...state, gmApiKey: action.payload };

    case GameActions.SET_TURN_TIMER:
      return {
        ...state,
        turnTimerEnabled: action.payload.turnTimerEnabled,
        turnTimerDuration: action.payload.turnTimerDuration,
      };

    case GameActions.SET_MY_PLAYER_ID:
      return { ...state, myPlayerId: action.payload };

    case GameActions.SET_IS_HOST:
      return { ...state, isHost: action.payload };

    case GameActions.INIT_GAME_STATE:
      return {
        ...state,
        gamePhase: 'game',
        gameState: action.payload,
      };

    case GameActions.UPDATE_GAME_STATE:
      return {
        ...state,
        gameState: state.gameState
          ? { ...state.gameState, ...action.payload }
          : action.payload,
      };

    case GameActions.ADD_NARRATOR_ENTRY: {
      if (!state.gameState) return state;
      const entry = {
        id: `narrator-${Date.now()}-${Math.floor(
          (crypto.getRandomValues(new Uint32Array(1))[0] / 0xffffffff) * 1e6
        )}`,
        text: action.payload.text,
        type: action.payload.type ?? 'info',
        timestamp: Date.now(),
      };
      return {
        ...state,
        gameState: {
          ...state.gameState,
          narratorLog: [...state.gameState.narratorLog, entry],
        },
      };
    }

    case GameActions.UPDATE_PLAYER: {
      if (!state.gameState) return state;
      const { id, updates } = action.payload;
      const existingPlayer = state.gameState.players[id];
      if (!existingPlayer) return state;
      return {
        ...state,
        gameState: {
          ...state.gameState,
          players: {
            ...state.gameState.players,
            [id]: { ...existingPlayer, ...updates },
          },
        },
      };
    }

    case GameActions.UPDATE_BOSS: {
      if (!state.gameState || !state.gameState.boss) return state;
      return {
        ...state,
        gameState: {
          ...state.gameState,
          boss: { ...state.gameState.boss, ...action.payload },
        },
      };
    }

    case GameActions.RESET:
      return { ...initialState };

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export const GameContext = createContext(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  // Convenience methods — stable references via useCallback
  const setBlueprint = useCallback(
    (blueprint) => dispatch({ type: GameActions.SET_BLUEPRINT, payload: blueprint }),
    []
  );

  const setGamePhase = useCallback(
    (phase) => dispatch({ type: GameActions.SET_GAME_PHASE, payload: phase }),
    []
  );

  const setGmMode = useCallback(
    (mode) => dispatch({ type: GameActions.SET_GM_MODE, payload: mode }),
    []
  );

  const setGmApiKey = useCallback(
    (key) => dispatch({ type: GameActions.SET_GM_API_KEY, payload: key }),
    []
  );

  const setTurnTimer = useCallback(
    ({ turnTimerEnabled, turnTimerDuration }) =>
      dispatch({
        type: GameActions.SET_TURN_TIMER,
        payload: { turnTimerEnabled, turnTimerDuration },
      }),
    []
  );

  const setMyPlayerId = useCallback(
    (id) => dispatch({ type: GameActions.SET_MY_PLAYER_ID, payload: id }),
    []
  );

  const setIsHost = useCallback(
    (isHost) => dispatch({ type: GameActions.SET_IS_HOST, payload: isHost }),
    []
  );

  const initGameState = useCallback(
    (gameState) => dispatch({ type: GameActions.INIT_GAME_STATE, payload: gameState }),
    []
  );

  const updateGameState = useCallback(
    (updates) => dispatch({ type: GameActions.UPDATE_GAME_STATE, payload: updates }),
    []
  );

  const addNarratorEntry = useCallback(
    ({ text, type = 'info' }) =>
      dispatch({ type: GameActions.ADD_NARRATOR_ENTRY, payload: { text, type } }),
    []
  );

  const updatePlayer = useCallback(
    ({ id, updates }) =>
      dispatch({ type: GameActions.UPDATE_PLAYER, payload: { id, updates } }),
    []
  );

  const updateBoss = useCallback(
    (updates) => dispatch({ type: GameActions.UPDATE_BOSS, payload: updates }),
    []
  );

  const reset = useCallback(
    () => dispatch({ type: GameActions.RESET }),
    []
  );

  const value = {
    // State
    ...state,
    // Raw dispatch for advanced use
    dispatch,
    // Convenience methods
    setBlueprint,
    setGamePhase,
    setGmMode,
    setGmApiKey,
    setTurnTimer,
    setMyPlayerId,
    setIsHost,
    initGameState,
    updateGameState,
    addNarratorEntry,
    updatePlayer,
    updateBoss,
    reset,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useGameContext() {
  const context = useContext(GameContext);
  if (context === null) {
    throw new Error('useGameContext must be used within a GameProvider');
  }
  return context;
}
