import styles from './components.module.css';

/**
 * Get the color class based on HP percentage.
 * @param {number} pct - 0 to 1
 * @returns {string} CSS module class key
 */
function getColorClass(pct) {
  if (pct > 0.6) return 'healthFillGreen';
  if (pct > 0.3) return 'healthFillYellow';
  return 'healthFillRed';
}

/**
 * HealthBar — Animated HP bar with color thresholds.
 *
 * @param {object} props
 * @param {number} props.current
 * @param {number} props.max
 * @param {string} [props.label]
 * @param {'sm'|'md'|'lg'} [props.size='md']
 * @param {boolean} [props.showText=true] - Show "current / max" overlay
 */
export function HealthBar({ current, max, label, size = 'md', showText = true }) {
  const pct = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;
  const colorClass = getColorClass(pct);

  return (
    <div className={`${styles.healthBar} ${styles[`healthBar__${size}`]}`}>
      {label && (
        <span className={styles.healthLabel}>{label}</span>
      )}
      <div className={styles.healthTrack}>
        <div
          className={`${styles.healthFill} ${styles[colorClass]}`}
          style={{ width: `${pct * 100}%` }}
          role="progressbar"
          aria-valuenow={current}
          aria-valuemin={0}
          aria-valuemax={max}
        />
        {showText && (
          <span className={styles.healthText}>
            {current}<span className={styles.healthTextSep}>/</span>{max}
          </span>
        )}
      </div>
    </div>
  );
}
