import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameContext } from '@context/GameContext';
import { usePeerConnection } from '@hooks/usePeerConnection';
import styles from './lobby.module.css';

// Dots animation — cycles between "", ".", "..", "..."
function WaitingDots() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setCount((c) => (c + 1) % 4), 600);
    return () => clearInterval(id);
  }, []);
  return <span className={styles.waitingDots}>{'.'.repeat(count)}</span>;
}

/**
 * JoinGame — Room entry flow for player clients.
 */
export function JoinGame() {
  const navigate = useNavigate();
  const { blueprint } = useGameContext();
  const {
    joinRoom,
    roomCode: networkRoomCode,
    players,
    connected,
    connectionStatus,
    errorMessage,
  } = usePeerConnection();

  // -------------------------------------------------------------------------
  // Local form state
  // -------------------------------------------------------------------------

  const [name, setName] = useState('');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [status, setStatus] = useState('idle'); // idle | connecting | connected | error
  const [localError, setLocalError] = useState('');

  const nameRef = useRef(null);

  // Focus name field on mount
  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  // -------------------------------------------------------------------------
  // Sync network status into local state
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (connectionStatus === 'connected' && status === 'connecting') {
      setStatus('connected');
    } else if (connectionStatus === 'error' && status === 'connecting') {
      setStatus('error');
      setLocalError(errorMessage ?? 'Failed to connect. Check the room code and try again.');
    }
  }, [connectionStatus, status, errorMessage]);

  // Navigate when host starts the game (gamePhase transitions to 'game')
  // This will be fully wired in Phase 5 integration; placeholder hook here.
  // For now, the player stays in the waiting state.

  // -------------------------------------------------------------------------
  // Validation
  // -------------------------------------------------------------------------

  const validate = () => {
    if (!name.trim()) {
      setLocalError('Please enter your name.');
      return false;
    }
    if (roomCodeInput.trim().length !== 6) {
      setLocalError('Room code must be 6 characters.');
      return false;
    }
    return true;
  };

  // -------------------------------------------------------------------------
  // Join handler
  // -------------------------------------------------------------------------

  const handleJoin = useCallback(() => {
    setLocalError('');
    if (!validate()) return;

    setStatus('connecting');
    joinRoom(roomCodeInput.trim().toUpperCase());
  }, [name, roomCodeInput, joinRoom]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && status === 'idle') {
        handleJoin();
      }
    },
    [handleJoin, status]
  );

  // -------------------------------------------------------------------------
  // Room code input — auto-uppercase, max 6 chars
  // -------------------------------------------------------------------------

  const handleCodeChange = useCallback((e) => {
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setRoomCodeInput(val);
  }, []);

  // -------------------------------------------------------------------------
  // Render: Waiting state
  // -------------------------------------------------------------------------

  if (status === 'connected') {
    const campaignTitle = blueprint?.meta?.title ?? null;
    const displayRoomCode = networkRoomCode ?? roomCodeInput.toUpperCase();

    return (
      <div className={`${styles.joinGame}`}>
        <div className={styles.waitingState}>
          {/* Campaign / host info */}
          <div className={styles.waitingHeader}>
            <span className={styles.waitingIcon}>⚔️</span>
            <h2 className={styles.campaignTitle}>
              {campaignTitle ?? 'Waiting for host…'}
            </h2>
            <p className={styles.waitingMessage}>
              Waiting for the host to start the game
              <WaitingDots />
            </p>
            <span className={styles.connectedRoomCode}>{displayRoomCode}</span>
          </div>

          {/* Connected players */}
          {players.length > 0 && (
            <div className={styles.section} style={{ marginBottom: 0 }}>
              <h3 className={styles.sectionTitle}>
                Players ({players.length})
              </h3>
              <div className={styles.playerList}>
                {players.map((player) => (
                  <div key={player.id} className={styles.playerItem}>
                    <span
                      className={`${styles.playerStatusDot} ${
                        player.ready ? styles.playerReady : styles.playerNotReady
                      }`}
                    />
                    <span className={styles.playerName}>
                      {player.name ?? 'Unknown'}
                      {player.name === name && (
                        <span
                          style={{
                            marginLeft: 'var(--space-2)',
                            fontSize: 'var(--text-xs)',
                            color: 'var(--text-muted)',
                          }}
                        >
                          (you)
                        </span>
                      )}
                    </span>
                    {player.className && (
                      <span className={styles.playerClass}>{player.className}</span>
                    )}
                    {player.isHost && (
                      <span className={styles.crownIcon} title="Host">♛</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Join form (idle / connecting / error)
  // -------------------------------------------------------------------------

  const isConnecting = status === 'connecting';

  return (
    <div className={styles.joinGame}>
      {/* Error banner */}
      {(status === 'error' || localError) && (
        <div className={styles.section} style={{ paddingBottom: 'var(--space-4)' }}>
          <div className={styles.errorBanner}>
            <span className={styles.errorBannerIcon}>⚠</span>
            <span className={styles.errorBannerText}>
              {localError || errorMessage || 'An unknown error occurred.'}
            </span>
          </div>
        </div>
      )}

      {/* Form */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Your Details</h3>
        <div className={styles.joinFormRow}>
          {/* Player name */}
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel} htmlFor="join-name">
              Your Name
            </label>
            <input
              ref={nameRef}
              id="join-name"
              type="text"
              className={styles.nameInput}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter your name"
              maxLength={24}
              disabled={isConnecting}
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          {/* Room code */}
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel} htmlFor="join-code">
              Room Code
            </label>
            <input
              id="join-code"
              type="text"
              className={styles.codeInput}
              value={roomCodeInput}
              onChange={handleCodeChange}
              onKeyDown={handleKeyDown}
              placeholder="XXXXXX"
              maxLength={6}
              disabled={isConnecting}
              autoComplete="off"
              spellCheck={false}
              inputMode="text"
              aria-label="6-character room code"
            />
          </div>
        </div>
      </div>

      {/* Join button */}
      <button
        type="button"
        className={styles.joinButton}
        onClick={handleJoin}
        disabled={isConnecting || !name.trim() || roomCodeInput.length !== 6}
        aria-label={isConnecting ? 'Connecting to room…' : 'Join game room'}
      >
        {isConnecting ? (
          <span className={styles.joinButtonConnecting}>
            <span className={styles.joinSpinner} />
            Connecting…
          </span>
        ) : (
          'Join Game'
        )}
      </button>
    </div>
  );
}
