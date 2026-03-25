import styles from './components.module.css';

export function ActionButton({ children, label, onClick, disabled = false, variant = 'default', icon, className = '' }) {
  const variantClass = {
    primary: styles.actionBtnPrimary,
    success: styles.actionBtnSuccess,
    danger: styles.actionBtnDanger,
    default: '',
  }[variant] || '';

  return (
    <button
      className={`${styles.actionBtn} ${variantClass} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {icon && <span className={styles.actionBtnIcon}>{icon}</span>}
      {children || label}
    </button>
  );
}
