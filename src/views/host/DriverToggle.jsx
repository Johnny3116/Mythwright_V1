import styles from './host.module.css';

const DRIVERS = [
  { id: 'human', label: '🎲 Human' },
  { id: 'scripted', label: '🤖 Scripted' },
  { id: 'ai', label: '✨ AI' },
];

export function DriverToggle({ currentDriver = 'scripted', onSwitch }) {
  return (
    <div className={styles.driverToggle}>
      <span className={styles.gmLabel}>Driver:</span>
      {DRIVERS.map(d => (
        <button
          key={d.id}
          className={`${styles.driverBtn} ${currentDriver === d.id ? styles.driverBtnActive : ''}`}
          onClick={() => onSwitch?.(d.id)}
        >
          {d.label}
        </button>
      ))}
    </div>
  );
}
