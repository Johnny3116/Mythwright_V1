import styles from './components.module.css';

export function ZoneCard({ zone, traps = [], floraState = {} }) {
  if (!zone) return null;

  const hasFlora = floraState[zone.id];
  const zoneTrap = traps.filter(t => t.zoneId === zone.id && t.active);

  return (
    <div className={styles.zoneCard}>
      <div className={styles.zoneCardTitle}>{zone.name}</div>
      <div className={styles.zoneCardSubtitle}>{zone.subtitle}</div>
      <div className={styles.zoneCardDesc}>{zone.description}</div>

      {zone.retreatModifier != null && (
        <div className={styles.zoneCardStat}>
          <span className={styles.zoneCardStatLabel}>Retreat Modifier</span>
          <span className={styles.zoneCardStatValue}>
            {zone.retreatModifier > 0 ? `+${zone.retreatModifier}` : zone.retreatModifier}
          </span>
        </div>
      )}

      {zone.trapBonus && (
        <div className={styles.zoneCardStat}>
          <span className={styles.zoneCardStatLabel}>Trap Bonus</span>
          <span className={styles.zoneCardStatValue}>{zone.trapBonus}</span>
        </div>
      )}

      {zone.wildlife && (
        <div className={styles.zoneCardStat}>
          <span className={styles.zoneCardStatLabel}>Wildlife</span>
          <span className={styles.zoneCardStatValue}>{zone.wildlife.creature}</span>
        </div>
      )}

      {hasFlora && (
        <div className={styles.zoneCardStat}>
          <span className={styles.zoneCardStatLabel}>Flora</span>
          <span className={styles.zoneCardStatValue}>🌿 {floraState[zone.id].plantName}</span>
        </div>
      )}

      {zoneTrap.length > 0 && (
        <div className={styles.zoneCardStat}>
          <span className={styles.zoneCardStatLabel}>Traps</span>
          <span className={styles.zoneCardStatValue}>⚙️ {zoneTrap.map(t => t.trapName).join(', ')}</span>
        </div>
      )}

      {zone.connectedZones && zone.connectedZones.length > 0 && (
        <div className={styles.zoneCardStat}>
          <span className={styles.zoneCardStatLabel}>Connected</span>
          <span className={styles.zoneCardStatValue}>{zone.connectedZones.length} zones</span>
        </div>
      )}
    </div>
  );
}
