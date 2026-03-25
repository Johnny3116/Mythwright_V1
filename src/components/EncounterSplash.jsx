import styles from './components.module.css';

/**
 * Visual config per splash type.
 * Colors reference CSS variables so the theme stays consistent.
 */
const TYPE_CONFIG = {
  encounter: {
    label: 'ENCOUNTER',
    icon:  '⚔',
    color: 'var(--accent-danger)',
  },
  evolution: {
    label: 'EVOLUTION',
    icon:  '◈',
    color: 'var(--accent-secondary)',
  },
  victory: {
    label: 'VICTORY',
    icon:  '★',
    color: 'var(--accent-success)',
  },
  defeat: {
    label: 'DEFEAT',
    icon:  '☠',
    color: 'var(--text-secondary)',
  },
};

/**
 * EncounterSplash — Full-screen cinematic transition overlay.
 *
 * Fades in over 0.3 s, holds for ~1.5 s, then fades out. Calls `onComplete`
 * when the animation finishes so the parent can unmount it.
 *
 * @param {{ type: 'encounter'|'evolution'|'victory'|'defeat', onComplete?: () => void }} props
 */
export function EncounterSplash({ type, onComplete }) {
  if (!type) return null;

  const config = TYPE_CONFIG[type] ?? TYPE_CONFIG.encounter;

  return (
    <div
      className={styles.splashOverlay}
      onAnimationEnd={onComplete}
      role="alert"
      aria-live="assertive"
      data-type={type}
    >
      <div
        className={styles.splashContent}
        style={{ color: config.color }}
      >
        <span className={styles.splashIcon} aria-hidden="true">
          {config.icon}
        </span>
        <div className={styles.splashDivider} />
        <span className={styles.splashLabel}>{config.label}</span>
      </div>
    </div>
  );
}
