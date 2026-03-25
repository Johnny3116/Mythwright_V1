import { useEffect, useRef } from 'react';
import styles from './components.module.css';

export function NarratorBox({ entries = [] }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries]);

  return (
    <div className={styles.narratorBox} role="log" aria-live="polite">
      {entries.map(entry => (
        <div key={entry.id} className={styles.narratorEntry}>
          {entry.text}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
