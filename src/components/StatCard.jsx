import styles from './components.module.css';

/**
 * StatCard — A compact card displaying a single stat (icon + label + value).
 *
 * Props:
 *   label    {string}         Stat label text (e.g. "Attack").
 *   value    {string|number}  The stat value displayed prominently.
 *   icon     {string}         Emoji or text icon shown at the top.
 *   size     {string}         'sm' | 'md' | 'lg'. Defaults 'md'.
 *   variant  {string}         'default' | 'highlight' | 'danger'. Defaults 'default'.
 */
export function StatCard({ label, value, icon, size = 'md', variant = 'default' }) {
  const containerClass = [
    styles.statCard,
    size !== 'md' ? styles[`statCard--${size}`] : null,
    variant !== 'default' ? styles[`statCard--${variant}`] : null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={containerClass}>
      {icon && <span className={styles.statCardIcon} aria-hidden="true">{icon}</span>}
      <span className={styles.statCardLabel}>{label}</span>
      <span className={styles.statCardValue}>{value}</span>
    </div>
  );
}
