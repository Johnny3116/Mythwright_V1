import styles from './host.module.css';
import { HealthBar } from '@components/HealthBar';
import { StatCard } from '@components/StatCard';

// ---------------------------------------------------------------------------
// Behavior descriptions keyed by action type ID
// ---------------------------------------------------------------------------

const BEHAVIOR_META = {
  dodge:         { icon: '🌀', label: 'Dodge',      desc: 'Evades next incoming attack' },
  burrow:        { icon: '🪱', label: 'Burrow',     desc: 'Retreats underground, untargetable' },
  grab:          { icon: '🦎', label: 'Grab',       desc: 'Seizes a hunter — immobilizes' },
  charge:        { icon: '⚡', label: 'Charge',     desc: 'Rushes a zone, hits all occupants' },
  tail_sweep:    { icon: '🌊', label: 'Tail Sweep', desc: 'Hits all hunters in current zone' },
  roar:          { icon: '🔊', label: 'Roar',       desc: 'Fear effect — skip next action' },
  acid_spit:     { icon: '🟢', label: 'Acid Spit',  desc: 'Ranged attack, applies poison' },
  stomp:         { icon: '👊', label: 'Stomp',      desc: 'Area damage in zone, trap clears' },
  evolve:        { icon: '✨', label: 'Evolve',     desc: 'Boss advances to next stage' },
  melee_attack:  { icon: '⚔️', label: 'Attack',     desc: 'Standard melee strike' },
};

function getBehaviorMeta(id) {
  return BEHAVIOR_META[id] ?? { icon: '❓', label: id ?? 'Unknown', desc: '' };
}

// ---------------------------------------------------------------------------
// Stage behaviors (fallback descriptions per stage index)
// ---------------------------------------------------------------------------

const STAGE_BEHAVIORS = [
  ['melee_attack', 'charge', 'dodge'],
  ['melee_attack', 'charge', 'burrow'],
  ['tail_sweep', 'roar', 'burrow'],
  ['grab', 'acid_spit', 'stomp'],
  ['grab', 'acid_spit', 'charge', 'tail_sweep'],
];

// ---------------------------------------------------------------------------
// SkeletonState — shown when no boss data available
// ---------------------------------------------------------------------------

