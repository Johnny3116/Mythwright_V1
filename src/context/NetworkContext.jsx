import { createContext, useCallback, useContext, useReducer } from 'react';

// ---------------------------------------------------------------------------
// Action type constants
// ---------------------------------------------------------------------------

export const NetworkActions = {
  SET_ROOM_CODE: 'SET_ROOM_CODE',
  SET_CONNECTED: 'SET_CONNECTED',
  SET_IS_HOST: 'SET_IS_HOST',
  ADD_PLAYER: 'ADD_PLAYER',
  REMOVE_PLAYER: 'REMOVE_PLAYER',
  UPDATE_PLAYER: 'UPDATE_PLAYER',
  SET_LATENCY: 'SET_LATENCY',
  SET_ERROR: 'SET_ERROR',
  RESET: 'RESET',
};

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const initialState = {
  connected: false,
  roomCode: null,
  players: [],
  latency: 0,
  isHost: false,
  connectionStatus: 'disconnected',
  errorMessage: null,
};

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

function networkReducer(state, action) {
  switch (action.type) {
    case NetworkActions.SET_ROOM_CODE:
      return { ...state, roomCode: action.payload };

    case NetworkActions.SET_CONNECTED:
      return {
        ...state,
        connected: action.payload,
        connectionStatus: action.payload ? 'connected' : 'disconnected',
        errorMessage: action.payload ? null : state.errorMessage,
      };

    case NetworkActions.SET_IS_HOST:
      return { ...state, isHost: action.payload };

    case NetworkActions.ADD_PLAYER: {
      // Prevent duplicate entries by id
      const exists = state.players.some((p) => p.id === action.payload.id);
      if (exists) {
        return {
          ...state,
          players: state.players.map((p) =>
            p.id === action.payload.id ? { ...p, ...action.payload } : p
          ),
        };
      }
      return { ...state, players: [...state.players, action.payload] };
    }

    case NetworkActions.REMOVE_PLAYER:
      return {
        ...state,
        players: state.players.filter((p) => p.id !== action.payload),
      };

    case NetworkActions.UPDATE_PLAYER:
      return {
        ...state,
        players: state.players.map((p) =>
          p.id === action.payload.id ? { ...p, ...action.payload.updates } : p
        ),
      };

    case NetworkActions.SET_LATENCY:
      return { ...state, latency: action.payload };

    case NetworkActions.SET_ERROR:
      return {
        ...state,
        connectionStatus: 'error',
        errorMessage: action.payload,
        connected: false,
      };

    case NetworkActions.RESET:
      return { ...initialState };

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export const NetworkContext = createContext(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function NetworkProvider({ children }) {
  const [state, dispatch] = useReducer(networkReducer, initialState);

  // Convenience methods
  const setRoomCode = useCallback(
    (code) => dispatch({ type: NetworkActions.SET_ROOM_CODE, payload: code }),
    []
  );

  const setConnected = useCallback(
    (connected) => dispatch({ type: NetworkActions.SET_CONNECTED, payload: connected }),
    []
  );

  const setIsHost = useCallback(
    (isHost) => dispatch({ type: NetworkActions.SET_IS_HOST, payload: isHost }),
    []
  );

  const addPlayer = useCallback(
    (player) => dispatch({ type: NetworkActions.ADD_PLAYER, payload: player }),
    []
  );

  const removePlayer = useCallback(
    (playerId) => dispatch({ type: NetworkActions.REMOVE_PLAYER, payload: playerId }),
    []
  );

  const updatePlayer = useCallback(
    ({ id, updates }) =>
      dispatch({ type: NetworkActions.UPDATE_PLAYER, payload: { id, updates } }),
    []
  );

  const setLatency = useCallback(
    (latency) => dispatch({ type: NetworkActions.SET_LATENCY, payload: latency }),
    []
  );

  const setError = useCallback(
    (message) => dispatch({ type: NetworkActions.SET_ERROR, payload: message }),
    []
  );

  const reset = useCallback(
    () => dispatch({ type: NetworkActions.RESET }),
    []
  );

  const value = {
    // State
    ...state,
    // Raw dispatch for advanced use
    dispatch,
    // Convenience methods
    setRoomCode,
    setConnected,
    setIsHost,
    addPlayer,
    removePlayer,
    updatePlayer,
    setLatency,
    setError,
    reset,
  };

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useNetworkContext() {
  const context = useContext(NetworkContext);
  if (context === null) {
    throw new Error('useNetworkContext must be used within a NetworkProvider');
  }
  return context;
}
