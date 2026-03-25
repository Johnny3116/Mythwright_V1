import { useEffect, useRef, useState } from 'react';
import styles from './components.module.css';

/** Map entry type to a short badge label. */
const TYPE_LABELS = {
  narrative: 'Story',
  combat:    'Combat',
  healing:   'Heal',
  system:    'System',
  info:      'Info',
};

/**
 * Format a Date or timestamp number to a short HH:MM:SS string.
 * @param {number|Date} ts
 * @returns {string}
 */
function formatTime(ts) {
  const d = ts instanceof Date ? ts : new Date(ts);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/**
 * NarratorEntry — Renders a single feed entry with optional typewriter effect.
 */
function NarratorEntry({ entry, isLast }) {
  const { text, type = 'system', timestamp } = entry;
  const [displayed, setDisplayed] = useState(isLast ? '' : text);
  const [typing, setTyping] = useState(isLast);
  const intervalRef = useRef(null);

  // Typewriter effect: character-by-character reveal on the last (newest) entry.
  useEffect(() => {
    if (!isLast) {
      setDisplayed(text);
      setTyping(false);
      return;
    }

    // Reset and start typing animation.
    setDisplayed('');
    setTyping(true);
    let idx = 0;

    intervalRef.current = setInterval(() => {
      idx += 1;
      setDisplayed(text.slice(0, idx));
      if (idx >= text.length) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        setTyping(false);
      }
    }, 30);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // Only re-run when the entry text itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.id, text, isLast]);

  const entryClass = [
    styles.narratorEntry,
    styles[`narratorEntry--${type}`],
  ]
    .filter(Boolean)
    .join(' ');

  const textClass = [
    styles.narratorEntryText,
    typing ? styles['narratorEntryText--typing'] : null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={entryClass}>
      <div className={styles.narratorEntryMeta}>
        {timestamp != null && (
          <span className={styles.narratorEntryTimestamp}>
            {formatTime(timestamp)}
          </span>
        )}
        <span className={styles.narratorEntryTypeBadge}>
          {TYPE_LABELS[type] ?? type}
        </span>
      </div>
      <p className={textClass}>{displayed}</p>
    </div>
  );
}

/**
 * NarratorBox — Scrolling feed of narrative/combat/system entries.
 *
 * Props:
 *   entries   {Array}   Array of { id, text, type, timestamp } objects.
 *   maxHeight {string}  CSS max-height of the scroll container. Defaults '100%'.
 */
export function NarratorBox({ entries = [], maxHeight = '100%' }) {
  const scrollRef = useRef(null);

  // Auto-scroll to the bottom whenever a new entry arrives.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [entries.length]);

  return (
    <div className={styles.narratorBox}>
      <div className={styles.narratorBoxHeader}>
        <span className={styles.narratorBoxDot} aria-hidden="true" />
        <span className={styles.narratorBoxTitle}>Narrator</span>
      </div>

      <div
        className={styles.narratorBoxScroll}
        ref={scrollRef}
        style={{ maxHeight }}
        aria-live="polite"
        aria-label="Game narrator feed"
      >
        {entries.length === 0 ? (
          <div className={`${styles.narratorEntry} ${styles['narratorEntry--system']}`}>
            <p className={styles.narratorEntryText}>The adventure awaits…</p>
          </div>
        ) : (
          entries.map((entry, i) => (
            <NarratorEntry
              key={entry.id ?? i}
              entry={entry}
              isLast={i === entries.length - 1}
            />
          ))
        )}
      </div>
    </div>
  );
}
