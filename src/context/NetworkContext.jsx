import { createContext, useContext, useReducer, useRef, useCallback } from 'react';
import { createRoom, joinRoom, broadcast, sendTo, destroyPeer } from '@network/PeerManager.js';
import { broadcastState, sendPlayerAction, sendPlayerJoin } from '@network/StateSync.js';
import { MessageTypes, createMessage } from '@network/MessageTypes.js';

const NetworkContext = createContext(null);

const initialNetworkState = {
  isHost: false,
  roomCode: null,
  peer: null,
  hostConnection: null,  // player-side: connection to host
  connections: [],       // host-side: connections to all players
  connectedPeers: [],    // array of peerId strings
  status: 'idle',        // 'idle' | 'connecting' | 'connected' | 'error'
  error: null,
  myPeerId: null,
  isDisconnected: false, // true when host connection drops mid-game
  disconnectedPeers: [], // host-side: peers that have disconnected mid-game
};

function networkReducer(state, action) {
  switch (action.type) {
    case 'SET_STATUS':
      return { ...state, status: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, status: 'error' };
    case 'HOST_CONNECTED':
      return {
        ...state,
        isHost: true,
        roomCode: action.payload.roomCode,
        peer: action.payload.peer,
        myPeerId: action.payload.roomCode,
        status: 'connected',
        error: null,
      };
    case 'PLAYER_CONNECTED':
      return {
        ...state,
        isHost: false,
        roomCode: action.payload.roomCode,
        peer: action.payload.peer,
        hostConnection: action.payload.hostConnection,
        myPeerId: action.payload.peer?.id || null,
        status: 'connected',
        error: null,
      };
    case 'PEER_JOINED':
      return {
        ...state,
        connections: [...state.connections, action.payload.connection],
        connectedPeers: [...state.connectedPeers, action.payload.peerId],
      };
    case 'PEER_LEFT':
      return {
        ...state,
        connections: state.connections.filter(c => c.peer !== action.payload.peerId),
        connectedPeers: state.connectedPeers.filter(id => id !== action.payload.peerId),
        disconnectedPeers: [...state.disconnectedPeers, action.payload.peerId],
      };
    case 'SET_DISCONNECTED':
      return { ...state, isDisconnected: true, status: 'error' };
    case 'CLEAR_DISCONNECTED':
      return { ...state, isDisconnected: false, disconnectedPeers: [] };
    case 'RESET':
      return { ...initialNetworkState };
    default:
      return state;
  }
}

