import styles from './components.module.css';

/** Returns the appropriate CSS variable for the current HP percentage. */
function hpColor(pct) {
  if (pct > 0.5) return 'var(--accent-success)';
  if (pct > 0.25) return 'var(--accent-warning)';
  return 'var(--accent-danger)';
}

export function HealthBar({ current, max, label }) {
  const pct = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;

  return (
    <div className={styles.healthBar}>
      {label && <span className={styles.healthBar__label}>{label}</span>}
      <div className={styles.healthBar__track}>
        <div
          className={styles.healthBar__fill}
          style={{ width: `${pct * 100}%`, backgroundColor: hpColor(pct) }}
        />
      </div>
      <span className={styles.healthBar__text}>{current}/{max}</span>
    </div>
  );
}
