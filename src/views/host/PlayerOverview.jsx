import styles from './host.module.css';
import { HealthBar } from '@components/HealthBar';

// ---------------------------------------------------------------------------
// Class metadata (icon + display name)
// ---------------------------------------------------------------------------

const CLASS_META = {
  assault:   { icon: '⚔️',  label: 'Assault' },
  trapper:   { icon: '🪤',  label: 'Trapper' },
  medic:     { icon: '💉',  label: 'Medic' },
  scout:     { icon: '👁️',  label: 'Scout' },
  brawler:   { icon: '👊',  label: 'Brawler' },
  engineer:  { icon: '🔧',  label: 'Engineer' },
};

function getClassMeta(classId) {
  return CLASS_META[classId] ?? { icon: '🧙', label: classId ?? 'Hunter' };
}

// ---------------------------------------------------------------------------
// PlayerCard
// ---------------------------------------------------------------------------

function PlayerCard({ player }) {
  if (!player) return null;

  const hpPct = player.maxHp > 0 ? (player.hp / player.maxHp) * 100 : 0;
  const isDanger = !player.isDead && hpPct <= 30;
  const isDead = player.isDead ?? false;
  const effects = player.effects ?? [];
  const { icon: classIcon, label: classLabel } = getClassMeta(player.classId);

  const zoneName = player.zoneId
    ? player.zoneId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    : 'Unknown Zone';

  let cardClass = styles.playerCard;
  if (isDead)   cardClass += ` ${styles.dead}`;
  else if (isDanger) cardClass += ` ${styles.danger}`;

  return (
    <div className={cardClass}>
      {isDead && (
        <div className={styles.playerDeadOverlay} aria-label="Player defeated">
          💀
        </div>
      )}

      {/* Name + Class */}
      <div className={styles.playerCardHeader}>
        <span className={styles.playerName} title={player.name}>{player.name}</span>
        <span className={styles.playerClass}>
          {classIcon} {classLabel}
        </span>
      </div>

      {/* HP Bar */}
      <HealthBar
        current={player.hp}
        max={player.maxHp}
        showText
        size="sm"
      />

      {/* Zone */}
      <div className={styles.playerZone}>
        <span className={styles.playerZoneIcon}>📍</span>
        <span>{zoneName}</span>
      </div>

      {/* Active Effects */}
      {effects.length > 0 && (
        <div className={styles.playerEffects}>
          {effects.map((eff, i) => (
            <span key={i} className={styles.playerEffectBadge}>
              {typeof eff === 'string' ? eff : eff.name ?? eff.id ?? 'effect'}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PlayerOverview
// ---------------------------------------------------------------------------

/**
 * PlayerOverview — Grid of all player cards for the GM panel.
 *
 * Props:
 *   players   {object}  gameState.players — keyed by player ID
 *   blueprint {object}  Campaign blueprint (optional, for class lookup)
 */
export function PlayerOverview({ players = {}, blueprint }) {
  const playerList = Object.values(players);

  return (
    <>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionHeaderIcon}>👥</span>
        <span className={`${styles.sectionHeaderTitle} ${styles.gold}`}>
          Hunters ({playerList.length})
        </span>
      </div>

      <div className={styles.playerOverview}>
        {playerList.length === 0 ? (
          <p className={styles.noPlayers}>No hunters connected.</p>
        ) : (
          <div className={styles.playerGrid}>
            {playerList.map((player) => (
              <PlayerCard key={player.id} player={player} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
