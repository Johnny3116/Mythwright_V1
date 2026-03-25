import styles from './components.module.css';

/**
 * Format a numeric modifier with an explicit sign (+/-).
 * @param {number} n
 * @returns {string}
 */
function signedNum(n) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  const v = Number(n);
  return v >= 0 ? `+${v}` : `${v}`;
}

/**
 * ZoneCard — Floating popup card showing zone details.
 *
 * Props:
 *   zone     {object}  Zone data object (see shape below).
 *   onClose  {Function} Called when the close button is clicked.
 *   position {object}  { top, left } in pixels for absolute positioning. Defaults { top: 0, left: 0 }.
 *
 * Zone shape:
 *   { id, name, subtitle, description, retreatModifier, trapBonus,
 *     connectedZones: string[],
 *     wildlife: { creature, attackDamage },
 *     flora: { spawnWeight } }
 */
export function ZoneCard({ zone, onClose, position = { top: 0, left: 0 } }) {
  if (!zone) return null;

  const {
    name,
    subtitle,
    description,
    retreatModifier,
    trapBonus,
    connectedZones = [],
    wildlife,
    flora,
  } = zone;

  const retreatVal = retreatModifier != null ? Number(retreatModifier) : null;
  const retreatClass = [
    styles.zoneCardStatVal,
    retreatVal != null && retreatVal > 0
      ? styles['zoneCardStatVal--positive']
      : retreatVal != null && retreatVal < 0
        ? styles['zoneCardStatVal--negative']
        : null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={styles.zoneCard}
      style={{ top: position.top, left: position.left }}
      role="dialog"
      aria-label={`Zone: ${name}`}
    >
      {/* Header */}
      <div className={styles.zoneCardHeader}>
        <div className={styles.zoneCardTitles}>
          <div className={styles.zoneCardName}>{name}</div>
          {subtitle && <div className={styles.zoneCardSubtitle}>{subtitle}</div>}
        </div>
        <button
          className={styles.zoneCardClose}
          onClick={onClose}
          aria-label="Close zone card"
          type="button"
        >
          ×
        </button>
      </div>

      {/* Body */}
      <div className={styles.zoneCardBody}>
        {description && (
          <p className={styles.zoneCardDescription}>{description}</p>
        )}

        {/* Connected zones */}
        {connectedZones.length > 0 && (
          <div className={styles.zoneCardSection}>
            <span className={styles.zoneCardSectionLabel}>Connected Zones</span>
            <div className={styles.zoneCardBadges}>
              {connectedZones.map((z) => (
                <span key={z} className={styles.zoneCardBadge}>{z}</span>
              ))}
            </div>
          </div>
        )}

        {/* Wildlife */}
        {wildlife?.creature && (
          <div className={styles.zoneCardSection}>
            <span className={styles.zoneCardSectionLabel}>Wildlife</span>
            <div className={styles.zoneCardStatRow}>
              <div className={styles.zoneCardStat}>
                <span className={styles.zoneCardStatKey}>Creature:</span>
                <span className={styles.zoneCardStatVal}>{wildlife.creature}</span>
              </div>
              {wildlife.attackDamage != null && (
                <div className={styles.zoneCardStat}>
                  <span className={styles.zoneCardStatKey}>Dmg:</span>
                  <span className={styles.zoneCardStatVal}>{wildlife.attackDamage}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Trap bonus + Retreat modifier */}
        {(trapBonus != null || retreatModifier != null) && (
          <div className={styles.zoneCardSection}>
            <span className={styles.zoneCardSectionLabel}>Zone Modifiers</span>
            <div className={styles.zoneCardStatRow}>
              {trapBonus != null && (
                <div className={styles.zoneCardStat}>
                  <span className={styles.zoneCardStatKey}>Trap bonus:</span>
                  <span className={styles.zoneCardStatVal}>{trapBonus}</span>
                </div>
              )}
              {retreatModifier != null && (
                <div className={styles.zoneCardStat}>
                  <span className={styles.zoneCardStatKey}>Retreat:</span>
                  <span className={retreatClass}>{signedNum(retreatVal)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Flora spawn weight */}
        {flora?.spawnWeight != null && (
          <div className={styles.zoneCardSection}>
            <span className={styles.zoneCardSectionLabel}>Flora</span>
            <div className={styles.zoneCardStat}>
              <span className={styles.zoneCardStatKey}>Spawn weight:</span>
              <span className={styles.zoneCardStatVal}>{flora.spawnWeight}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
