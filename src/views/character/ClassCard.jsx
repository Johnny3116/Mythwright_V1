import styles from './character.module.css';

/**
 * ClassCard — Displays a single playable class with stats and special ability.
 *
 * Props:
 *   classData    {object}  { id, name, icon, baseStats: { hp, damage, defense }, specialAbility: { name, description } }
 *   isSelected   {boolean} Whether this card is currently selected by the local player.
 *   isTaken      {boolean} Whether another player has already chosen this class.
 *   takenByName  {string}  The name of the player who took this class (shown in overlay).
 *   onSelect     {Function} Called with classData.id when the select button is clicked.
 */
export function ClassCard({ classData, isSelected, isTaken, takenByName, onSelect }) {
  if (!classData) return null;

  const { id, name, icon, baseStats = {}, specialAbility } = classData;
  const { hp = 0, damage = [0, 0], defense = 0 } = baseStats;

  // Normalise damage — support both array [min, max] and single number.
  const dmgMin = Array.isArray(damage) ? damage[0] : damage;
  const dmgMax = Array.isArray(damage) ? damage[1] : damage;
  const dmgLabel = dmgMin === dmgMax ? String(dmgMin) : `${dmgMin}–${dmgMax}`;

  // Map stats to 0–100 scale for the visual bars.
  const hpPct  = Math.min(100, Math.round((hp / 140) * 100));
  const dmgAvg = (dmgMin + dmgMax) / 2;
  const dmgPct = Math.min(100, Math.round((dmgAvg / 30) * 100));
  const defPct = Math.min(100, Math.round((defense / 25) * 100));

  const cardClass = [
    styles.classCard,
    isSelected ? styles.selected : null,
    isTaken    ? styles.taken    : null,
  ]
    .filter(Boolean)
    .join(' ');

  function handleSelect() {
    if (!isTaken) onSelect?.(id);
  }

  return (
    <div
      className={cardClass}
      onClick={handleSelect}
      role="button"
      tabIndex={isTaken ? -1 : 0}
      aria-pressed={isSelected}
      aria-label={`${name} class${isTaken ? ` — taken by ${takenByName}` : ''}`}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !isTaken) {
          e.preventDefault();
          handleSelect();
        }
      }}
    >
      {/* Top: icon + class name */}
      <div className={styles.classCardTop}>
        <div className={styles.classIcon} aria-hidden="true">
          {icon ?? '?'}
        </div>
        <div className={styles.classInfo}>
          <h3 className={styles.className}>{name}</h3>
          <span className={styles.classSubtitle}>Character Class</span>
        </div>
      </div>

      {/* Stat bars */}
      <div className={styles.statBars}>
        <StatBar label="HP"  value={hp}      pct={hpPct}  type="hp"  />
        <StatBar label="DMG" value={dmgLabel} pct={dmgPct} type="dmg" />
        <StatBar label="DEF" value={defense}  pct={defPct} type="def" />
      </div>

      {/* Special ability */}
      {specialAbility && (
        <div className={styles.abilitySection}>
          <div className={styles.abilityLabel}>Special Ability</div>
          <p className={styles.abilityName}>{specialAbility.name}</p>
          <p className={styles.abilityDesc}>{specialAbility.description}</p>
        </div>
      )}

      {/* Select button */}
      <button
        className={[styles.selectBtn, isSelected ? styles.active : null]
          .filter(Boolean)
          .join(' ')}
        onClick={(e) => { e.stopPropagation(); handleSelect(); }}
        disabled={isTaken}
        type="button"
        tabIndex={-1}
        aria-hidden="true"
      >
        {isSelected ? '✓ Selected' : 'Select'}
      </button>

      {/* Taken overlay */}
      {isTaken && (
        <div className={styles.takenOverlay} aria-hidden="true">
          <div className={styles.takenBy}>
            <strong>{takenByName ?? 'Another player'}</strong>
            has chosen this class
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Internal: single stat bar row ──────────────────────── */

function StatBar({ label, value, pct, type }) {
  return (
    <div className={styles.statBar}>
      <span className={styles.statBarLabel}>{label}</span>
      <div className={styles.statBarTrack}>
        <div
          className={[styles.statBarFill, styles[type]].join(' ')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={styles.statBarValue}>{value}</span>
    </div>
  );
}
