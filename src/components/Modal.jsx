import styles from './components.module.css';

export function Modal({ isOpen, title, children, onClose }) {
  if (!isOpen) return null;
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modal__header}>
          <h2 className={styles.modal__title}>{title}</h2>
          <button className={styles.modal__close} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className={styles.modal__body}>{children}</div>
      </div>
    </div>
  );
}
