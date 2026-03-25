import styles from './components.module.css';

export function HealthBar({ current, max, label }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;

  let fillClass = styles.healthBarFillHigh;
  if (pct <= 25) fillClass = styles.healthBarFillLow;
  else if (pct <= 50) fillClass = styles.healthBarFillMid;

  return (
    <div className={styles.healthBar}>
      <div className={styles.healthBarHeader}>
        {label && <span className={styles.healthBarLabel}>{label}</span>}
        <span className={styles.healthBarText}>{current}/{max}</span>
      </div>
      <div className={styles.healthBarTrack}>
        <div
          className={`${styles.healthBarFill} ${fillClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
