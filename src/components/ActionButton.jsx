import styles from './components.module.css';

/**
 * ActionButton — A themed button with icon support and multiple variants.
 *
 * Props:
 *   label     {string}   Button text.
 *   icon      {string}   Optional emoji/text icon shown before the label.
 *   onClick   {Function} Click handler.
 *   disabled  {boolean}  Disables the button. Defaults false.
 *   variant   {string}   'default' | 'primary' | 'danger' | 'success' | 'ghost' | 'loading'.
 *   title     {string}   Tooltip text via the HTML title attribute.
 *   isLoading {boolean}  Shows a spinner and prevents interaction.
 */
export function ActionButton({
  label,
  icon,
  onClick,
  disabled = false,
  variant = 'default',
  title,
  isLoading = false,
  children,
}) {
  const effectiveVariant = isLoading ? 'loading' : variant;
  const isDisabled = disabled || isLoading;

  const btnClass = [
    styles.actionButton,
    effectiveVariant !== 'default' ? styles[`actionButton--${effectiveVariant}`] : null,
    isDisabled ? styles['actionButton--disabled'] : null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      className={btnClass}
      onClick={isDisabled ? undefined : onClick}
      disabled={isDisabled}
      title={title}
      type="button"
    >
      {isLoading ? (
        <span className={styles.actionButtonSpinner} aria-hidden="true" />
      ) : (
        icon && <span className={styles.actionButtonIcon} aria-hidden="true">{icon}</span>
      )}
      {label && <span>{label}</span>}
      {children}
    </button>
  );
}
