import { useEffect, useRef, useState } from 'react';
import styles from './components.module.css';

/**
 * DisconnectOverlay — Shown to players when the host connection is lost.
 *
 * Monitors `networkStatus` and triggers when it drops from 'connected' → 'idle'
 * while a game is in progress (phase !== 'LOBBY').
 *
 * Props:
 *   networkStatus {string}   Current value from usePeerConnection().status
 *   isHost        {boolean}  Hosts are never shown this overlay
 *   gamePhase     {string}   Current game phase — only show mid-game
 *   onReconnect   {Function} Called when user clicks "Try Again" → triggers page reload
 */
export function DisconnectOverlay({ networkStatus, isHost, gamePhase, onReconnect }) {
  const [visible, setVisible] = useState(false);
  const prevStatusRef = useRef(networkStatus);

  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = networkStatus;

    // Trigger when connection drops mid-game (was connected, now idle/error)
    if (
      !isHost &&
      gamePhase !== 'LOBBY' &&
      gamePhase !== null &&
      prev === 'connected' &&
      (networkStatus === 'idle' || networkStatus === 'error')
    ) {
      setVisible(true);
    }

    // Hide if reconnected
    if (networkStatus === 'connected') {
      setVisible(false);
    }
  }, [networkStatus, isHost, gamePhase]);

  if (!visible) return null;

  function handleReconnect() {
    if (onReconnect) {
      onReconnect();
    } else {
      window.location.href = '/';
    }
  }

  return (
    <div className={styles.disconnectOverlay} role="alertdialog" aria-label="Connection lost">
      <div className={styles.disconnectBox}>
        <div className={styles.disconnectIcon} aria-hidden="true">📡</div>
        <h2 className={styles.disconnectTitle}>Connection Lost</h2>
        <p className={styles.disconnectMsg}>
          The connection to the host was interrupted. Your progress may not be saved.
        </p>
        <div className={styles.disconnectActions}>
          <button className={styles.disconnectBtn} onClick={handleReconnect}>
            Return to Lobby
          </button>
        </div>
      </div>
    </div>
  );
}
