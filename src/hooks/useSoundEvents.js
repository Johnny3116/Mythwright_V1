/**
 * useSoundEvents — Event hook system for game audio.
 *
 * No audio files are required. This module publishes named game events so
 * any future sound implementation can subscribe without touching game logic.
 *
 * Usage (emitting events — already wired in by useGameEngine):
 *   soundEvents.emit('attack')
 *   soundEvents.emit('damage', { amount: 12 })
 *   soundEvents.emit('miss')
 *   soundEvents.emit('evolution')
 *   soundEvents.emit('victory')
 *   soundEvents.emit('defeat')
 *   soundEvents.emit('boss_turn')
 *   soundEvents.emit('heal')
 *   soundEvents.emit('trap_set')
 *   soundEvents.emit('retreat')
 *
 * Usage (subscribing to events in a component):
 *   const { on, off } = useSoundEvents();
 *   useEffect(() => {
 *     function handleAttack() { playSound('attack'); }
 *     on('attack', handleAttack);
 *     return () => off('attack', handleAttack);
 *   }, []);
 */

// ---------------------------------------------------------------------------
// Module-level event bus — singleton shared across all hook instances
// ---------------------------------------------------------------------------

/** @type {Map<string, Set<Function>>} */
const listeners = new Map();

export const soundEvents = {
  /**
   * Emit a named sound event.
   * @param {string} event
   * @param {object} [data]
   */
  emit(event, data) {
    const fns = listeners.get(event);
    if (!fns) return;
    fns.forEach(fn => {
      try { fn(data); } catch (e) { console.error('[soundEvents] Listener error:', e); }
    });
  },

  /**
   * Subscribe to a named sound event.
   * @param {string} event
   * @param {Function} fn
   */
  on(event, fn) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(fn);
  },

  /**
   * Unsubscribe a listener.
   * @param {string} event
   * @param {Function} fn
   */
  off(event, fn) {
    listeners.get(event)?.delete(fn);
  },
};

// ---------------------------------------------------------------------------
// React hook for components
// ---------------------------------------------------------------------------

/**
 * Returns the sound event bus. Components use `on`/`off` to subscribe
 * to events, and `emit` to fire them.
 */
export function useSoundEvents() {
  return soundEvents;
}
