import styles from './components.module.css';

/**
 * ActionButton — Context-aware action button with icon support.
 *
 * @param {object} props
 * @param {string|React.ReactNode} [props.icon] - Icon (SVG, emoji, or element)
 * @param {string} props.label - Button label text
 * @param {function} [props.onClick]
 * @param {boolean} [props.disabled]
 * @param {'primary'|'secondary'|'danger'|'ghost'} [props.variant='primary']
 * @param {'sm'|'md'|'lg'} [props.size='md']
 * @param {string} [props.className]
 * @param {string} [props.type='button']
 */
export function ActionButton({
  icon,
  label,
  onClick,
  disabled = false,
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
}) {
  return (
    <button
      type={type}
      className={`${styles.actionBtn} ${styles[`actionBtn__${variant}`]} ${styles[`actionBtn__${size}`]} ${className}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
    >
      {icon && <span className={styles.actionBtnIcon} aria-hidden="true">{icon}</span>}
      <span className={styles.actionBtnLabel}>{label}</span>
    </button>
  );
}
