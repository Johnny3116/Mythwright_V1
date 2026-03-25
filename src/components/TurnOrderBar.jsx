import styles from './components.module.css';

/**
 * TurnOrderBar — Horizontal scrollable bar showing combat initiative order.
 *
 * Props:
 *   entities       {Array}  Array of { id, name, icon, hp, maxHp, isDead, isBoss }.
 *   activeEntityId {string} ID of the entity whose turn it currently is.
 *   round          {number} Current round number. Defaults 1.
 */
export function TurnOrderBar({ entities = [], activeEntityId, round = 1 }) {
  return (
    <div className={styles.turnOrderBar} role="list" aria-label="Turn order">
      <div className={styles.turnOrderScroll}>
        {entities.map((entity) => {
          const isActive = entity.id === activeEntityId;
          const isDead = Boolean(entity.isDead);
          const isBoss = Boolean(entity.isBoss);

          const entityClass = [
            styles.turnOrderEntity,
            isActive ? styles['turnOrderEntity--active'] : null,
            isDead   ? styles['turnOrderEntity--dead']   : null,
            isBoss   ? styles['turnOrderEntity--boss']   : null,
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <div
              key={entity.id}
              className={entityClass}
              role="listitem"
              aria-label={`${entity.name}${isActive ? ' — active turn' : ''}${isDead ? ' — dead' : ''}`}
            >
              <div className={styles.turnOrderPortrait}>
                <span aria-hidden="true">{entity.icon ?? '?'}</span>
                {isDead && (
                  <div className={styles.turnOrderDeadOverlay} aria-hidden="true">✕</div>
                )}
              </div>
              <span className={styles.turnOrderName} title={entity.name}>
                {entity.name}
              </span>
            </div>
          );
        })}
      </div>

      <div className={styles.turnOrderRound} aria-label={`Round ${round}`}>
        <span className={styles.turnOrderRoundLabel}>Round</span>
        <span className={styles.turnOrderRoundNumber}>{round}</span>
      </div>
    </div>
  );
}
