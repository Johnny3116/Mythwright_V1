import styles from './components.module.css';

/**
 * TurnOrderBar — Horizontal bar showing entity portraits in turn order.
 *
 * @param {object} props
 * @param {Array<{id:string, name:string, icon:string, isActive:boolean, isDead:boolean, isPlayer:boolean}>} props.entities
 * @param {number} [props.round] - Current round number
 */
export function TurnOrderBar({ entities = [], round }) {
  return (
    <div className={styles.turnOrderBar} role="list" aria-label="Turn order">
      {round !== undefined && (
        <div className={styles.turnOrderRound}>
          Round <span className={styles.turnOrderRoundNum}>{round}</span>
        </div>
      )}
      <div className={styles.turnOrderEntities}>
        {entities.map((entity) => (
          <div
            key={entity.id}
            className={`
              ${styles.turnOrderEntity}
              ${entity.isActive ? styles.turnOrderEntityActive : ''}
              ${entity.isDead ? styles.turnOrderEntityDead : ''}
              ${entity.isPlayer ? styles.turnOrderEntityPlayer : styles.turnOrderEntityBoss}
            `}
            role="listitem"
            aria-label={`${entity.name}${entity.isActive ? ' (active)' : ''}${entity.isDead ? ' (dead)' : ''}`}
            title={entity.name}
          >
            <span className={styles.turnOrderIcon} aria-hidden="true">
              {entity.icon}
            </span>
            <span className={styles.turnOrderName}>{entity.name}</span>
            {entity.isDead && (
              <span className={styles.turnOrderDead} aria-hidden="true">✕</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
