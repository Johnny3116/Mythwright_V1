import { HealthBar } from '@components/HealthBar.jsx';
import { StatCard } from '@components/StatCard.jsx';
import styles from './game.module.css';

export function CharacterSheet({ player }) {
  if (!player) {
    return <div className={styles.charSheet}><span style={{ color: 'var(--text-muted)' }}>No character</span></div>;
  }

  const [dmgMin, dmgMax] = Array.isArray(player.damage) ? player.damage : [player.damage, player.damage];
  const effects = player.statusEffects || [];

  return (
    <div className={styles.charSheet}>
      <div>
        <div className={styles.playerName}>{player.classIcon} {player.name}</div>
        <div className={styles.playerClass}>{player.className}</div>
      </div>

      <HealthBar current={player.hp} max={player.maxHp} label="HP" />

      <div className={styles.statsGrid}>
        <StatCard label="DMG" value={`${dmgMin}–${dmgMax}`} icon="⚔️" />
        <StatCard label="DEF" value={player.defense} icon="🛡️" />
        {player.consecutiveHits > 0 && (
          <StatCard label="Combo" value={player.consecutiveHits} icon="🔥" />
        )}
      </div>

      {player.specialAbility && (
        <div>
          <div className={styles.sidebarTitle}>Special Ability</div>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            <strong style={{ color: 'var(--accent-secondary)' }}>{player.specialAbility.name}</strong>
            <br />
            {player.specialAbility.description}
          </div>
        </div>
      )}

      {effects.length > 0 && (
        <div>
          <div className={styles.sidebarTitle}>Status Effects</div>
          <div className={styles.statusEffects}>
            {effects.map((e, i) => (
              <span key={i} className={styles.effectTag}>
                {e.type} ({e.remainingDuration})
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>
        Zone: {player.zone}
      </div>
    </div>
  );
}
