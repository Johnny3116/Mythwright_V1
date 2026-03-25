import styles from './components.module.css';

/**
 * FloatingDamage — A floating popup number that animates upward and fades out.
 *
 * Intended to be rendered at an absolute position over a game entity portrait or
 * health bar. The parent element must have `position: relative` (or similar).
 *
 * Props:
 *   amount         {number|string}  The numeric value to display.
 *   type           {string}         'damage' | 'heal' | 'miss'. Defaults 'damage'.
 *   onAnimationEnd {Function}       Called when the floatUp animation finishes.
 *                                   Use this to unmount the component from the parent.
 */
export function FloatingDamage({ amount, type = 'damage', onAnimationEnd }) {
  const damageClass = [
    styles.floatingDamage,
    styles[`floatingDamage--${type}`],
  ]
    .filter(Boolean)
    .join(' ');

  // Build the display text with type-specific prefix.
  let text;
  if (type === 'miss') {
    text = 'Miss!';
  } else if (type === 'heal') {
    text = `+${amount}`;
  } else {
    // 'damage' and any other type
    text = `-${amount}`;
  }

  return (
    <span
      className={damageClass}
      onAnimationEnd={onAnimationEnd}
      aria-hidden="true"
    >
      {text}
    </span>
  );
}
