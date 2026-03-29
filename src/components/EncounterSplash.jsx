import { useEffect } from 'react';
import styles from './components.module.css';

/** Auto-dismiss delay in milliseconds. */
const DISMISS_DELAY_MS = 3000;

/** Map splash type to a display icon. */
const TYPE_ICONS = {
  encounter: '⚔️',
  evolution: '🐉',
  victory:   '🏆',
  defeat:    '💀',
};

/**
 * EncounterSplash — Full-screen overlay for major game events.
 *
 * Appears with a splashReveal animation and auto-dismisses after 3 seconds.
 *
 * Props:
 *   type       {string}   'encounter' | 'evolution' | 'victory' | 'defeat' (case-insensitive).
 *   title      {string}   Large heading text.
 *   subtitle   {string}   Secondary description text shown below the title.
 *   visible    {boolean}  Controls rendering. When false, nothing is rendered.
 *   onComplete {Function} Called after the auto-dismiss delay elapses.
 */
export function EncounterSplash({ type = 'encounter', title, subtitle, visible, onComplete }) {
  // Normalize type to lowercase so callers can pass 'VICTORY', 'victory', etc.
  const normalizedType = (type || 'encounter').toLowerCase();

  // Auto-dismiss after DISMISS_DELAY_MS.
  useEffect(() => {
    if (!visible) return;

    const timer = setTimeout(() => {
      onComplete?.();
    }, DISMISS_DELAY_MS);

    return () => clearTimeout(timer);
  }, [visible, onComplete]);

  if (!visible) return null;

  const icon = TYPE_ICONS[normalizedType] ?? '⚔️';

  const overlayClass = [
    styles.encounterSplash,
    styles[`encounterSplash--${normalizedType}`],
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={overlayClass}
      role="alertdialog"
      aria-live="assertive"
      aria-label={title}
    >
      <div className={styles.encounterSplashIcon} aria-hidden="true">
        {icon}
      </div>

      {title && (
        <h2 className={styles.encounterSplashTitle}>{title}</h2>
      )}

      {subtitle && (
        <p className={styles.encounterSplashSubtitle}>{subtitle}</p>
      )}
    </div>
  );
}
