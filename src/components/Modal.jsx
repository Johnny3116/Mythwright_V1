import { useEffect } from 'react';
import styles from './components.module.css';

/**
 * Modal — Full-screen overlay with a centered panel.
 *
 * Props:
 *   isOpen   {boolean}     Whether the modal is visible.
 *   title    {string}      Modal heading text.
 *   children {ReactNode}   Content rendered inside the modal body.
 *   onClose  {Function}    Called when the overlay or close button is clicked, or ESC pressed.
 *   footer   {ReactNode}   Optional footer content (action buttons, etc.).
 *   size     {string}      'sm' | 'md' | 'lg' | 'xl'. Defaults 'md'.
 */
export function Modal({ isOpen, title, children, onClose, footer, size = 'md' }) {
  // Close on ESC key press.
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose?.();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent background scroll while open.
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const panelClass = [styles.modal, styles[`modal--${size}`]]
    .filter(Boolean)
    .join(' ');

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) {
      onClose?.();
    }
  }

  return (
    <div
      className={styles.modalOverlay}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className={panelClass}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{title}</h2>
          <button
            className={styles.modalClose}
            onClick={onClose}
            aria-label="Close modal"
            type="button"
          >
            ×
          </button>
        </div>

        <div className={styles.modalBody}>{children}</div>

        {footer && <div className={styles.modalFooter}>{footer}</div>}
      </div>
    </div>
  );
}
