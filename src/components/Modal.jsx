import styles from './components.module.css';

export function Modal({ isOpen, title, children, onClose, actions }) {
  if (!isOpen) return null;
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
        {title && <h2 className={styles.modalTitle}>{title}</h2>}
        <div className={styles.modalBody}>{children}</div>
        {actions && <div className={styles.modalActions}>{actions}</div>}
      </div>
    </div>
  );
}