function SkeletonState() {
  return (
    <div className={styles.monsterPanel}>
      <div className={styles.monsterIdentity}>
        <div className={`${styles.skeletonLine} ${styles.wide}`} />
        <div className={`${styles.skeletonLine} ${styles.short}`} />
      </div>
      <div className={styles.skeletonBlock} />
      <div className={styles.skeletonBlock} />
      <div className={`${styles.skeletonLine} ${styles.med}`} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// MonsterPanel
// ---------------------------------------------------------------------------

/**
 * MonsterPanel — GM-side boss status and behavior display.
 *
 * Props:
 *   boss      {object}  BossState from gameState (hp, maxHp, stageIndex, name, stageName,
 *                       damage, defense, effects, isBurrowed, zoneId)
 *   stages    {Array}   Boss stage definitions from blueprint (stage, name, maxHp, damage,
 *                       defense, retreatThreshold, behaviors)
 *   blueprint {object}  Full campaign blueprint (optional, for title/lore)
 */
export function MonsterPanel({ boss, stages = [], blueprint }) {
  if (!boss) {
    return (
      <>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionHeaderIcon}>🐉</span>
          <span className={`${styles.sectionHeaderTitle} ${styles.red}`}>Boss Status</span>
        </div>
        <SkeletonState />
      </>
    );
  }

  const stageCount = Math.max(stages.length, 5);
  const currentStageIdx = boss.stageIndex ?? 0;
  const currentStage = stages[currentStageIdx] ?? null;

  // Boss name from boss state, fallback to blueprint
  const bossName = boss.name
    ?? blueprint?.enemies?.boss?.name
    ?? 'Unknown Boss';

  const bossTitle = blueprint?.enemies?.boss?.title
    ?? blueprint?.enemies?.boss?.subtitle
    ?? 'Ancient Terror';

  const stageName = boss.stageName
    ?? currentStage?.name
    ?? `Stage ${currentStageIdx + 1}`;

  // HP
  const currentHp = boss.hp ?? 0;
  const maxHp = boss.maxHp ?? currentStage?.maxHp ?? 100;

  // Retreat / evolution threshold
  const retreatThreshold = currentStage?.retreatThreshold ?? null;
  const nextStage = stages[currentStageIdx + 1] ?? null;

  // Damage range display
  const dmgMin = Array.isArray(boss.damage) ? boss.damage[0] : boss.damage ?? 0;
  const dmgMax = Array.isArray(boss.damage) ? boss.damage[1] : boss.damage ?? 0;
  const defense = boss.defense ?? currentStage?.defense ?? 0;

  // Behaviors for current stage
  const stageBehaviorIds =
    currentStage?.behaviors
      ?? STAGE_BEHAVIORS[currentStageIdx]
      ?? STAGE_BEHAVIORS[0];

  // Traits / special abilities
  const traits = currentStage?.traits
    ?? blueprint?.enemies?.boss?.traits
    ?? [];

  // Effects on boss
  const effects = boss.effects ?? [];

  return (
    <>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionHeaderIcon}>🐉</span>
        <span className={`${styles.sectionHeaderTitle} ${styles.red}`}>Boss Status</span>
      </div>

      <div className={styles.monsterPanel}>
        {/* Identity */}
        <div className={styles.monsterIdentity}>
          <div className={styles.monsterName}>{bossName}</div>
          <div className={styles.monsterTitle}>{bossTitle}</div>
          <div className={styles.stageBadge}>
            ⚡ {stageName}
          </div>
        </div>

        {/* Stage progression dots */}
        <div className={styles.stageIndicators}>
          <span className={styles.stageIndicatorsLabel}>Stage</span>
          {Array.from({ length: stageCount }, (_, i) => {
            let dotClass = styles.stageDot;
            if (i === currentStageIdx) dotClass += ` ${styles.active}`;
            else if (i < currentStageIdx) dotClass += ` ${styles.completed}`;
            return <span key={i} className={dotClass} title={stages[i]?.name ?? `Stage ${i + 1}`} />;
          })}
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', marginLeft: 'var(--space-1)' }}>
            {currentStageIdx + 1}/{stageCount}
          </span>
        </div>

        {/* HP Bar */}
        <div className={styles.bossHpSection}>
          <HealthBar
            current={currentHp}
            max={maxHp}
            label="VITALITY"
            showText
            size="lg"
          />
          {retreatThreshold !== null && nextStage && (
            <div className={styles.bossEvolutionThreshold}>
              <span>Evolves at</span>
              <span className={styles.bossEvolutionThresholdValue}>
                {retreatThreshold} HP → {nextStage.name}
              </span>
            </div>
          )}
          {!nextStage && currentStageIdx > 0 && (
            <div className={styles.bossEvolutionThreshold}>
              <span style={{ color: 'var(--accent-danger)', fontWeight: 700 }}>
                ⚠ Final Form — No retreat
              </span>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className={styles.monsterStatsRow}>
          <StatCard
            label="Damage"
            value={`${dmgMin}–${dmgMax}`}
            icon="⚔️"
            size="sm"
            variant={dmgMax >= 40 ? 'danger' : 'default'}
          />
          <StatCard
            label="Defense"
            value={defense}
            icon="🛡️"
            size="sm"
          />
        </div>

        {/* Burrowed state */}
        {boss.isBurrowed && (
          <div className={styles.monsterBurrowedBadge}>
            🪱 Burrowed — attacks will miss this turn
          </div>
        )}

        {/* Active effects on boss */}
        {effects.length > 0 && (
          <div className={styles.traitsList}>
            <span className={styles.traitsLabel}>Active Effects</span>
            {effects.map((eff, i) => (
              <span key={i} className={styles.traitBadge}>
                {eff.icon ?? '✦'} {eff.name ?? eff.id ?? eff}
              </span>
            ))}
          </div>
        )}

        {/* Behavior queue */}
        <div className={styles.behaviorQueue}>
          <span className={styles.behaviorQueueLabel}>Stage Behaviors</span>
          {stageBehaviorIds.slice(0, 3).map((behaviorId, i) => {
            const meta = getBehaviorMeta(behaviorId);
            return (
              <div key={i} className={styles.behaviorItem}>
                <span className={styles.behaviorItemIcon}>{meta.icon}</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', flex: 1 }}>
                  <span className={styles.behaviorItemLabel}>{meta.label}</span>
                  <span className={styles.behaviorItemDesc}>{meta.desc}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Traits */}
        {traits.length > 0 && (
          <div className={styles.traitsList}>
            <span className={styles.traitsLabel}>Special Traits</span>
            {traits.map((trait, i) => (
              <span key={i} className={styles.traitBadge}>
                ✦ {typeof trait === 'string' ? trait : trait.name ?? trait.id}
              </span>
            ))}
          </div>
        )}

        {/* Current zone */}
        {boss.zoneId && (
          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
            📍 Currently in: <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
              {boss.zoneId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </span>
          </div>
        )}
      </div>
    </>
  );
}
