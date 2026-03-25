import styles from './components.module.css';

/**
 * HealthBar — Displays current / max HP as a color-coded progress bar.
 *
 * Props:
 *   current   {number}  Current HP value.
 *   max       {number}  Maximum HP value.
 *   label     {string}  Optional label shown above the bar.
 *   showText  {boolean} Whether to render the numeric "current / max" text. Defaults true.
 *   size      {string}  'sm' | 'md' | 'lg'. Controls bar height. Defaults 'md'.
 */
export function HealthBar({ current, max, label, showText = true, size = 'md' }) {
  const pct = Math.min(100, Math.max(0, max > 0 ? (current / max) * 100 : 0));

  // Determine fill color based on percentage thresholds.
  let fillColor;
  if (pct > 60) {
    fillColor = 'var(--accent-success)';
  } else if (pct > 30) {
    fillColor = 'var(--accent-warning)';
  } else {
    fillColor = 'var(--accent-danger)';
  }

  const isCritical = pct <= 30;

  const containerClass = [
    styles.healthBar,
    styles[`healthBar--${size}`],
  ]
    .filter(Boolean)
    .join(' ');

  const fillClass = [
    styles.healthBarFill,
    isCritical ? styles['healthBarFill--critical'] : null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={containerClass}>
      {(label || showText) && (
        <div className={styles.healthBarHeader}>
          {label && <span className={styles.healthBarLabel}>{label}</span>}
          {showText && (
            <span className={styles.healthBarText}>
              {current}/{max}
            </span>
          )}
        </div>
      )}
      <div className={styles.healthBarTrack} role="progressbar" aria-valuenow={current} aria-valuemin={0} aria-valuemax={max}>
        <div
          className={fillClass}
          style={{ width: `${pct}%`, backgroundColor: fillColor }}
        />
      </div>
    </div>
  );
}
