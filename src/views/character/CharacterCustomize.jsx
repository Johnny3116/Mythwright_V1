import styles from './character.module.css';

/** Player color options. */
const COLOR_OPTIONS = [
  '#c74a38',
  '#4a7ec7',
  '#4a9e6a',
  '#d4a843',
  '#9b59b6',
  '#e8e6e0',
];

/**
 * CharacterCustomize — Name input and color picker for a selected class.
 *
 * Props:
 *   classData       {object}   The currently selected class (used for display context).
 *   playerName      {string}   Current name value.
 *   onNameChange    {Function} Called with the new name string.
 *   selectedColor   {string}   Currently selected hex color.
 *   onColorChange   {Function} Called with the new color string.
 */
export function CharacterCustomize({
  classData,
  playerName,
  onNameChange,
  selectedColor,
  onColorChange,
}) {
  if (!classData) return null;

  return (
    <div className={styles.customPanel}>
      <p className={styles.customPanelTitle}>
        Customize — {classData.name}
      </p>

      <div className={styles.customRow}>
        {/* Name input */}
        <div className={styles.customField}>
          <label className={styles.customFieldLabel} htmlFor="char-name-input">
            Hunter Name
          </label>
          <input
            id="char-name-input"
            className={styles.nameInput}
            type="text"
            value={playerName}
            onChange={(e) => onNameChange?.(e.target.value)}
            placeholder="Enter your name…"
            maxLength={24}
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        {/* Color picker */}
        <div className={styles.customField}>
          <span className={styles.customFieldLabel}>Color</span>
          <div className={styles.colorPicker} role="group" aria-label="Select player color">
            {COLOR_OPTIONS.map((color) => (
              <button
                key={color}
                type="button"
                className={[
                  styles.colorSwatch,
                  selectedColor === color ? styles.active : null,
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={{ backgroundColor: color }}
                onClick={() => onColorChange?.(color)}
                aria-label={`Color ${color}`}
                aria-pressed={selectedColor === color}
                title={color}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
