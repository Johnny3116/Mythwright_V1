/**
 * useDiceRoll — React hook for animated dice rolling
 */

import { useState, useCallback } from 'react';
import { rollD20 } from '@engine/DiceSystem.js';

const ANIMATION_DURATION_MS = 1500;

/**
 * Hook for triggering D20 rolls with animation state.
 * @returns {{ isRolling: boolean, lastRoll: object|null, roll: Function }}
 */
export function useDiceRoll(options = {}) {
  const { onRollEnd } = options;
  const [isRolling, setIsRolling] = useState(false);
  const [lastRoll, setLastRoll] = useState(null);
  const [animationRolls, setAnimationRolls] = useState([]);

  /**
   * Trigger a D20 roll with animation.
   * @param {number} modifier
   * @returns {Promise<{ raw: number, modifier: number, total: number }>}
   */
  const roll = useCallback((modifier = 0) => {
    return new Promise((resolve) => {
      setIsRolling(true);

      // Generate random intermediate values for animation
      const intermediates = Array.from({ length: 8 }, () => {
        const arr = new Uint32Array(1);
        crypto.getRandomValues(arr);
        return (arr[0] % 20) + 1;
      });
      setAnimationRolls(intermediates);

      // The actual roll
      const result = rollD20(modifier);

      // Resolve after animation completes
      setTimeout(() => {
        setLastRoll(result);
        setIsRolling(false);
        setAnimationRolls([]);
        onRollEnd?.(result);
        resolve(result);
      }, ANIMATION_DURATION_MS);
    });
  }, []);

  /**
   * Roll immediately without animation (for automated/scripted actions).
   * @param {number} modifier
   * @returns {{ raw: number, modifier: number, total: number }}
   */
  const rollImmediate = useCallback((modifier = 0) => {
    const result = rollD20(modifier);
    setLastRoll(result);
    return result;
  }, []);

  return {
    isRolling,
    lastRoll,
    result: lastRoll,  // alias for DiceRoller component compatibility
    animationRolls,
    roll,
    rollImmediate,
  };
}
