import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useDiceRoll } from '@hooks/useDiceRoll';
import styles from './components.module.css';

/** Number of random flicker frames shown during the roll animation. */
const FLICKER_INTERVAL_MS = 80;

/**
 * Derive a result tier from the raw D20 value.
 * @param {number} raw
 * @returns {{ tier: string, label: string }}
 */
function getResultTier(raw) {
  if (raw === 20) return { tier: 'critical', label: 'CRITICAL!' };
  if (raw >= 16) return { tier: 'goodHit', label: 'Hit!' };
  if (raw >= 6)  return { tier: 'hit',     label: null };
  return              { tier: 'miss',    label: 'Miss!' };
}

/**
 * DiceRoller — Full animated D20 roller component.
 *
 * Props:
 *   onRollComplete {Function} Called with the result object { raw, modifier, total } after animation.
 *   modifier       {number}   Flat modifier added to the raw roll. Defaults 0.
 *   disabled       {boolean}  Prevents rolling. Defaults false.
 */
export function DiceRoller({ onRollComplete, modifier = 0, disabled = false }) {
  // Flicker number shown during the rolling animation.
  const [flickerNum, setFlickerNum] = useState(null);
  const flickerRef = useRef(null);

  const { roll, isRolling, lastRoll: result } = useDiceRoll();

  // Notify parent when a roll finishes
  const prevIsRollingRef = useRef(false);
  useEffect(() => {
    if (prevIsRollingRef.current && !isRolling && result) {
      onRollComplete?.(result);
    }
    prevIsRollingRef.current = isRolling;
  }, [isRolling, result, onRollComplete]);

  // Drive the flicker animation while isRolling is true.
  useEffect(() => {
    if (!isRolling) {
      if (flickerRef.current !== null) {
        clearInterval(flickerRef.current);
        flickerRef.current = null;
      }
      setFlickerNum(null);
      return;
    }

    flickerRef.current = setInterval(() => {
      // Produce a random integer [1, 20] using crypto.
      const buf = new Uint32Array(1);
      crypto.getRandomValues(buf);
      setFlickerNum((buf[0] % 20) + 1);
    }, FLICKER_INTERVAL_MS);

    return () => {
      if (flickerRef.current !== null) {
        clearInterval(flickerRef.current);
        flickerRef.current = null;
      }
    };
  }, [isRolling]);

  function handleRoll() {
    if (disabled || isRolling) return;
    roll(modifier);
  }

  // Determine display state.
  const phase = isRolling ? 'rolling' : result ? 'done' : 'idle';
  const tier = result ? getResultTier(result.raw) : null;

  // Classes for the outer roller container.
  const rollerClass = [
    styles.diceRoller,
    styles[`diceRoller--${phase}`],
  ].join(' ');

  // Classes for the displayed number.
  const numberClass = [
    styles.diceNumber,
    isRolling             ? styles['diceNumber--rolling'] : null,
    result && !isRolling  ? styles['diceNumber--result']  : null,
    tier                  ? styles[`diceNumber--${tier.tier}`] : null,
  ]
    .filter(Boolean)
    .join(' ');

  // Displayed number: flicker during roll, result when done, "D20" when idle.
  let displayNumber;
  if (isRolling) {
    displayNumber = flickerNum ?? '?';
  } else if (result) {
    displayNumber = result.total;
  } else {
    displayNumber = '20';
  }

  // Roll button label.
  const rollBtnLabel = modifier !== 0
    ? `Roll D20 ${modifier >= 0 ? '+' : ''}${modifier}`
    : 'Roll D20';

  return (
    <div className={rollerClass}>
      {/* D20 polygon shape */}
      <div className={styles.diceD20} aria-live="assertive" aria-label={result ? `Rolled ${result.total}` : 'Dice'}>
        <div className={styles.diceShape} aria-hidden="true" />
        <span className={numberClass}>{displayNumber}</span>
      </div>

      {/* Result label (Miss / Hit / CRITICAL) */}
      {result && !isRolling && tier?.label && (
        <div
          className={[styles.diceLabel, styles[`diceLabel--${tier.tier}`]].join(' ')}
          aria-hidden="true"
        >
          {tier.label}
        </div>
      )}

      {/* Modifier hint */}
      {modifier !== 0 && (
        <div className={styles.diceModifier} aria-hidden="true">
          {modifier >= 0 ? '+' : ''}{modifier} zone bonus
        </div>
      )}

      {/* Roll button */}
      <button
        className={styles.diceRollButton}
        onClick={handleRoll}
        disabled={disabled || isRolling}
        type="button"
        aria-label={rollBtnLabel}
      >
        {rollBtnLabel}
      </button>
    </div>
  );
}

DiceRoller.propTypes = {
  onRollComplete: PropTypes.func,
  modifier: PropTypes.number,
  disabled: PropTypes.bool,
};
