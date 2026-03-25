import styles from './components.module.css';

export function StatCard({ label, value, icon }) {
  return (
    <div className={styles.statCard}>
      {icon && <span className={styles.statCardIcon}>{icon}</span>}
      <span className={styles.statCardLabel}>{label}</span>
      <span className={styles.statCardValue}>{value}</span>
    </div>
  );
}
