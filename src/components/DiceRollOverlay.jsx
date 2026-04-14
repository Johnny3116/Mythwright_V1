import { useEffect, useRef, useState } from 'react';
import styles from './components.module.css';

/** How long to display the result before auto-dismissing (ms). */
const RESULT_HOLD_MS = 2000;
/** Flicker interval during animation (ms). */
const FLICKER_MS = 70;

const TIER_CONFIG = {
  critFail: {
    badge: 'Critical Fail',
    color: 'var(--accent-danger)',
    description: 'Worst outcome — a penalty applies.',
  },
  miss: {
    badge: 'Fail',
    color: 'var(--text-secondary)',
    description: 'No effect.',
  },
  glancing: {
    badge: 'Partial',
    color: 'var(--accent-warning)',
    description: 'Reduced effect.',
  },
  hit: {
    badge: 'Success',
    color: 'var(--accent-secondary)',
    description: 'Full effect applied.',
  },
  critHit: {
    badge: 'Critical!',
    color: 'var(--accent-success)',
    description: 'Exceptional outcome — maximum effect!',
  },
};

/**
 * Full-screen dice roll overlay — shows during action rolls.
 *
 * Props:
 *   visible    — whether the overlay should be mounted
 *   isRolling  — true while the dice are animating
 *   result     — { natural, modified, modifier } once roll is resolved
 *   tier       — outcome tier key (critFail | miss | glancing | hit | critHit)
 *   actionName — e.g. "Attack", "Search Flora" — shown above the dice
 *   onDismiss  — called after result hold completes
 */
export function DiceRollOverlay({ visible, isRolling, result, tier, actionName, onDismiss }) {
  const [flickerNum, setFlickerNum] = useState('?');
  const flickerRef = useRef(null);
  const config = tier ? TIER_CONFIG[tier] : null;

  // Drive the flicker while rolling
  useEffect(() => {
    if (!isRolling) {
      clearInterval(flickerRef.current);
      return;
    }
    flickerRef.current = setInterval(() => {
      const buf = new Uint32Array(1);
      crypto.getRandomValues(buf);
      setFlickerNum((buf[0] % 20) + 1);
    }, FLICKER_MS);
    return () => clearInterval(flickerRef.current);
  }, [isRolling]);

  // Auto-dismiss after holding the result
  useEffect(() => {
    if (!result || isRolling) return;
    const t = setTimeout(() => onDismiss?.(), RESULT_HOLD_MS);
    return () => clearTimeout(t);
  }, [result, isRolling, onDismiss]);

  if (!visible) return null;

  const phase = isRolling ? 'rolling' : result ? 'done' : 'rolling';
  const displayNum = isRolling ? flickerNum : (result?.modified ?? '?');

  const numberClass = [
    styles.diceNumber,
    isRolling ? styles['diceNumber--rolling'] : styles['diceNumber--result'],
    !isRolling && config ? styles[`diceNumber--overlayTier--${tier}`] : null,
  ].filter(Boolean).join(' ');

  return (
    <div className={styles.diceRollerOverlay} onClick={result ? onDismiss : undefined}>
      <div className={`${styles.diceRollerOverlayPanel} ${styles[`diceRollerOverlayPanel--${phase}`] || ''}`}>

        {/* Action label */}
        {actionName && (
          <div className={styles.overlayActionLabel}>{actionName}</div>
        )}

        {/* D20 */}
        <div className={`${styles.diceRoller} ${styles[`diceRoller--${phase}`]}`}>
          <div className={styles.diceD20}>
            <div
              className={styles.diceShape}
              style={config && !isRolling ? { borderColor: config.color } : undefined}
            />
            <span className={numberClass}>{displayNum}</span>
          </div>
        </div>

        {/* Result tier — shown after roll */}
        {!isRolling && result && config && (
          <div className={styles.overlayTierBlock}>
            <div
              className={styles.overlayTierBadge}
              style={{ color: config.color, borderColor: config.color }}
            >
              {config.badge.toUpperCase()}
            </div>
            <div className={styles.overlayTierDesc}>{config.description}</div>
            <div className={styles.overlayDismissHint}>click to dismiss</div>
          </div>
        )}

        {/* Rolling hint */}
        {isRolling && (
          <div className={styles.overlayRollingHint}>Rolling…</div>
        )}
      </div>
    </div>
  );
}
