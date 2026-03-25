import { useCallback, useRef, useState } from 'react';
import { DICE_FACES } from '@utils/constants';

/** Animation duration in milliseconds before the result is committed. */
const ROLL_ANIMATION_MS = 1500;

/**
 * rollD20 — Produce a cryptographically random integer in [1, DICE_FACES].
 * Never uses Math.random().
 *
 * @returns {number} Integer between 1 and 20 inclusive.
 */
function rollD20() {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  // Rejection-sample to avoid modulo bias on the full 32-bit range.
  // The accepted range is the largest multiple of DICE_FACES that fits
  // in 32 bits: floor(2^32 / DICE_FACES) * DICE_FACES.
  const max = Math.floor(0x100000000 / DICE_FACES) * DICE_FACES;
  let value = buf[0];
  while (value >= max) {
    crypto.getRandomValues(buf);
    value = buf[0];
  }
  return (value % DICE_FACES) + 1;
}

/**
 * useDiceRoll — Animated D20 dice rolling hook.
 *
 * @param {object}   [callbacks]            - Optional lifecycle callbacks.
 * @param {Function} [callbacks.onRollStart] - Called immediately when rolling begins.
 * @param {Function} [callbacks.onRollEnd]   - Called with the result object after animation.
 *
 * @returns {{
 *   roll: (modifier?: number) => { raw: number, modifier: number, total: number },
 *   isRolling: boolean,
 *   result: { raw: number, modifier: number, total: number } | null,
 *   reset: () => void,
 * }}
 */
export function useDiceRoll({ onRollStart, onRollEnd } = {}) {
  const [isRolling, setIsRolling] = useState(false);
  const [result, setResult] = useState(null);

  // Keep a ref to the animation timeout so we can cancel on unmount.
  const timerRef = useRef(null);

  const roll = useCallback(
    (modifier = 0) => {
      // Compute the real result immediately (deterministic, synchronous).
      const raw = rollD20();
      const total = raw + modifier;
      const resultObj = { raw, modifier, total };

      // Fire the start callback and update rolling state.
      setIsRolling(true);
      setResult(null);
      onRollStart?.();

      // Clear any previous pending timer.
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }

      // Commit the result to state after the animation delay.
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        setIsRolling(false);
        setResult(resultObj);
        onRollEnd?.(resultObj);
      }, ROLL_ANIMATION_MS);

      // Return the result immediately so callers can use it without waiting.
      return resultObj;
    },
    [onRollStart, onRollEnd]
  );

  const reset = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsRolling(false);
    setResult(null);
  }, []);

  return { roll, isRolling, result, reset };
}
