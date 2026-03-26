import styles from './character.module.css';
import { ActionButton } from '@components/ActionButton.jsx';

export function CharacterCustomize({ playerName, onNameChange, selectedClass, onConfirm, isReady }) {
  return (
    <div className={styles.customizePanel}>
      <div className={styles.customizeTitle}>
        {selectedClass ? `${selectedClass.icon} ${selectedClass.name}` : 'Select a Class'}
      </div>

      <div className={styles.formGroup}>
        <label className={styles.formLabel}>Your Name</label>
        <input
          className={styles.formInput}
          value={playerName}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Enter your name"
          maxLength={20}
          disabled={isReady}
        />
      </div>

      <div className={styles.actionRow}>
        {isReady ? (
          <div className={styles.readyBadge}>✓ Ready!</div>
        ) : (
          <ActionButton
            variant="success"
            onClick={onConfirm}
            disabled={!selectedClass || !playerName.trim()}
          >
            Ready Up
          </ActionButton>
        )}
      </div>
    </div>
  );
}
