import { useEffect, useState } from 'react';
import styles from './components.module.css';

const SPLASH_DURATION_MS = 2600;

const SPLASH_CONFIG = {
  ENCOUNTER:  { icon: '⚔️',  title: 'ENCOUNTER',   variant: '' },
  EVOLUTION:  { icon: '🔥',  title: 'EVOLUTION',   variant: styles.splashEvolution },
  VICTORY:    { icon: '🏆',  title: 'VICTORY',     variant: styles.splashVictory },
  DEFEAT:     { icon: '💀',  title: 'DEFEAT',      variant: styles.splashDefeat },
  BOSS_TURN:  { icon: '🦎',  title: 'BOSS TURN',   variant: '' },
};

/**
 * EncounterSplash — Full-screen cinematic transition overlay.
 * @param {string} type - ENCOUNTER | EVOLUTION | VICTORY | DEFEAT | BOSS_TURN
 * @param {string} subtitle - Optional subtitle text
 * @param {boolean} visible
 * @param {Function} onDismiss - Called after auto-dismiss
 */
export function EncounterSplash({ type = 'ENCOUNTER', subtitle = '', visible = false, onDismiss }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) {
      setShow(true);
      const timer = setTimeout(() => {
        setShow(false);
        onDismiss?.();
      }, SPLASH_DURATION_MS);
      return () => clearTimeout(timer);
    }
  }, [visible, onDismiss]);

  if (!show) return null;

  const config = SPLASH_CONFIG[type] || SPLASH_CONFIG.ENCOUNTER;

  return (
    <div className={`${styles.encounterSplash} ${config.variant}`}>
      <div className={styles.splashIcon}>{config.icon}</div>
      <div className={styles.splashTitle}>{config.title}</div>
      {subtitle && <div className={styles.splashSubtitle}>{subtitle}</div>}
    </div>
  );
}
