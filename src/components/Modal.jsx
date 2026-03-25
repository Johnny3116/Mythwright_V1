import { useEffect, useRef } from 'react';
import styles from './components.module.css';
import { ActionButton } from './ActionButton.jsx';

/**
 * Modal — Reusable dialog with backdrop, animations, and footer actions.
 *
 * @param {object} props
 * @param {boolean} props.isOpen
 * @param {function} props.onClose
 * @param {string} [props.title]
 * @param {React.ReactNode} props.children
 * @param {Array<{label:string, onClick:function, variant?:string, disabled?:boolean}>} [props.actions]
 * @param {'sm'|'md'|'lg'} [props.size='md']
 */
export function Modal({ isOpen, onClose, title, children, actions = [], size = 'md' }) {
  const dialogRef = useRef(null);

  // Lock body scroll while open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Move focus into dialog
      dialogRef.current?.focus();
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className={styles.modalOverlay}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className={`${styles.modal} ${styles[`modal__${size}`]}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        tabIndex={-1}
      >
        {title && (
          <div className={styles.modalHeader}>
            <h2 id="modal-title" className={styles.modalTitle}>{title}</h2>
            <button
              className={styles.modalClose}
              onClick={onClose}
              aria-label="Close dialog"
            >
              ×
            </button>
          </div>
        )}

        <div className={styles.modalBody}>
          {children}
        </div>

        {actions.length > 0 && (
          <div className={styles.modalFooter}>
            {actions.map((action, i) => (
              <ActionButton
                key={i}
                label={action.label}
                onClick={action.onClick}
                variant={action.variant ?? 'secondary'}
                disabled={action.disabled}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
