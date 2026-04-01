import { useEffect } from 'react';
import PropTypes from 'prop-types';
import styles from './components.module.css';

/** Auto-dismiss delay in milliseconds. Only for non-terminal splashes. */
const DISMISS_DELAY_MS = 3000;

/** Terminal types that require explicit user action to dismiss. */
const TERMINAL_TYPES = new Set(['victory', 'defeat']);

/** Map splash type to a display icon. */
const TYPE_ICONS = {
  encounter: '⚔️',
  evolution: '🐉',
  victory:   '🏆',
  defeat:    '💀',
};

/** Default titles for each splash type. */
const TYPE_TITLES = {
  victory:   'Victory!',
  defeat:    'Defeated',
  evolution: 'Evolution!',
  encounter: 'Encounter!',
};

/**
 * EncounterSplash — Full-screen overlay for major game events.
 *
 * Props:
 *   type        {string}   'encounter' | 'evolution' | 'victory' | 'defeat' (case-insensitive).
 *   title       {string}   Large heading text. Defaults to a type-appropriate title.
 *   subtitle    {string}   Secondary description text shown below the title.
 *   visible     {boolean}  Controls rendering (also accepts isVisible for legacy callers).
 *   onComplete  {Function} Called after auto-dismiss (non-terminal types only).
 *   onReturnToLobby {Function} If provided, shows a "Return to Lobby" button (terminal types).
 *   stats       {object}   Optional stats summary for VICTORY/DEFEAT screens.
 */
export function EncounterSplash({
  type = 'encounter',
  title,
  subtitle,
  visible,
  isVisible,   // legacy prop alias — callers that pass `visible` are supported too
  onComplete,
  onReturnToLobby,
  stats,
}) {
  // Accept both `visible` and `isVisible` prop names.
  const show = visible ?? isVisible ?? false;

  // Normalise type to lowercase for icon/class lookups.
  const normalType = type.toLowerCase();
  const isTerminal = TERMINAL_TYPES.has(normalType);

  // Auto-dismiss after DISMISS_DELAY_MS for non-terminal splashes.
  useEffect(() => {
    if (!show || isTerminal) return;
    const timer = setTimeout(() => {
      onComplete?.();
    }, DISMISS_DELAY_MS);
    return () => clearTimeout(timer);
  }, [show, isTerminal, onComplete]);

  if (!show) return null;

  const icon = TYPE_ICONS[normalType] ?? '⚔️';
  const displayTitle = title ?? TYPE_TITLES[normalType] ?? '';

  const overlayClass = [
    styles.encounterSplash,
    styles[`encounterSplash--${normalType}`],
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={overlayClass}
      role="alertdialog"
      aria-live="assertive"
      aria-label={displayTitle}
    >
      <div className={styles.encounterSplashIcon} aria-hidden="true">
        {icon}
      </div>

      {displayTitle && (
        <h2 className={styles.encounterSplashTitle}>{displayTitle}</h2>
      )}

      {subtitle && (
        <p className={styles.encounterSplashSubtitle}>{subtitle}</p>
      )}

      {/* Stats summary for terminal screens */}
      {stats && isTerminal && (
        <div className={styles.encounterSplashStats}>
          {stats.rounds != null && (
            <div className={styles.encounterSplashStat}>
              <span className={styles.encounterSplashStatLabel}>Rounds Survived</span>
              <span className={styles.encounterSplashStatValue}>{stats.rounds}</span>
            </div>
          )}
          {stats.totalDamage != null && (
            <div className={styles.encounterSplashStat}>
              <span className={styles.encounterSplashStatLabel}>Total Damage Dealt</span>
              <span className={styles.encounterSplashStatValue}>{stats.totalDamage}</span>
            </div>
          )}
          {stats.mvp && (
            <div className={styles.encounterSplashStat}>
              <span className={styles.encounterSplashStatLabel}>MVP</span>
              <span className={styles.encounterSplashStatValue}>{stats.mvp}</span>
            </div>
          )}
        </div>
      )}

      {/* Return to lobby button for terminal states */}
      {isTerminal && onReturnToLobby && (
        <button
          className={styles.encounterSplashReturn}
          onClick={onReturnToLobby}
          type="button"
        >
          Return to Lobby
        </button>
      )}
    </div>
  );
}

EncounterSplash.propTypes = {
  type: PropTypes.oneOf(['encounter', 'evolution', 'victory', 'defeat']),
  title: PropTypes.string,
  subtitle: PropTypes.string,
  visible: PropTypes.bool,
  isVisible: PropTypes.bool,
  onComplete: PropTypes.func,
  onReturnToLobby: PropTypes.func,
  stats: PropTypes.shape({
    rounds: PropTypes.number,
    totalDamage: PropTypes.number,
    mvp: PropTypes.string,
  }),
};
