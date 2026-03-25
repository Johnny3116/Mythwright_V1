import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameContext, GameActions } from '@context/GameContext';
import { usePeerConnection } from '@hooks/usePeerConnection';
import { CampaignUpload } from './CampaignUpload';
import { HostEditor } from './HostEditor';
import styles from './lobby.module.css';

// ---------------------------------------------------------------------------
// GM mode definitions
// ---------------------------------------------------------------------------

const GM_MODES = [
  {
    id: 'human',
    icon: '🎲',
    title: 'Human Host',
    desc: 'Full manual control over boss turns, narrative, and dice overrides.',
  },
  {
    id: 'scripted',
    icon: '⚙️',
    title: 'Scripted',
    desc: 'Auto-resolves boss turns using blueprint-defined behavior trees.',
  },
  {
    id: 'ai',
    icon: '🤖',
    title: 'AI Driver',
    desc: 'Dynamic AI storytelling and tactical boss decisions.',
    badge: 'Beta',
  },
];

// ---------------------------------------------------------------------------
// PlayerItem — single row in the player list
// ---------------------------------------------------------------------------

function PlayerItem({ player, isHost: playerIsHost }) {
  return (
    <div className={styles.playerItem}>
      <span
        className={`${styles.playerStatusDot} ${
          player.ready ? styles.playerReady : styles.playerNotReady
        }`}
        title={player.ready ? 'Ready' : 'Not ready'}
      />
      <span className={styles.playerName}>{player.name ?? 'Unknown'}</span>
      {player.className && (
        <span className={styles.playerClass}>{player.className}</span>
      )}
      <span className={styles.playerReadyLabel}>
        {player.ready ? 'Ready' : 'Waiting'}
      </span>
      {playerIsHost && <span className={styles.crownIcon} title="Host">♛</span>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CreateGame
// ---------------------------------------------------------------------------

/**
 * CreateGame — Full room creation flow for the game host.
 */
export function CreateGame() {
  const navigate = useNavigate();
  const { dispatch } = useGameContext();
  const {
    createRoom,
    roomCode,
    players,
    connected,
    isHost,
  } = usePeerConnection();

  // Local UI state
  const [blueprint, setBlueprint] = useState(null);
  const [gmMode, setGmMode] = useState('human');
  const [gmApiKey, setGmApiKey] = useState('');
  const [turnTimerEnabled, setTurnTimerEnabled] = useState(false);
  const [turnTimerDuration, setTurnTimerDuration] = useState(60);
  const [copied, setCopied] = useState(false);
  const [roomCreated, setRoomCreated] = useState(false);

  // -------------------------------------------------------------------------
  // Blueprint loaded callback
  // -------------------------------------------------------------------------

  const handleBlueprintLoaded = useCallback((loaded) => {
    setBlueprint(loaded);
  }, []);

  const handleBlueprintChange = useCallback((updated) => {
    setBlueprint(updated);
  }, []);

  // -------------------------------------------------------------------------
  // Create room
  // -------------------------------------------------------------------------

  const handleCreateRoom = useCallback(() => {
    createRoom();
    setRoomCreated(true);
  }, [createRoom]);

  // -------------------------------------------------------------------------
  // Copy room code
  // -------------------------------------------------------------------------

  const handleCopy = useCallback(() => {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [roomCode]);

  // -------------------------------------------------------------------------
  // Start adventure
  // -------------------------------------------------------------------------

  const allReady = players.length > 0 && players.every((p) => p.ready);
  const canStart = blueprint !== null && roomCreated && connected && allReady;

  const handleStartAdventure = useCallback(() => {
    if (!canStart) return;

    // Commit all settings to GameContext
    dispatch({ type: GameActions.SET_BLUEPRINT, payload: blueprint });
    dispatch({ type: GameActions.SET_GM_MODE, payload: gmMode });
    if (gmApiKey) {
      dispatch({ type: GameActions.SET_GM_API_KEY, payload: gmApiKey });
    }
    dispatch({
      type: GameActions.SET_TURN_TIMER,
      payload: { turnTimerEnabled, turnTimerDuration },
    });
    dispatch({ type: GameActions.SET_IS_HOST, payload: true });

    // Host navigates to host view; players receive a navigation event via network
    if (isHost) {
      navigate('/host');
    } else {
      navigate('/game');
    }
  }, [
    canStart,
    dispatch,
    blueprint,
    gmMode,
    gmApiKey,
    turnTimerEnabled,
    turnTimerDuration,
    isHost,
    navigate,
  ]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className={styles.createGame}>

      {/* ── Upload Section ── */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Campaign Blueprint</h3>
        <CampaignUpload onBlueprintLoaded={handleBlueprintLoaded} />
      </div>

      {/* ── Blueprint Editor (shown after upload) ── */}
      {blueprint && (
        <div className={styles.section}>
          <HostEditor blueprint={blueprint} onChange={handleBlueprintChange} />
        </div>
      )}

      {/* ── GM Mode ── */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Game Master Mode</h3>
        <div className={styles.gmModeCards}>
          {GM_MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              className={`${styles.gmCard} ${gmMode === mode.id ? styles.gmCardSelected : ''}`}
              onClick={() => setGmMode(mode.id)}
              aria-pressed={gmMode === mode.id}
            >
              {mode.badge && <span className={styles.gmCardBadge}>{mode.badge}</span>}
              <span className={styles.gmCardIcon}>{mode.icon}</span>
              <span className={styles.gmCardTitle}>{mode.title}</span>
              <span className={styles.gmCardDesc}>{mode.desc}</span>
            </button>
          ))}
        </div>

        {/* API key field — only shown when AI Driver is selected */}
        {gmMode === 'ai' && (
          <div className={styles.apiKeyField} style={{ marginTop: 'var(--space-4)' }}>
            <label className={styles.apiKeyLabel} htmlFor="api-key-input">
              API Key
            </label>
            <input
              id="api-key-input"
              type="password"
              className={styles.apiKeyInput}
              value={gmApiKey}
              onChange={(e) => setGmApiKey(e.target.value)}
              placeholder="sk-… or claude-…"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        )}
      </div>

      {/* ── Turn Timer ── */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Turn Timer</h3>
        <div className={styles.timerRow}>
          <div className={styles.timerToggleRow}>
            <label className={styles.toggle} htmlFor="timer-toggle">
              <input
                id="timer-toggle"
                type="checkbox"
                className={styles.toggleInput}
                checked={turnTimerEnabled}
                onChange={(e) => setTurnTimerEnabled(e.target.checked)}
              />
              <span className={styles.toggleSlider} />
            </label>
            <label
              className={styles.timerToggleLabel}
              htmlFor="timer-toggle"
            >
              {turnTimerEnabled ? 'Enabled' : 'Disabled'}
            </label>
          </div>

          {turnTimerEnabled && (
            <div className={styles.timerSliderWrapper}>
              <input
                id="timer-slider"
                type="range"
                className={styles.timerSlider}
                min={30}
                max={120}
                step={5}
                value={turnTimerDuration}
                onChange={(e) => setTurnTimerDuration(Number(e.target.value))}
                aria-label={`Turn timer duration: ${turnTimerDuration} seconds`}
              />
              <span className={styles.timerValue}>{turnTimerDuration}s</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Create Room / Room Code ── */}
      {!roomCreated ? (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Room</h3>
          <button
            type="button"
            className={`${styles.joinButton}`}
            style={{
              margin: 0,
              borderColor: 'var(--accent-secondary)',
              color: 'var(--accent-secondary)',
            }}
            onClick={handleCreateRoom}
            disabled={!blueprint}
            aria-label="Create a new game room and generate a room code"
          >
            Create Room
          </button>
          {!blueprint && (
            <p
              style={{
                marginTop: 'var(--space-2)',
                fontSize: 'var(--text-xs)',
                color: 'var(--text-muted)',
                textAlign: 'center',
              }}
            >
              Upload a campaign blueprint first.
            </p>
          )}
        </div>
      ) : (
        <>
          {/* Room Code Display */}
          <div className={`${styles.section} ${styles.roomCodeSection}`}>
            <h3 className={styles.sectionTitle}>Room Code</h3>
            <div className={styles.roomCodeBox}>
              <span className={styles.roomCodeLabel}>Code</span>
              <span className={styles.roomCode}>{roomCode}</span>
              <button
                type="button"
                className={`${styles.copyButton} ${copied ? styles.copyButtonCopied : ''}`}
                onClick={handleCopy}
                aria-label="Copy room code to clipboard"
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Player List */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>
              Players ({players.length})
            </h3>
            {players.length === 0 ? (
              <div className={styles.playerCountHint}>
                Waiting for players to join with code{' '}
                <strong
                  style={{
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--accent-secondary)',
                  }}
                >
                  {roomCode}
                </strong>
                …
              </div>
            ) : (
              <div className={styles.playerList}>
                {players.map((player) => (
                  <PlayerItem
                    key={player.id}
                    player={player}
                    isHost={player.isHost === true}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Start Adventure Button ── */}
      <button
        type="button"
        className={`${styles.startButton} ${
          canStart ? styles.startButtonReady : styles.startButtonDisabled
        }`}
        onClick={handleStartAdventure}
        disabled={!canStart}
        aria-label={
          canStart
            ? 'Start the adventure'
            : 'Waiting for players to be ready before starting'
        }
      >
        {canStart ? 'Begin the Adventure' : 'Awaiting Players…'}
      </button>

      {/* Start button hint */}
      {!canStart && roomCreated && (
        <p
          style={{
            marginTop: 'var(--space-2)',
            fontSize: 'var(--text-xs)',
            color: 'var(--text-muted)',
            textAlign: 'center',
          }}
        >
          {players.length === 0
            ? 'At least one player must join.'
            : 'All players must be ready.'}
        </p>
      )}
    </div>
  );
}
