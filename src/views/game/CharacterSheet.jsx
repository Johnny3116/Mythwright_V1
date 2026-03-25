import { useMemo } from 'react';
import { HealthBar } from '@components/HealthBar';
import { StatCard } from '@components/StatCard';
import styles from './game.module.css';

// ── Effect type helpers ────────────────────────────────────────────────────

const EFFECT_CATEGORY = {
  heal:            'buff',
  damageMultiplier:'buff',
  shield:          'buff',
  damageReduction: 'buff',
  immobilize:      'debuff',
  poison:          'debuff',
  bleed:           'debuff',
  slow:            'debuff',
};

function effectCategory(type) {
  return EFFECT_CATEGORY[type] ?? 'neutral';
}

/**
 * CharacterSheet — Left sidebar showing the local player's stats.
 *
 * Props:
 *   player    {object} PlayerState from gameState.players.
 *   blueprint {object} Campaign blueprint (for class details).
 */
export function CharacterSheet({ player, blueprint }) {
  // Look up class data from blueprint.
  const classData = useMemo(() => {
    if (!player?.classId || !blueprint?.classes) return null;
    return blueprint.classes.find((c) => c.id === player.classId) ?? null;
  }, [player?.classId, blueprint]);

  // Derive zone name from blueprint zones.
  const zoneName = useMemo(() => {
    if (!player?.zoneId || !blueprint?.zones) return player?.zoneId ?? 'Unknown';
    const zone = blueprint.zones.find((z) => z.id === player.zoneId);
    return zone?.name ?? player.zoneId;
  }, [player?.zoneId, blueprint]);

  // Empty state.
  if (!player) {
    return (
      <div className={styles.charSheetPanel}>
        <div className={styles.charEmpty}>
          <span className={styles.charEmptyIcon}>👤</span>
          <span>No character selected</span>
        </div>
      </div>
    );
  }

  const {
    name      = 'Hunter',
    hp        = 0,
    maxHp     = 1,
    damage    = [0, 0],
    defense   = 0,
    effects   = [],
  } = player;

  const dmgMin  = Array.isArray(damage) ? damage[0] : damage;
  const dmgMax  = Array.isArray(damage) ? damage[1] : damage;
  const dmgLabel = dmgMin === dmgMax ? String(dmgMin) : `${dmgMin}–${dmgMax}`;

  const specialAbility = classData?.specialAbility ?? null;

  // Mock inventory slots — replace with real inventory once wired.
  const inventorySlots = Array.from({ length: 8 }, (_, i) => {
    if (player.inventory?.[i]) return player.inventory[i];
    return null;
  });

  return (
    <div className={styles.charSheetPanel}>
      {/* ── Header ── */}
      <div className={styles.charSheetHeader}>
        <div
          className={styles.charAvatar}
          aria-hidden="true"
          style={{
            borderColor: player.color ?? 'var(--border-color)',
            backgroundColor: player.color ? `${player.color}18` : undefined,
          }}
        >
          {classData?.icon ?? '👤'}
        </div>
        <div className={styles.charHeaderInfo}>
          <h2 className={styles.charName}>{name}</h2>
          <span className={styles.charClassBadge}>
            {classData?.name ?? 'Hunter'}
          </span>
        </div>
      </div>

      <div className={styles.charSheetBody}>
        {/* ── HP ── */}
        <div className={styles.charSection}>
          <p className={styles.charSectionTitle}>Health</p>
          <HealthBar current={hp} max={maxHp} label="HP" size="md" />
        </div>

        {/* ── Stats ── */}
        <div className={styles.charSection}>
          <p className={styles.charSectionTitle}>Stats</p>
          <div className={styles.statsGrid}>
            <StatCard label="DMG"  value={dmgLabel} icon="⚔️" size="sm" />
            <StatCard label="DEF"  value={defense}  icon="🛡️" size="sm" />
          </div>
        </div>

        {/* ── Special ability ── */}
        {specialAbility && (
          <div className={styles.charSection}>
            <p className={styles.charSectionTitle}>Special Ability</p>
            <div className={styles.abilityBlock}>
              <p className={styles.abilityBlockName}>{specialAbility.name}</p>
              <p className={styles.abilityBlockDesc}>{specialAbility.description}</p>
              {player.abilityCooldown > 0 && (
                <span className={styles.abilityCooldown}>
                  Cooldown: {player.abilityCooldown} turn{player.abilityCooldown !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        )}

        {/* ── Active effects ── */}
        <div className={styles.charSection}>
          <p className={styles.charSectionTitle}>Status Effects</p>
          {effects.length > 0 ? (
            <div className={styles.effectsList}>
              {effects.map((eff, idx) => {
                const cat = effectCategory(eff.type);
                return (
                  <span
                    key={eff.id ?? idx}
                    className={`${styles.effectBadge} ${styles[cat]}`}
                    title={eff.type}
                  >
                    {eff.type}
                    {eff.duration != null && (
                      <span className={styles.effectDuration}>×{eff.duration}</span>
                    )}
                  </span>
                );
              })}
            </div>
          ) : (
            <span className={styles.noEffects}>No active effects</span>
          )}
        </div>

        {/* ── Inventory ── */}
        <div className={styles.charSection}>
          <p className={styles.charSectionTitle}>Inventory</p>
          <div className={styles.inventoryGrid}>
            {inventorySlots.map((item, idx) => (
              <div
                key={idx}
                className={[
                  styles.inventorySlot,
                  !item ? styles.empty : null,
                ]
                  .filter(Boolean)
                  .join(' ')}
                title={item?.name ?? 'Empty slot'}
                role={item ? 'button' : undefined}
                tabIndex={item ? 0 : -1}
                aria-label={item ? `Inventory: ${item.name}` : 'Empty inventory slot'}
              >
                {item?.icon ?? ''}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Zone strip ── */}
      <div className={styles.zoneStrip}>
        <span className={styles.zoneStripLabel}>Location:</span>
        <span className={styles.zoneStripName}>{zoneName}</span>
      </div>
    </div>
  );
}
