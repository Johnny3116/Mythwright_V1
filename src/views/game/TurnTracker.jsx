import { TurnOrderBar } from '@components/TurnOrderBar.jsx';
import styles from './game.module.css';

export function TurnTracker({ players, boss, activeEntityId, round, phase }) {
  // Build the entities array TurnOrderBar expects from the players object + boss
  const playerEntities = Object.values(players || {}).map((p) => ({
    id: p.id,
    name: p.name || p.id,
    icon: p.classIcon || '⚔️',
    hp: p.hp,
    maxHp: p.maxHp,
    isDead: !p.alive,
    isBoss: false,
  }));

  const bossEntity = boss
    ? [{
        id: boss.id,
        name: boss.name,
        icon: '🐉',
        hp: boss.hp,
        maxHp: boss.maxHp,
        isDead: !boss.alive || boss.hp <= 0,
        isBoss: true,
      }]
    : [];

  const entities = [...playerEntities, ...bossEntity];

  return (
    <div className={styles.turnTracker}>
      <TurnOrderBar entities={entities} activeEntityId={activeEntityId} round={round} />
    </div>
  );
}
