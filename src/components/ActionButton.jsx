export function ActionButton({ label, onClick, disabled, variant = 'default' }) {
  return (
    <button
      className={`action-button action-button--${variant}`}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  );
}
