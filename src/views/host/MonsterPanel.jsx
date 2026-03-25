import { HealthBar } from '@components/HealthBar.jsx';
import { StatCard } from '@components/StatCard.jsx';
import styles from './host.module.css';

export function MonsterPanel({ bossState, blueprint }) {
  if (!bossState || !blueprint) {
    return <div className={styles.section}><span style={{ color: 'var(--text-muted)' }}>No boss data</span></div>;
  }

  const stages = blueprint.enemies.boss.stages;
  const currentStage = stages[bossState.currentStage];
  const nextStage = stages[bossState.currentStage + 1];
  const [dmgMin, dmgMax] = Array.isArray(bossState.damage) ? bossState.damage : [bossState.damage, bossState.damage];

  return (
    <div className={styles.section}>
      <div className={styles.monsterName}>{bossState.name}</div>
      {currentStage && (
        <div className={styles.stageBadge}>
          Stage {bossState.currentStage + 1}: {currentStage.name}
        </div>
      )}

      <HealthBar current={bossState.hp} max={bossState.maxHp} label="Boss HP" />

      <div className={styles.monsterStats}>
        <div className={styles.monsterStatRow}>
          <span>Damage</span>
          <span>{dmgMin}–{dmgMax}</span>
        </div>
        <div className={styles.monsterStatRow}>
          <span>Defense</span>
          <span>{bossState.defense}</span>
        </div>
        <div className={styles.monsterStatRow}>
          <span>Zone</span>
          <span>{bossState.zone}</span>
        </div>
        {currentStage?.retreatThreshold && (
          <div className={styles.monsterStatRow}>
            <span>Evolves at</span>
            <span style={{ color: 'var(--accent-danger)' }}>{currentStage.retreatThreshold} HP</span>
          </div>
        )}
      </div>

      {currentStage?.specialTraits && (
        <div>
          <div className={styles.sectionTitle}>Traits</div>
          {currentStage.specialTraits.map((t, i) => (
            <div key={i} style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', padding: 'var(--space-1) 0' }}>• {t}</div>
          ))}
        </div>
      )}

      {nextStage && (
        <div>
          <div className={styles.sectionTitle}>Next Evolution</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            Stage {bossState.currentStage + 2}: {nextStage.name} ({nextStage.maxHp} HP)
          </div>
        </div>
      )}
    </div>
  );
}
