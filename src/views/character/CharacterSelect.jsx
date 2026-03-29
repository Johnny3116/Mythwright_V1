import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './character.module.css';
import { ClassCard } from './ClassCard.jsx';
import { CharacterCustomize } from './CharacterCustomize.jsx';
import { useGameEngine } from '@hooks/useGameEngine.js';
import { usePeerConnection } from '@hooks/usePeerConnection.js';
import { useGameContext } from '@context/GameContext.jsx';
import { GameState } from '@engine/GameEngine.js';

export default function CharacterSelect() {
  const navigate = useNavigate();
  const { state } = useGameContext();
  const { selectClass, startGame, isHost } = useGameEngine();
  const { myPeerId } = usePeerConnection();
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [isReady, setIsReady] = useState(false);

  const blueprint = state.blueprint;
  const classes = blueprint?.classes || [];
  const players = state.players || {};
  const myPlayer = players[myPeerId];

  // Auto-redirect when host starts the game and broadcasts the new phase.
  // Players receive LOAD_STATE with phase === TURN_LOOP and navigate to /game.
  // The host navigates explicitly in handleStartGame, so this only fires for players.
  useEffect(() => {
    if (!isHost && state.phase === GameState.TURN_LOOP) {
      navigate('/game');
    }
  }, [state.phase, isHost, navigate]);

  function handleConfirm() {
    if (!selectedClassId || !playerName.trim() || !myPeerId) return;
    selectClass(myPeerId, selectedClassId, playerName.trim());
    setIsReady(true);
  }

  function handleStartGame() {
    startGame();
    navigate(isHost ? '/host' : '/game');
  }

  const allReady = Object.values(players).length > 0 &&
    Object.values(players).every(p => p.classId);

  return (
    <div className={styles.characterSelect}>
      <div className={styles.header}>
        <h1 className={styles.title}>Choose Your Class</h1>
        <p className={styles.subtitle}>
          {blueprint ? blueprint.meta.title : 'Select your role in the hunt'}
        </p>
      </div>

      <div className={styles.classGrid}>
        {classes.map(cls => (
          <ClassCard
            key={cls.id}
            classData={cls}
            selected={selectedClassId === cls.id}
            onClick={() => !isReady && setSelectedClassId(cls.id)}
          />
        ))}
      </div>

      <CharacterCustomize
        playerName={playerName}
        onNameChange={setPlayerName}
        selectedClass={classes.find(c => c.id === selectedClassId)}
        onConfirm={handleConfirm}
        isReady={isReady}
      />

      {Object.keys(players).length > 0 && (
        <div className={styles.waitingList}>
          {Object.values(players).map(p => (
            <div
              key={p.id}
              className={`${styles.waitingItem} ${p.classId ? styles.waitingItemReady : ''}`}
            >
              <span>{p.classIcon || '🧑'}</span>
              <span>{p.name}</span>
              <span>{p.classId ? `✓ ${p.className}` : 'Choosing...'}</span>
            </div>
          ))}
        </div>
      )}

      {isHost && allReady && (
        <div style={{ marginTop: 'var(--space-6)' }}>
          <button
            style={{
              padding: 'var(--space-4) var(--space-8)',
              background: 'var(--accent-primary)',
              border: 'none',
              borderRadius: 'var(--border-radius-md)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-lg)',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
            onClick={handleStartGame}
          >
            Begin the Hunt
          </button>
        </div>
      )}
    </div>
  );
}
