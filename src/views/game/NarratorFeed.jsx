import { NarratorBox } from '@components/NarratorBox';
import styles from './game.module.css';

/**
 * NarratorFeed — Right sidebar scrolling narrative log.
 *
 * Props:
 *   entries    {Array}  Array of { id, text, type, timestamp }.
 *   maxEntries {number} Maximum entries to display (oldest are trimmed). Default 100.
 */
export function NarratorFeed({ entries = [], maxEntries = 100 }) {
  // Trim to most-recent maxEntries entries.
  const visible = entries.length > maxEntries
    ? entries.slice(entries.length - maxEntries)
    : entries;

  return (
    <div className={styles.narratorPanel}>
      <NarratorBox entries={visible} maxHeight="100%" />
    </div>
  );
}
