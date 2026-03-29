import styles from './components.module.css';

/**
 * DisconnectOverlay — Full-screen overlay shown when a player loses connection.
 *
 * Props:
 *   isHost       {boolean}  True if the current tab is the host.
 *   disconnected {string[]} Array of disconnected peer IDs (host view).
 *   onDismiss    {Function} Called when the user acknowledges and dismisses.
 *   onReturnToLobby {Function} Called when the user gives up and returns to lobby.
 */
export function DisconnectOverlay({ isHost, disconnected = [], onDismiss, onReturnToLobby }) {
  const message = isHost
    ? `${disconnected.length} player${disconnected.length !== 1 ? 's' : ''} disconnected. They may reconnect automatically.`
    : 'Connection to host lost. Waiting for reconnect…';

  return (
    <div className={styles.disconnectOverlay} role="alertdialog" aria-live="assertive" aria-label="Disconnected">
      <div className={styles.disconnectPanel}>
        <div className={styles.disconnectIcon}>📡</div>
        <h2 className={styles.disconnectTitle}>Connection Lost</h2>
        <p className={styles.disconnectMessage}>{message}</p>
        <div className={styles.disconnectActions}>
          {onDismiss && (
            <button className={styles.disconnectBtnSecondary} onClick={onDismiss} type="button">
              Dismiss
            </button>
          )}
          {onReturnToLobby && (
            <button className={styles.disconnectBtnPrimary} onClick={onReturnToLobby} type="button">
              Return to Lobby
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
