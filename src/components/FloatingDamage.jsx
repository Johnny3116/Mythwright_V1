import { useState, useEffect } from 'react';
import styles from './components.module.css';

/**
 * FloatingDamage — Damage/heal numbers that float upward and fade out.
 * @param {{ id, value, type: 'damage'|'heal'|'crit', x, y }} event
 */
export function FloatingDamage({ events = [] }) {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {events.map(ev => (
        <FloatingNumber key={ev.id} event={ev} />
      ))}
    </div>
  );
}

function FloatingNumber({ event }) {
  const typeClass = {
    damage: styles.floatingDamageDmg,
    heal: styles.floatingDamageHeal,
    crit: styles.floatingDamageCrit,
  }[event.type] || styles.floatingDamageDmg;

  return (
    <div
      className={`${styles.floatingDamage} ${typeClass}`}
      style={{
        left: `${event.x || 50}%`,
        top: `${event.y || 50}%`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {event.type === 'heal' ? '+' : '-'}{Math.abs(event.value)}
    </div>
  );
}
