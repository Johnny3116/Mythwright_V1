import { useMemo } from 'react';
import styles from './game.module.css';

/**
 * TurnTracker — Horizontal bar at the top of the game view showing turn order.
 *
 * Props:
 *   turnOrder      {string[]} Ordered array of entity ids.
 *   players        {object}   gameState.players keyed by id.
 *   boss           {object}   gameState.boss (or null).
 *   activeEntityId {string}   Id of the entity whose turn it is.
 *   round          {number}   Current round number.
 *   timerEnabled   {boolean}  Whether the turn timer is active.
 *   timerSeconds   {number}   Total timer duration in seconds.
 *   timerRemaining {number}   Seconds remaining on the current timer.
 *   blueprint      {object}   Campaign blueprint (used for class icons).
 */
export function TurnTracker({
  turnOrder = [],
  players = {},
  boss = null,
  activeEntityId,
  round = 1,
  timerEnabled = false,
  timerSeconds = 60,
  timerRemaining = 60,
  blueprint,
}) {
  // Build a lookup from classId → icon.
  const classIconMap = useMemo(() => {
    const map = {};
    (blueprint?.classes ?? []).forEach((cls) => {
      map[cls.id] = cls.icon;
    });
    return map;
  }, [blueprint]);

  // Derive display entities from turnOrder.
  const entities = useMemo(() => {
    return turnOrder.map((id) => {
      if (id === 'boss') {
        return {
          id: 'boss',
          name: blueprint?.enemies?.boss?.name ?? 'Boss',
          icon: '💀',
          isDead: boss ? boss.hp <= 0 : false,
          isBoss: true,
        };
      }

      const p = players[id];
      if (!p) return { id, name: id, icon: '?', isDead: false, isBoss: false };

      return {
        id,
        name: p.name ?? id,
        icon: classIconMap[p.classId] ?? '👤',
        isDead: Boolean(p.isDead),
        isBoss: false,
      };
    });
  }, [turnOrder, players, boss, classIconMap, blueprint]);

  // Timer percentage.
  const timerPct = timerSeconds > 0 ? (timerRemaining / timerSeconds) * 100 : 100;
  const timerUrgent = timerPct <= 25;

  // Current phase label.
  const currentEntity = entities.find((e) => e.id === activeEntityId);
  const phaseLabel = currentEntity
    ? currentEntity.isBoss
      ? 'Boss Turn'
      : `${currentEntity.name}'s Turn`
    : 'Waiting…';
  const phaseClass = currentEntity?.isBoss ? styles.bossTurn : styles.playerTurn;

  return (
    <div className={styles.turnTracker} role="region" aria-label="Turn order">
      {/* ── Entity portraits ── */}
      <div className={styles.turnTrackerEntities}>
        {entities.map((entity) => {
          const isActive = entity.id === activeEntityId;
          const entityClass = [
            styles.turnEntity,
            isActive      ? styles.active : null,
            entity.isDead ? styles.dead   : null,
            entity.isBoss ? styles.boss   : null,
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <div
              key={entity.id}
              className={entityClass}
              aria-label={`${entity.name}${isActive ? ' — current turn' : ''}${entity.isDead ? ' — defeated' : ''}`}
            >
              <div className={styles.turnEntityPortrait} aria-hidden="true">
                <span>{entity.icon}</span>
                {entity.isDead && (
                  <div className={styles.turnEntityDeadX} aria-hidden="true">✕</div>
                )}
              </div>
              <span className={styles.turnEntityName}>{entity.name}</span>
            </div>
          );
        })}
      </div>

      <div className={styles.turnTrackerDivider} aria-hidden="true" />

      {/* ── Round + phase meta ── */}
      <div className={styles.turnTrackerMeta}>
        <div className={styles.roundBadge} aria-label={`Round ${round}`}>
          <span className={styles.roundLabel}>Round</span>
          <span className={styles.roundNumber}>{round}</span>
          <span className={styles.roundLabel}>of ∞</span>
        </div>
        <span className={`${styles.phaseBadge} ${phaseClass}`} aria-live="polite">
          {phaseLabel}
        </span>
      </div>

      {/* ── Timer bar (absolute-positioned at bottom of turn bar) ── */}
      {timerEnabled && (
        <div className={styles.timerBarTrack} aria-hidden="true">
          <div
            className={[styles.timerBarFill, timerUrgent ? styles.urgent : null]
              .filter(Boolean)
              .join(' ')}
            style={{ width: `${timerPct}%` }}
          />
        </div>
      )}
    </div>
  );
}
