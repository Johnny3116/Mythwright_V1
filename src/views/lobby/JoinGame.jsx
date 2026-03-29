import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameEngine } from '@hooks/useGameEngine.js';
import { usePeerConnection } from '@hooks/usePeerConnection.js';
import { useNetworkContext } from '@context/NetworkContext.jsx';
import { useToast } from '@context/ToastContext.jsx';
import { MessageTypes, createMessage } from '@network/MessageTypes.js';
import { ActionButton } from '@components/ActionButton.jsx';
import styles from './lobby.module.css';

export function JoinGame() {
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const { joinGame, status, error } = usePeerConnection();
  const { sendToHost } = useNetworkContext();
  const { addToast } = useToast();

  async function handleJoin() {
    if (!roomCode.trim() || !playerName.trim()) return;
    try {
      await joinGame(roomCode.trim().toUpperCase());
      // Send join message to host — connection is open at this point, 500ms is defensive buffer
      setTimeout(() => {
        sendToHost(createMessage(MessageTypes.PLAYER_JOIN, { playerName }));
      }, 500);
      navigate('/character-select');
    } catch (err) {
      addToast(
        `Could not join room "${roomCode.trim().toUpperCase()}". Check the code and try again.`,
        'error'
      );
    }
  }

  return (
    <div className={styles.panel}>
      <div className={styles.joinSection}>
        <div className={styles.formGroup} style={{ width: '100%' }}>
          <label className={styles.formLabel}>Your Name</label>
          <input
            className={styles.formInput}
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter your name"
            maxLength={20}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Room Code</label>
          <input
            className={styles.roomCodeInput}
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            placeholder="XXXXXX"
            maxLength={8}
          />
        </div>

        <ActionButton
          variant="primary"
          className={styles.startBtn}
          onClick={handleJoin}
          disabled={!roomCode.trim() || !playerName.trim() || status === 'connecting'}
        >
          {status === 'connecting' ? 'Connecting...' : 'Join Game'}
        </ActionButton>

        {error && <div className={styles.errorText}>{error}</div>}
      </div>
    </div>
  );
}
