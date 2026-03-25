import styles from './components.module.css';

export function StatCard({ label, value, icon }) {
  return (
    <div className={styles.statCard}>
      {icon && <span className={styles.statCard__icon}>{icon}</span>}
      <span className={styles.statCard__label}>{label}</span>
      <span className={styles.statCard__value}>{value}</span>
    </div>
  );
}
