import styles from './components.module.css';

export function TurnOrderBar({ players = [], boss = null, activeEntityId = null }) {
  const bossEntity = boss ? {
    id: 'boss',
    name: boss.name || 'Boss',
    icon: '🦎',
    hp: boss.hp,
    maxHp: boss.maxHp,
    alive: boss.alive !== false && boss.hp > 0,
    isBoss: true,
  } : null;

  const entities = [
    ...(bossEntity ? [bossEntity] : []),
    ...Object.values(players).map(p => ({
      id: p.id,
      name: p.name,
      icon: p.classIcon || '🧑',
      hp: p.hp,
      maxHp: p.maxHp,
      alive: p.alive !== false,
      isBoss: false,
    })),
  ];

  return (
    <div className={styles.turnOrderBar}>
      {entities.map(entity => (
        <div
          key={entity.id}
          className={[
            styles.turnToken,
            entity.id === activeEntityId ? styles.turnTokenActive : '',
            entity.isBoss ? styles.turnTokenBoss : '',
            !entity.alive ? styles.turnTokenDead : '',
          ].filter(Boolean).join(' ')}
        >
          <span className={styles.turnTokenIcon}>{entity.icon}</span>
          <span className={styles.turnTokenName} title={entity.name}>{entity.name}</span>
          <span className={styles.turnTokenHp}>{entity.hp}/{entity.maxHp}</span>
        </div>
      ))}
    </div>
  );
}
