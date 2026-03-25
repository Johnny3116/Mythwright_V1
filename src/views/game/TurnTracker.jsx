import { TurnOrderBar } from '@components/TurnOrderBar.jsx';
import styles from './game.module.css';

export function TurnTracker({ players, boss, activeEntityId, round, phase }) {
  return (
    <div className={styles.turnTracker}>
      <TurnOrderBar players={players} boss={boss} activeEntityId={activeEntityId} />
    </div>
  );
}
