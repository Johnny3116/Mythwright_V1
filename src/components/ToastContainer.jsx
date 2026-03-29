import { useToast } from '@context/ToastContext.jsx';
import styles from './components.module.css';

const VARIANT_ICONS = {
  info:    'ℹ️',
  success: '✓',
  error:   '✗',
  warning: '⚠',
};

/**
 * ToastContainer — Renders active toasts in the bottom-right corner.
 * Mount once at the App level. No props needed — reads from ToastContext.
 */
export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className={styles.toastContainer} role="region" aria-label="Notifications" aria-live="polite">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`${styles.toast} ${styles[`toast--${toast.variant}`]}`}
          role="alert"
        >
          <span className={styles.toastIcon} aria-hidden="true">
            {VARIANT_ICONS[toast.variant] ?? 'ℹ️'}
          </span>
          <span className={styles.toastMessage}>{toast.message}</span>
          <button
            className={styles.toastClose}
            onClick={() => removeToast(toast.id)}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
