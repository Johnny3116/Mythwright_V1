import { HealthBar } from '@components/HealthBar.jsx';
import styles from './host.module.css';

export function PlayerOverview({ players = {} }) {
  const playerList = Object.values(players);
  if (playerList.length === 0) {
    return <div className={styles.section}><span style={{ color: 'var(--text-muted)' }}>No players</span></div>;
  }

  return (
    <div className={styles.section}>
      {playerList.map(player => (
        <div key={player.id} className={styles.playerCard} style={{ opacity: player.alive ? 1 : 0.4 }}>
          <div className={styles.playerCardHeader}>
            <span className={styles.playerCardIcon}>{player.classIcon || '🧑'}</span>
            <div>
              <div className={styles.playerCardName}>{player.name}</div>
              <div className={styles.playerCardZone}>{player.className} · {player.zone}</div>
            </div>
            {!player.alive && <span style={{ marginLeft: 'auto', color: 'var(--accent-danger)', fontSize: 'var(--text-xs)' }}>DEAD</span>}
          </div>
          <HealthBar current={player.hp} max={player.maxHp} />
          {player.statusEffects?.length > 0 && (
            <div style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap' }}>
              {player.statusEffects.map((e, i) => (
                <span key={i} style={{ fontSize: 'var(--text-xs)', padding: '2px 6px', background: 'rgba(199,74,56,0.1)', border: '1px solid var(--accent-danger)', borderRadius: 'var(--border-radius-sm)', color: 'var(--accent-danger)' }}>
                  {e.type}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
