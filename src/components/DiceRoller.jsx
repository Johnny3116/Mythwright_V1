import { useState, useEffect } from 'react';
import styles from './components.module.css';

const HIT_RANGE = [6, 15];
const CRIT_RANGE = [16, 20];

function getResultClass(value, isRolling) {
  if (isRolling || value == null) return '';
  if (value === 1) return styles.diceResult1;
  if (value === 20) return styles.diceResult20;
  if (value >= CRIT_RANGE[0]) return styles.diceResultHit;
  if (value >= HIT_RANGE[0]) return styles.diceResultHit;
  return styles.diceResultMiss;
}

function getResultLabel(value) {
  if (value == null) return '';
  if (value === 1) return 'FUMBLE';
  if (value === 20) return 'NATURAL 20!';
  if (value >= CRIT_RANGE[0]) return 'CRITICAL HIT';
  if (value >= HIT_RANGE[0]) return 'HIT';
  return 'MISS';
}

export function DiceRoller({ isRolling = false, result = null, onRoll, label = 'D20', showResult = true }) {
  const [displayValue, setDisplayValue] = useState(null);
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    if (isRolling) {
      setAnimKey(k => k + 1);
      // Cycle through random values during animation
      let frame = 0;
      const interval = setInterval(() => {
        const arr = new Uint32Array(1);
        crypto.getRandomValues(arr);
        setDisplayValue((arr[0] % 20) + 1);
        frame++;
        if (frame > 12) clearInterval(interval);
      }, 100);
      return () => clearInterval(interval);
    } else if (result !== null) {
      setDisplayValue(result.raw ?? result.total ?? result);
    }
  }, [isRolling, result]);

  const value = isRolling ? displayValue : (result?.raw ?? result?.total ?? result ?? null);
  const resultClass = getResultClass(value, isRolling);
  const resultLabel = !isRolling && value !== null ? getResultLabel(value) : '';

  return (
    <div className={styles.diceRoller}>
      <div className={styles.diceLabel}>{label}</div>
      <div
        className={styles.diceContainer}
        onClick={!isRolling && onRoll ? onRoll : undefined}
        role={onRoll ? 'button' : undefined}
        tabIndex={onRoll ? 0 : undefined}
        aria-label={onRoll ? 'Roll dice' : undefined}
      >
        <div
          key={animKey}
          className={`${styles.diceFace} ${isRolling ? styles.diceRollingAnim : ''} ${resultClass}`}
        >
          {value ?? '?'}
        </div>
      </div>
      {showResult && resultLabel && (
        <div className={styles.diceResultText}>{resultLabel}</div>
      )}
    </div>
  );
}
