import { useState, useEffect, useRef } from 'react';
import styles from './components.module.css';

/**
 * Determine the visual result category from a roll value.
 * Uses standard Mythwright hit ranges: miss 1-5, hit 6-15, crit 16-20.
 * @param {number} result
 * @returns {'miss'|'hit'|'critical'|null}
 */
function getResultType(result) {
  if (result === null || result === undefined) return null;
  if (result <= 5) return 'miss';
  if (result <= 15) return 'hit';
  return 'critical';
}

/**
 * D20 face SVG — drawn as a hexagonal outline with inner triangles.
 */
function D20Face({ result, resultType, rolling }) {
  const label = rolling ? '?' : (result ?? '');
  return (
    <svg
      className={styles.diceFaceSvg}
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      {/* Outer hexagon (D20 face outline) */}
      <polygon
        points="50,5 90,27.5 90,72.5 50,95 10,72.5 10,27.5"
        className={`${styles.dicePolygon} ${resultType ? styles[`dicePolygon__${resultType}`] : ''}`}
      />
      {/* Inner face triangle lines */}
      <polygon
        points="50,5 90,27.5 50,50"
        className={styles.diceInnerLine}
      />
      <polygon
        points="90,27.5 90,72.5 50,50"
        className={styles.diceInnerLine}
      />
      <polygon
        points="90,72.5 50,95 50,50"
        className={styles.diceInnerLine}
      />
      <polygon
        points="50,95 10,72.5 50,50"
        className={styles.diceInnerLine}
      />
      <polygon
        points="10,72.5 10,27.5 50,50"
        className={styles.diceInnerLine}
      />
      <polygon
        points="10,27.5 50,5 50,50"
        className={styles.diceInnerLine}
      />
      {/* Result number */}
      <text
        x="50"
        y="57"
        textAnchor="middle"
        className={`${styles.diceNumber} ${resultType ? styles[`diceNumber__${resultType}`] : ''}`}
      >
        {label}
      </text>
    </svg>
  );
}

/**
 * DiceRoller — Animated D20 component.
 *
 * @param {object} props
 * @param {boolean} props.rolling - True while the dice animation is active
 * @param {number|null} props.result - Final roll result (1-20), null while rolling
 * @param {function} [props.onRollComplete] - Called when the animation finishes
 * @param {boolean} [props.showLabel=true] - Show result label text below dice
 */
export function DiceRoller({ rolling, result, onRollComplete, showLabel = true }) {
  const [displayResult, setDisplayResult] = useState(null);
  const [animState, setAnimState] = useState('idle'); // idle | rolling | revealing | done
  const [shuffleNum, setShuffleNum] = useState(null);
  const shuffleRef = useRef(null);
  const revealTimeoutRef = useRef(null);

  // Kick off animation when rolling starts
  useEffect(() => {
    if (rolling) {
      setAnimState('rolling');
      setDisplayResult(null);
      // Shuffle numbers rapidly during roll
      let tick = 0;
      shuffleRef.current = setInterval(() => {
        tick++;
        setShuffleNum(Math.floor(Math.random() * 20) + 1);
      }, 80);
    } else if (!rolling && animState === 'rolling' && result !== null) {
      // Rolling stopped — clear shuffle, reveal result
      clearInterval(shuffleRef.current);
      setShuffleNum(null);
      setAnimState('revealing');
      revealTimeoutRef.current = setTimeout(() => {
        setDisplayResult(result);
        setAnimState('done');
        onRollComplete?.();
      }, 300);
    }
    return () => {
      clearInterval(shuffleRef.current);
      clearTimeout(revealTimeoutRef.current);
    };
  }, [rolling, result]); // eslint-disable-line react-hooks/exhaustive-deps

  // If result is provided with no rolling transition, show it immediately
  useEffect(() => {
    if (!rolling && result !== null && animState === 'idle') {
      setDisplayResult(result);
      setAnimState('done');
    }
    if (!rolling && result === null) {
      setDisplayResult(null);
      setAnimState('idle');
    }
  }, [rolling, result, animState]);

  const shownResult = animState === 'rolling' ? shuffleNum : displayResult;
  const resultType = animState === 'done' ? getResultType(displayResult) : null;

  const resultLabels = {
    miss: 'Miss',
    hit: 'Hit',
    critical: 'Critical Hit!',
  };

  return (
    <div
      className={`${styles.diceRoller} ${styles[`diceRoller__${animState}`] || ''}`}
      role="img"
      aria-label={
        animState === 'done'
          ? `Rolled ${displayResult} — ${resultLabels[resultType] ?? ''}`
          : 'Dice rolling…'
      }
    >
      <div className={`${styles.diceContainer} ${rolling || animState === 'rolling' ? styles.diceRolling : ''}`}>
        <D20Face
          result={shownResult}
          resultType={resultType}
          rolling={rolling || animState === 'rolling'}
        />
      </div>

      {showLabel && animState === 'done' && resultType && (
        <div className={`${styles.diceResultLabel} ${styles[`diceResultLabel__${resultType}`]}`}>
          {resultLabels[resultType]}
        </div>
      )}
    </div>
  );
}
