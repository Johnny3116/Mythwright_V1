import { useEffect } from 'react';
import styles from './components.module.css';

// Tier config (visual only — game logic lives in DiceSystem.getOutcomeTier)
const TIER_CONFIG = {
  critFail: {
    range: '1',
    badge: 'Critical Fail',
    title: 'Fumble',
    description: 'Worst outcome — a penalty applies.',
    colorVar: 'var(--accent-danger)',
    bgColor: 'rgba(199, 74, 56, 0.12)',
    borderColor: 'var(--accent-danger)',
  },
  miss: {
    range: '2–5',
    badge: 'Fail',
    title: 'No effect',
    description: 'Action fails completely.',
    colorVar: 'var(--text-secondary)',
    bgColor: 'rgba(100, 116, 139, 0.10)',
    borderColor: 'var(--border-color)',
  },
  glancing: {
    range: '6–10',
    badge: 'Partial',
    title: 'Reduced effect',
    description: 'Partial success — diminished outcome.',
    colorVar: 'var(--accent-warning)',
    bgColor: 'rgba(212, 168, 67, 0.10)',
    borderColor: 'var(--accent-warning)',
  },
  hit: {
    range: '11–19',
    badge: 'Success',
    title: 'Full effect',
    description: 'Action succeeds fully.',
    colorVar: 'var(--accent-secondary)',
    bgColor: 'rgba(212, 168, 67, 0.10)',
    borderColor: 'var(--accent-secondary)',
  },
  critHit: {
    range: '20',
    badge: 'Critical!',
    title: 'Maximum effect',
    description: 'Exceptional success — bonus outcome.',
    colorVar: 'var(--accent-success)',
    bgColor: 'rgba(72, 187, 120, 0.10)',
    borderColor: 'var(--accent-success)',
  },
};

/**
 * Post-roll outcome card — shows which tier was hit and what it means.
 *
 * Props:
 *   tier      — one of: critFail | miss | glancing | hit | critHit
 *   roll      — the actual d20 roll value shown in the badge
 *   onDismiss — called when card is closed or auto-dismissed
 *   autoDismissMs — ms before auto-dismiss (default 4500, 0 = never)
 */
export function RollOutcomeCard({ tier, roll, onDismiss, autoDismissMs = 4500 }) {
  const config = TIER_CONFIG[tier];

  useEffect(() => {
    if (!autoDismissMs || !onDismiss) return;
    const t = setTimeout(onDismiss, autoDismissMs);
    return () => clearTimeout(t);
  }, [tier, roll, autoDismissMs, onDismiss]);

  if (!config) return null;

  return (
    <div
      className={styles.rollOutcomeCard}
      style={{ borderColor: config.borderColor, background: config.bgColor }}
    >
      {/* Roll value bubble */}
      <div
        className={styles.rollOutcomeRoll}
        style={{ background: config.colorVar }}
      >
        {roll}
      </div>

      {/* Text content */}
      <div className={styles.rollOutcomeBody}>
        <div className={styles.rollOutcomeBadge} style={{ color: config.colorVar }}>
          {config.badge.toUpperCase()}
        </div>
        <div className={styles.rollOutcomeTitle}>{config.title}</div>
        <div className={styles.rollOutcomeDesc}>{config.description}</div>
      </div>

      {/* Dismiss */}
      <button className={styles.rollOutcomeDismiss} onClick={onDismiss} title="Dismiss">
        ×
      </button>
    </div>
  );
}
