import { useState } from 'react';
import styles from './host.module.css';

// ---------------------------------------------------------------------------
// Available event triggers
// ---------------------------------------------------------------------------

const TRIGGER_EVENTS = [
  { value: 'force_evolution',  label: 'Force Evolution' },
  { value: 'spawn_wildlife',   label: 'Spawn Wildlife' },
  { value: 'spawn_flora',      label: 'Spawn Flora' },
  { value: 'trigger_trap',     label: 'Trigger Trap' },
  { value: 'apply_status',     label: 'Apply Status Effect' },
  { value: 'clear_effects',    label: 'Clear All Effects' },
  { value: 'heal_all',         label: 'Heal All Players' },
  { value: 'damage_all',       label: 'Damage All Players' },
];

// ---------------------------------------------------------------------------
// GMControls
// ---------------------------------------------------------------------------

/**
 * GMControls — Host-only game master control panel.
 *
 * Props:
 *   onAdvanceStory  {function}  ()         → void
 *   onOverrideDice  {function}  (value)    → void
 *   onTriggerEvent  {function}  (eventId)  → void
 *   onSkipTurn      {function}  ()         → void
 *   onPauseGame     {function}  ()         → void
 *   onEndGame       {function}  (outcome)  → void  — 'victory' | 'defeat'
 */
export function GMControls({
  onAdvanceStory,
  onOverrideDice,
  onTriggerEvent,
  onSkipTurn,
  onPauseGame,
  onEndGame,
}) {
  const [diceOverrideValue, setDiceOverrideValue] = useState('');
  const [overrideActive, setOverrideActive] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(TRIGGER_EVENTS[0].value);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [paused, setPaused] = useState(false);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  function handleApplyDiceOverride() {
    const val = parseInt(diceOverrideValue, 10);
    if (isNaN(val) || val < 1 || val > 20) return;
    setOverrideActive(true);
    onOverrideDice?.(val);
  }

  function handleClearDiceOverride() {
    setDiceOverrideValue('');
    setOverrideActive(false);
    onOverrideDice?.(null);
  }

  function handleDiceInputKeyDown(e) {
    if (e.key === 'Enter') handleApplyDiceOverride();
  }

  function handleTriggerEvent() {
    if (!selectedEvent) return;
    onTriggerEvent?.(selectedEvent);
  }

  function handlePauseToggle() {
    const next = !paused;
    setPaused(next);
    onPauseGame?.(next);
  }

  function handleEndGame(outcome) {
    setShowEndConfirm(false);
    onEndGame?.(outcome);
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionHeaderIcon}>🎛️</span>
        <span className={`${styles.sectionHeaderTitle} ${styles.gold}`}>GM Controls</span>
      </div>

      <div className={styles.gmControls}>

        {/* ── Story Controls ───────────────────────────── */}
        <div className={styles.controlGroup}>
          <span className={styles.controlGroupLabel}>Story Controls</span>
          <div className={styles.controlRow}>
            <button
              className={`${styles.controlBtn} ${styles.primary}`}
              onClick={onAdvanceStory}
              title="Advance the narrative — add a story beat"
            >
              📖 Advance Story
            </button>
          </div>
        </div>

        <div className={styles.controlSeparator} />

        {/* ── Dice Override ─────────────────────────────── */}
        <div className={styles.controlGroup}>
          <span className={styles.controlGroupLabel}>Dice Override</span>
          <div className={styles.overrideDiceRow}>
            <input
              type="number"
              min={1}
              max={20}
              className={styles.overrideDiceInput}
              placeholder="1–20"
              value={diceOverrideValue}
              onChange={(e) => {
                setDiceOverrideValue(e.target.value);
                if (overrideActive) setOverrideActive(false);
              }}
              onKeyDown={handleDiceInputKeyDown}
              aria-label="Dice override value"
            />
            {!overrideActive ? (
              <button
                className={`${styles.controlBtn} ${styles.warning}`}
                onClick={handleApplyDiceOverride}
                disabled={!diceOverrideValue || parseInt(diceOverrideValue, 10) < 1 || parseInt(diceOverrideValue, 10) > 20}
                title="Force the next dice roll to use this value"
              >
                🎲 Apply Override
              </button>
            ) : (
              <button
                className={`${styles.controlBtn} ${styles.danger}`}
                onClick={handleClearDiceOverride}
                title="Clear the dice override"
              >
                ✕ Clear Override
              </button>
            )}
          </div>
          {overrideActive && (
            <div className={styles.overrideActiveTag}>
              🎲 Override Active: <strong style={{ marginLeft: '4px' }}>{diceOverrideValue}</strong>
            </div>
          )}
        </div>

        <div className={styles.controlSeparator} />

        {/* ── Event Triggers ───────────────────────────── */}
        <div className={styles.controlGroup}>
          <span className={styles.controlGroupLabel}>Event Triggers</span>
          <div className={styles.controlRow} style={{ flexWrap: 'nowrap' }}>
            <select
              className={styles.eventDropdown}
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              aria-label="Select event to trigger"
            >
              {TRIGGER_EVENTS.map((ev) => (
                <option key={ev.value} value={ev.value}>
                  {ev.label}
                </option>
              ))}
            </select>
            <button
              className={`${styles.controlBtn} ${styles.warning}`}
              onClick={handleTriggerEvent}
              disabled={!selectedEvent}
              title={`Trigger: ${TRIGGER_EVENTS.find(e => e.value === selectedEvent)?.label ?? ''}`}
            >
              ⚡ Trigger
            </button>
          </div>
        </div>

        <div className={styles.controlSeparator} />

        {/* ── Turn Controls ────────────────────────────── */}
        <div className={styles.controlGroup}>
          <span className={styles.controlGroupLabel}>Turn Controls</span>
          <div className={styles.controlRow}>
            <button
              className={styles.controlBtn}
              onClick={onSkipTurn}
              title="Skip the current entity's turn"
            >
              ⏭ Skip Turn
            </button>
            <button
              className={`${styles.controlBtn} ${paused ? styles.warning : ''}`}
              onClick={handlePauseToggle}
              title={paused ? 'Resume the game' : 'Pause the game'}
            >
              {paused ? '▶ Resume' : '⏸ Pause Game'}
            </button>
          </div>
        </div>

        <div className={styles.controlSeparator} />

        {/* ── End Game ─────────────────────────────────── */}
        <div className={styles.controlGroup}>
          <span className={styles.controlGroupLabel}>End Game</span>

          {!showEndConfirm ? (
            <div className={styles.controlRow}>
              <button
                className={`${styles.controlBtn} ${styles.danger}`}
                onClick={() => setShowEndConfirm(true)}
                title="End the current game session"
              >
                💀 End Game
              </button>
            </div>
          ) : (
            <div className={styles.endGameConfirm} role="dialog" aria-label="End game confirmation">
              <span className={styles.endGameConfirmLabel}>
                Choose the outcome to end the session and notify all players:
              </span>
              <div className={styles.endGameConfirmRow}>
                <button
                  className={`${styles.controlBtn} ${styles.primary}`}
                  onClick={() => handleEndGame('victory')}
                  style={{ flex: 1 }}
                >
                  🏆 Victory
                </button>
                <button
                  className={`${styles.controlBtn} ${styles.danger}`}
                  onClick={() => handleEndGame('defeat')}
                  style={{ flex: 1 }}
                >
                  💀 Defeat
                </button>
              </div>
              <button
                className={styles.controlBtn}
                onClick={() => setShowEndConfirm(false)}
                style={{ fontSize: '10px', padding: '4px 8px' }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>

      </div>
    </>
  );
}
