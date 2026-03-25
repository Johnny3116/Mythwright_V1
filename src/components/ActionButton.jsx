import styles from './components.module.css';

const VARIANT_CLASS = {
  default: styles.actionButton,
  primary: styles.actionButtonPrimary,
  danger:  styles.actionButtonDanger,
  success: styles.actionButtonSuccess,
};

export function ActionButton({ label, onClick, disabled, variant = 'default' }) {
  const cls = VARIANT_CLASS[variant] ?? styles.actionButton;
  return (
    <button className={cls} onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );
}
