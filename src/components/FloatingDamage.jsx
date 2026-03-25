import styles from './components.module.css';

/**
 * FloatingDamage — A number that pops up at a position, floats upward, and fades out.
 *
 * Render this inside a `position: relative` container. The x/y props are pixel
 * offsets from the top-left of that container and represent the origin point
 * (e.g. centre of a zone token).
 *
 * @param {{ value: number, type?: 'damage'|'heal'|'critical', x: number, y: number, onComplete?: () => void }} props
 */
export function FloatingDamage({ value, type = 'damage', x, y, onComplete }) {
  const typeClass = {
    damage:   styles['floatingDamage--damage'],
    heal:     styles['floatingDamage--heal'],
    critical: styles['floatingDamage--critical'],
  }[type] ?? styles['floatingDamage--damage'];

  const prefix = type === 'heal' ? '+' : type === 'critical' ? '★ ' : '';

  return (
    <span
      className={`${styles.floatingDamage} ${typeClass}`}
      style={{ left: x, top: y }}
      onAnimationEnd={onComplete}
      aria-hidden="true"
    >
      {prefix}{value}
    </span>
  );
}
