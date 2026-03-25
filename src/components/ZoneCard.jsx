import styles from './components.module.css';

/**
 * ZoneCard — Popup card showing full zone info from the blueprint.
 *
 * @param {object} props
 * @param {object} props.zone - Zone object from blueprint zones[]
 * @param {function} [props.onClose]
 * @param {Array} [props.activeTraps] - Trap objects currently in this zone
 */
export function ZoneCard({ zone, onClose, activeTraps = [] }) {
  if (!zone) return null;

  const retreatSign = zone.retreatModifier > 0 ? `+${zone.retreatModifier}` : `${zone.retreatModifier}`;

  return (
    <div className={styles.zoneCard}>
      <div className={styles.zoneCardHeader}>
        <div>
          <h3 className={styles.zoneCardName}>{zone.name}</h3>
          {zone.subtitle && (
            <p className={styles.zoneCardSubtitle}>{zone.subtitle}</p>
          )}
        </div>
        {onClose && (
          <button className={styles.zoneCardClose} onClick={onClose} aria-label="Close">×</button>
        )}
      </div>

      {zone.description && (
        <p className={styles.zoneCardDescription}>{zone.description}</p>
      )}

      <div className={styles.zoneCardStats}>
        {zone.retreatModifier !== null && zone.retreatModifier !== undefined && (
          <div className={styles.zoneCardStat}>
            <span className={styles.zoneCardStatLabel}>Retreat</span>
            <span className={`${styles.zoneCardStatValue} ${zone.retreatModifier > 0 ? styles.zoneStatPos : zone.retreatModifier < 0 ? styles.zoneStatNeg : ''}`}>
              {retreatSign}
            </span>
          </div>
        )}
        {zone.trapBonus && (
          <div className={styles.zoneCardStatFull}>
            <span className={styles.zoneCardStatLabel}>Trap Bonus</span>
            <span className={styles.zoneCardStatText}>{zone.trapBonus}</span>
          </div>
        )}
      </div>

      {zone.wildlife && (
        <div className={styles.zoneCardSection}>
          <h4 className={styles.zoneCardSectionTitle}>Wildlife</h4>
          <p className={styles.zoneCardSectionText}>
            <strong>{zone.wildlife.creature}</strong> ({zone.wildlife.type})
          </p>
          <p className={styles.zoneCardSectionMeta}>
            Attack on roll {zone.wildlife.attackChance?.[0]}–{zone.wildlife.attackChance?.[1]} · {zone.wildlife.attackDamage} dmg
          </p>
        </div>
      )}

      {activeTraps.length > 0 && (
        <div className={styles.zoneCardSection}>
          <h4 className={styles.zoneCardSectionTitle}>Active Traps</h4>
          {activeTraps.map((trap, i) => (
            <p key={i} className={styles.zoneCardSectionText}>⚙ {trap.name}</p>
          ))}
        </div>
      )}

      {zone.connectedZones?.length > 0 && (
        <div className={styles.zoneCardSection}>
          <h4 className={styles.zoneCardSectionTitle}>Connects to</h4>
          <p className={styles.zoneCardSectionMeta}>{zone.connectedZones.join(', ')}</p>
        </div>
      )}
    </div>
  );
}
