import styles from './character.module.css';

export function ClassCard({ classData, selected, onClick }) {
  if (!classData) return null;
  const { name, icon, baseStats, specialAbility } = classData;
  const [dmgMin, dmgMax] = Array.isArray(baseStats.damage) ? baseStats.damage : [baseStats.damage, baseStats.damage];

  return (
    <div
      className={`${styles.classCard} ${selected ? styles.classCardSelected : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
    >
      <div className={styles.classCardIcon}>{icon}</div>
      <div className={styles.classCardName}>{name}</div>

      <div className={styles.classCardStats}>
        <div className={styles.classStatRow}>
          <span className={styles.classStatLabel}>HP</span>
          <span className={styles.classStatValue}>{baseStats.hp}</span>
        </div>
        <div className={styles.classStatRow}>
          <span className={styles.classStatLabel}>Damage</span>
          <span className={styles.classStatValue}>{dmgMin}–{dmgMax}</span>
        </div>
        <div className={styles.classStatRow}>
          <span className={styles.classStatLabel}>Defense</span>
          <span className={styles.classStatValue}>{baseStats.defense}</span>
        </div>
      </div>

      {specialAbility && (
        <div className={styles.classAbility}>
          <span className={styles.abilityName}>{specialAbility.name}</span>
          {specialAbility.description}
        </div>
      )}
    </div>
  );
}
