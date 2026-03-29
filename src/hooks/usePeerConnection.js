/**
 * usePeerConnection — React hook wrapping PeerJS connection management
 */

import { useCallback } from 'react';
import { useNetworkContext } from '@context/NetworkContext.jsx';

export function usePeerConnection() {
  const {
    network,
    hostGame,
    joinGame,
    broadcastGameState,
    sendAction,
    sendToHost,
    broadcastMessage,
    disconnect,
    clearDisconnected,
    setMessageHandler,
  } = useNetworkContext();

  return {
    isHost: network.isHost,
    roomCode: network.roomCode,
    myPeerId: network.myPeerId,
    connectedPeers: network.connectedPeers,
    disconnectedPeers: network.disconnectedPeers,
    isDisconnected: network.isDisconnected,
    status: network.status,
    error: network.error,
    // Actions
    hostGame,
    joinGame,
    broadcastGameState,
    sendAction,
    sendToHost,
    broadcastMessage,
    disconnect,
    clearDisconnected,
    setMessageHandler,
  };
}
