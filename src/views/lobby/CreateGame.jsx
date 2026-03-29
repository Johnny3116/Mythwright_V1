import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameEngine } from '@hooks/useGameEngine.js';
import { usePeerConnection } from '@hooks/usePeerConnection.js';
import { useGameContext } from '@context/GameContext.jsx';
import { ActionTypes } from '@engine/GameEngine.js';
import { CampaignUpload } from './CampaignUpload.jsx';
import { HostEditor } from './HostEditor.jsx';
import { ActionButton } from '@components/ActionButton.jsx';
import styles from './lobby.module.css';

export function CreateGame() {
  const navigate = useNavigate();
  const { state, dispatch, loadGame, loadError } = useGameContext();
  const { setBlueprint, setGmMode, registerPlayer, startCharacterSelect } = useGameEngine();
  const { hostGame, roomCode, connectedPeers, status, error } = usePeerConnection();
  const [playerName, setPlayerName] = useState('Host');
  const [apiKey, setApiKey] = useState('');
  const [gameStarted, setGameStarted] = useState(false);
  const loadInputRef = useRef(null);

  async function handleCreateRoom() {
    try {
      const code = await hostGame();
      registerPlayer(code, playerName, true);
    } catch (err) {
      console.error('Failed to create room:', err);
    }
  }

  function handleStart() {
    startCharacterSelect();
    setGameStarted(true);
    navigate('/character-select');
  }

  function copyCode() {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode).catch(() => {});
    }
  }

  return (
    <div className={styles.panel}>
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>Your Name</label>
        <input
          className={styles.formInput}
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="Host name"
          maxLength={20}
        />
      </div>

      <CampaignUpload onBlueprintLoaded={setBlueprint} />

      {state.blueprint && (
        <HostEditor
          blueprint={state.blueprint}
          gmMode={state.gmMode}
          onGmModeChange={setGmMode}
          apiKey={apiKey}
          onApiKeyChange={setApiKey}
        />
      )}

      {!roomCode && state.blueprint && (
        <div className={styles.actionRow}>
          <ActionButton
            variant="primary"
            onClick={handleCreateRoom}
            disabled={status === 'connecting'}
          >
            {status === 'connecting' ? 'Creating...' : 'Create Room'}
          </ActionButton>
        </div>
      )}

      {roomCode && (
        <div className={styles.roomSection}>
          <div className={styles.roomCodeHint}>Room Code — share with players</div>
          <div className={styles.roomCodeDisplay} onClick={copyCode} title="Click to copy">
            {roomCode}
          </div>
          <div className={styles.roomCodeHint}>Click code to copy</div>

          <div className={styles.playerList}>
            {Object.values(state.players).map(p => (
              <div key={p.id} className={styles.playerItem}>
                <span className={styles.playerItemIcon}>{p.classIcon || '🧑'}</span>
                <span className={styles.playerItemName}>{p.name}</span>
                {p.isHost && <span className={styles.playerItemHost}>HOST</span>}
              </div>
            ))}
            {connectedPeers.length === 0 && (
              <div className={styles.statusText}>Waiting for players to join...</div>
            )}
          </div>

          <div className={styles.actionRow} style={{ justifyContent: 'center', marginTop: 'var(--space-4)' }}>
            <ActionButton
              variant="primary"
              className={styles.startBtn}
              onClick={handleStart}
              disabled={Object.keys(state.players).length < 1}
            >
              Start Game
            </ActionButton>
          </div>
        </div>
      )}

      {error && <div className={styles.errorText}>Error: {error}</div>}

      {/* Load saved game */}
      {!roomCode && (
        <div className={styles.actionRow} style={{ justifyContent: 'center', borderTop: '1px solid var(--border-color)', paddingTop: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
          <input
            ref={loadInputRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files?.[0]) {
                loadGame(e.target.files[0]);
                e.target.value = '';
              }
            }}
          />
          <ActionButton
            onClick={() => loadInputRef.current?.click()}
          >
            💾 Load Saved Game
          </ActionButton>
        </div>
      )}

      {loadError && (
        <div className={styles.errorText} style={{ marginTop: 'var(--space-3)' }}>
          {loadError}
        </div>
      )}
    </div>
  );
}
