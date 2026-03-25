import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameContext } from '@context/GameContext';
import { useNetworkContext } from '@context/NetworkContext';
import { ClassCard } from './ClassCard';
import { CharacterCustomize } from './CharacterCustomize';
import styles from './character.module.css';

// ── Demo mock classes used when no blueprint is loaded ──────────────────────

const MOCK_CLASSES = [
  {
    id: 'assault',
    name: 'Assault',
    icon: '🔥',
    baseStats: { hp: 120, damage: [20, 30], defense: 10 },
    specialAbility: {
      name: 'Momentum Strike',
      description: 'Deals +50% damage after 3 consecutive hits',
    },
  },
  {
    id: 'trapper',
    name: 'Trapper',
    icon: '⚙️',
    baseStats: { hp: 100, damage: [15, 25], defense: 15 },
    specialAbility: {
      name: 'Snare',
      description: 'Snares the monster for 1 turn, stopping movement',
    },
  },
  {
    id: 'medic',
    name: 'Medic',
    icon: '🩺',
    baseStats: { hp: 90, damage: [10, 15], defense: 10 },
    specialAbility: {
      name: 'Field Heal',
      description: 'Heals teammates for 25 HP per turn',
    },
  },
  {
    id: 'support',
    name: 'Support',
    icon: '🛡️',
    baseStats: { hp: 110, damage: [10, 20], defense: 20 },
    specialAbility: {
      name: 'Deploy Shield',
      description: 'Reduces incoming damage by 50% for 2 turns',
    },
  },
];

// ── Helper to get network player name ──────────────────────────────────────

