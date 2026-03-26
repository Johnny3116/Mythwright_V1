import { NarratorBox } from '@components/NarratorBox.jsx';
import styles from './game.module.css';

export function NarratorFeed({ entries = [] }) {
  return (
    <div className={styles.narratorFeed}>
      <NarratorBox entries={entries} />
    </div>
  );
}
