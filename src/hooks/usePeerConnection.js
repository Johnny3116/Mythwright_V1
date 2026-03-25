import { useCallback } from 'react';
import { useNetworkContext } from '@context/NetworkContext';

/**
 * generateRoomCode — Produces a cryptographically random 6-character room code
 * using characters A-Z and 0-9.  Never uses Math.random().
 *
 * @returns {string} 6-character room code, e.g. "A4K9ZR"
 */
function generateRoomCode() {
  const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => CHARSET[b % CHARSET.length])
    .join('');
}

/**
 * usePeerConnection — Wraps NetworkContext and exposes room management helpers.
 *
 * In this phase the hook manages local connection state. The actual PeerJS
 * transport layer (src/network/PeerManager.js) will be wired in during
 * Phase 5 integration.
 */
export function usePeerConnection() {
  const {
    connected,
    roomCode,
    players,
    latency,
    isHost,
    connectionStatus,
    errorMessage,
    setRoomCode,
    setConnected,
    setIsHost,
    addPlayer,
    removePlayer,
    updatePlayer,
    setLatency,
    setError,
    reset,
  } = useNetworkContext();

  /**
   * createRoom — Generate a new room code, mark this peer as host, and
   * transition to connected state.
   *
   * @returns {string} The newly generated room code.
   */
  const createRoom = useCallback(() => {
    const code = generateRoomCode();
    setRoomCode(code);
    setIsHost(true);
    setConnected(true);
    return code;
  }, [setRoomCode, setIsHost, setConnected]);

  /**
   * joinRoom — Accept an existing room code and transition to connected state
   * as a non-host peer.
   *
   * @param {string} code - The room code to join (case-insensitive).
   * @returns {void}
   */
  const joinRoom = useCallback(
    (code) => {
      const normalized = (code ?? '').toUpperCase().trim();
      setRoomCode(normalized);
      setIsHost(false);
      setConnected(true);
    },
    [setRoomCode, setIsHost, setConnected]
  );

  return {
    // State
    connected,
    roomCode,
    players,
    latency,
    isHost,
    connectionStatus,
    errorMessage,
    // Room management
    createRoom,
    joinRoom,
    // Player management (forwarded from context)
    addPlayer,
    removePlayer,
    updatePlayer,
    setLatency,
    setError,
    reset,
  };
}