function getInitialName(players, myPlayerId) {
  if (!players || !myPlayerId) return '';
  const me = players.find((p) => p.id === myPlayerId);
  return me?.name ?? '';
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * CharacterSelect — Full character selection screen.
 *
 * Left 65%: class cards grid + customization panel under selected class.
 * Right 35%: party preview panel with ready-up and host start button.
 */
export default function CharacterSelect() {
  const navigate = useNavigate();
  const { blueprint, isHost, myPlayerId, setGamePhase } = useGameContext();
  const { players, roomCode, updatePlayer } = useNetworkContext();

  // Derive class list from blueprint or fall back to mock.
  const classes = blueprint?.classes ?? MOCK_CLASSES;
  const campaignTitle = blueprint?.meta?.title ?? 'Monster Hunt: Tzorath the Ancient';

  // Local state.
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [playerName, setPlayerName] = useState(() =>
    getInitialName(players, myPlayerId)
  );
  const [selectedColor, setSelectedColor] = useState('#c74a38');
  const [isReady, setIsReady] = useState(false);

  // Derive which class each player has taken (by id).
  // In demo mode players array may be sparse — be defensive.
  const takenClasses = {};
  players.forEach((p) => {
    if (p.classId && p.id !== myPlayerId) {
      takenClasses[p.classId] = p.name ?? 'Another player';
    }
  });

  // The selected class data object.
  const selectedClass = classes.find((c) => c.id === selectedClassId) ?? null;

  // Party slots: show 4 slots max, fill from players array.
  const MAX_SLOTS = blueprint?.meta?.playerCount?.max ?? 4;
  const partySlots = Array.from({ length: MAX_SLOTS }, (_, i) => players[i] ?? null);

  // Whether all players are ready (for the host start button).
  const allReady = players.length > 0 && players.every((p) => p.isReady);

  // ── Handlers ────────────────────────────────────────────────────────────

  function handleSelectClass(classId) {
    if (isReady) return; // Lock selections once ready.
    setSelectedClassId(classId);
  }

  function handleNameChange(name) {
    setPlayerName(name);
  }

  function handleColorChange(color) {
    setSelectedColor(color);
  }

  function handleReady() {
    if (!selectedClassId) return;
    const newReady = !isReady;
    setIsReady(newReady);
    if (myPlayerId) {
      updatePlayer({
        id: myPlayerId,
        updates: {
          classId: selectedClassId,
          name: playerName || 'Hunter',
          color: selectedColor,
          isReady: newReady,
        },
      });
    }
  }

  function handleStart() {
    if (!isHost) return;
    setGamePhase('game');
    navigate('/game');
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className={styles.characterSelect}>
      {/* ── Header ── */}
      <header className={styles.header}>
        <div className={styles.headerTitles}>
          <h1 className={styles.headerTitle}>Choose Your Hunter</h1>
          <span className={styles.headerCampaign}>{campaignTitle}</span>
        </div>
        <div className={styles.headerRight}>
          {roomCode && (
            <div className={styles.roomCodeBadge} aria-label={`Room code: ${roomCode}`}>
              <span>Room:</span>
              <span className={styles.roomCode}>{roomCode}</span>
            </div>
          )}
        </div>
      </header>

      {/* ── Main content ── */}
      <main className={styles.main}>
        <div>
          <p className={styles.sectionLabel}>Select a Class</p>
          <div className={styles.classGrid}>
            {classes.map((cls) => (
              <ClassCard
                key={cls.id}
                classData={cls}
                isSelected={selectedClassId === cls.id}
                isTaken={Boolean(takenClasses[cls.id])}
                takenByName={takenClasses[cls.id] ?? null}
                onSelect={handleSelectClass}
              />
            ))}
          </div>
        </div>

        {/* Customization panel — only shown when a class is selected */}
        {selectedClass && (
          <CharacterCustomize
            classData={selectedClass}
            playerName={playerName}
            onNameChange={handleNameChange}
            selectedColor={selectedColor}
            onColorChange={handleColorChange}
          />
        )}
      </main>

      {/* ── Party panel ── */}
      <aside className={styles.partyPanel}>
        <p className={styles.partyTitle}>Party ({players.length}/{MAX_SLOTS})</p>

        <div className={styles.partySlots}>
          {partySlots.map((player, idx) => (
            <PartySlot
              key={player?.id ?? `empty-${idx}`}
              player={player}
              classes={classes}
              isMe={player?.id === myPlayerId}
              localClass={selectedClass}
              localName={playerName}
              localColor={selectedColor}
              localIsReady={isReady}
            />
          ))}
        </div>

        <div className={styles.partyActions}>
          {!allReady && (
            <p className={styles.partyStatus}>
              {players.length === 0
                ? 'Waiting for players…'
                : 'Waiting for everyone to ready up…'}
            </p>
          )}

          {/* Ready button — visible to all players */}
          <button
            type="button"
            className={[styles.readyBtn, isReady ? styles.isReady : null]
              .filter(Boolean)
              .join(' ')}
            onClick={handleReady}
            disabled={!selectedClassId}
            aria-label={isReady ? 'Cancel ready' : 'Ready up'}
          >
            {isReady ? '✓ Ready!' : 'Ready Up'}
          </button>

          {/* Start Adventure — host only, all players ready */}
          {isHost && (
            <button
              type="button"
              className={styles.startBtn}
              onClick={handleStart}
              disabled={!allReady}
              aria-label="Start the adventure"
            >
              ⚔ Start Adventure
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}

// ── PartySlot ──────────────────────────────────────────────────────────────

/**
 * Renders one slot in the party panel.
 * If this slot is the local player, show the live (possibly uncommitted) selections.
 */
function PartySlot({ player, classes, isMe, localClass, localName, localColor, localIsReady }) {
  if (!player) {
    return (
      <div className={`${styles.partySlot} ${styles.waiting}`}>
        <div className={styles.partySlotAvatar} style={{ borderColor: 'var(--border-color)' }}>
          …
        </div>
        <span className={styles.partySlotEmpty}>Waiting for player…</span>
      </div>
    );
  }

  // Determine effective values — for the local player, use live local state.
  const effectiveClass = isMe && localClass
    ? localClass
    : classes.find((c) => c.id === player.classId) ?? null;

  const effectiveName = isMe ? (localName || 'You') : (player.name || 'Hunter');
  const effectiveColor = isMe ? localColor : (player.color ?? '#5a5855');
  const effectiveReady = isMe ? localIsReady : Boolean(player.isReady);

  return (
    <div className={`${styles.partySlot} ${styles.filled}`}>
      <div
        className={styles.partySlotAvatar}
        style={{ borderColor: effectiveColor, backgroundColor: `${effectiveColor}18` }}
        aria-hidden="true"
      >
        {effectiveClass?.icon ?? '?'}
      </div>
      <div className={styles.partySlotInfo}>
        <div className={styles.partySlotName}>
          {effectiveName}
          {isMe && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> (you)</span>}
        </div>
        <div className={styles.partySlotClass}>
          {effectiveClass?.name ?? 'No class selected'}
        </div>
      </div>
      {effectiveReady
        ? <span className={styles.readyBadge}>Ready</span>
        : <span className={styles.notReadyBadge}>Waiting</span>
      }
    </div>
  );
}
