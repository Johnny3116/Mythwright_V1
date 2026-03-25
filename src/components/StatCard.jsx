import styles from './components.module.css';

/**
 * StatCard — Compact stat display with icon, label, value, and optional modifier.
 *
 * @param {object} props
 * @param {string|React.ReactNode} [props.icon] - Icon element or emoji
 * @param {string} props.label - Stat name (e.g. "HP", "DMG", "DEF")
 * @param {string|number} props.value - Stat value
 * @param {number} [props.modifier] - Optional +/- modifier shown alongside value
 * @param {string} [props.className]
 */
export function StatCard({ icon, label, value, modifier, className = '' }) {
  const modSign = modifier !== undefined && modifier !== null
    ? (modifier >= 0 ? `+${modifier}` : `${modifier}`)
    : null;

  return (
    <div className={`${styles.statCard} ${className}`}>
      {icon && (
        <span className={styles.statIcon} aria-hidden="true">{icon}</span>
      )}
      <div className={styles.statBody}>
        <span className={styles.statLabel}>{label}</span>
        <span className={styles.statValue}>
          {value}
          {modSign && (
            <span className={`${styles.statModifier} ${modifier >= 0 ? styles.statModifierPos : styles.statModifierNeg}`}>
              {modSign}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}