export function NetworkProvider({ children }) {
  const [network, dispatch] = useReducer(networkReducer, initialNetworkState);
  const connectionsRef = useRef([]);
  const onMessageRef = useRef(null);
  // Monotonic version counter: only apply incoming state updates with a strictly
  // higher version than the last one applied, preventing stale overwrites.
  const lastStateVersionRef = useRef(0);

  /**
   * Set a callback to be invoked when any message is received.
   * @param {Function} handler - (message, fromPeerId) => void
   */
  const setMessageHandler = useCallback((handler) => {
    onMessageRef.current = handler;
  }, []);

  /**
   * Create a game room as host.
   */
  const hostGame = useCallback(async () => {
    dispatch({ type: 'SET_STATUS', payload: 'connecting' });
    try {
      const { peer, roomCode } = await createRoom();

      peer.on('connection', (conn) => {
        conn.on('open', () => {
          connectionsRef.current = [...connectionsRef.current, conn];
          dispatch({ type: 'PEER_JOINED', payload: { connection: conn, peerId: conn.peer } });

          conn.on('data', (rawData) => {
            try {
              const msg = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
              if (onMessageRef.current) {
                onMessageRef.current(msg, conn.peer);
              }
            } catch (err) {
              console.warn('Invalid message from', conn.peer, err);
            }
          });

          conn.on('close', () => {
            connectionsRef.current = connectionsRef.current.filter(c => c.peer !== conn.peer);
            dispatch({ type: 'PEER_LEFT', payload: { peerId: conn.peer } });
          });
        });
      });

      peer.on('error', (err) => {
        dispatch({ type: 'SET_ERROR', payload: err.message });
      });

      dispatch({ type: 'HOST_CONNECTED', payload: { peer, roomCode } });
      return roomCode;
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message });
      throw err;
    }
  }, []);

  /**
   * Join a game room as a player.
   * Sends PLAYER_JOIN immediately when the connection opens (no setTimeout hack).
   * @param {string} roomCode
   * @param {string} playerName
   */
  const joinGame = useCallback(async (roomCode, playerName) => {
    dispatch({ type: 'SET_STATUS', payload: 'connecting' });
    try {
      // joinRoom resolves only after hostConnection.on('open') fires in PeerManager,
      // so the connection is guaranteed open when this await returns.
      const { peer, hostConnection } = await joinRoom(roomCode);

      // Send PLAYER_JOIN immediately — connection is open at this point.
      const joinMsg = createMessage(MessageTypes.PLAYER_JOIN, { playerName: playerName || 'Player' });
      if (hostConnection.open) {
        hostConnection.send(joinMsg);
      }

      // Register error handler FIRST — before data/close — so no errors slip through
      hostConnection.on('error', (err) => {
        dispatch({ type: 'SET_ERROR', payload: err.message });
      });

      hostConnection.on('data', (rawData) => {
        try {
          const msg = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
          if (onMessageRef.current) {
            onMessageRef.current(msg, roomCode);
          }
        } catch (err) {
          console.warn('Invalid message from host', err);
        }
      });

      hostConnection.on('close', () => {
        dispatch({ type: 'SET_STATUS', payload: 'idle' });
        dispatch({ type: 'SET_DISCONNECTED' });
      });

      peer.on('error', (err) => {
        dispatch({ type: 'SET_ERROR', payload: err.message });
      });

      dispatch({ type: 'PLAYER_CONNECTED', payload: { peer, hostConnection, roomCode } });
      return { peer, hostConnection };
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message });
      throw err;
    }
  }, []);

  /**
   * Broadcast game state to all connected players (host only).
   * @param {object} gameState
   */
  const broadcastGameState = useCallback((gameState) => {
    broadcastState(connectionsRef.current, gameState);
  }, []);

  /**
   * Send a player action to the host.
   * @param {object} action
   */
  const sendAction = useCallback((action) => {
    if (network.hostConnection) {
      sendPlayerAction(network.hostConnection, action);
    }
  }, [network.hostConnection]);

  /**
   * Send a message directly to the host.
   * @param {object} message
   */
  const sendToHost = useCallback((message) => {
    if (network.hostConnection) {
      sendTo(network.hostConnection, message);
    }
  }, [network.hostConnection]);

  /**
   * Broadcast a custom message to all players.
   * @param {object} message
   */
  const broadcastMessage = useCallback((message) => {
    broadcast(connectionsRef.current, message);
  }, []);

  /**
   * Disconnect and clean up.
   */
  const disconnect = useCallback(() => {
    if (network.peer) {
      destroyPeer(network.peer);
    }
    connectionsRef.current = [];
    dispatch({ type: 'RESET' });
  }, [network.peer]);

  /**
   * Acknowledge and clear the disconnect notification.
   */
  const clearDisconnected = useCallback(() => {
    dispatch({ type: 'CLEAR_DISCONNECTED' });
  }, []);

  /**
   * Check if an incoming state version is newer than the last applied version.
   * Returns true and advances the counter if so; false if stale.
   * @param {number|undefined} version
   */
  const checkAndUpdateStateVersion = useCallback((version) => {
    if (typeof version !== 'number') return true; // no version attached — allow
    if (version <= lastStateVersionRef.current) return false; // stale, reject
    lastStateVersionRef.current = version;
    return true;
  }, []);

  const value = {
    network,
    connectionsRef,
    setMessageHandler,
    hostGame,
    joinGame,
    broadcastGameState,
    sendAction,
    sendToHost,
    broadcastMessage,
    disconnect,
    clearDisconnected,
    checkAndUpdateStateVersion,
  };

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetworkContext() {
  const context = useContext(NetworkContext);
  if (context === undefined || context === null) {
    throw new Error('useNetworkContext must be used within a NetworkProvider');
  }
  return context;
}
