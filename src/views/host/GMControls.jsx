import { useState } from 'react';
import { ActionButton } from '@components/ActionButton.jsx';
import { DiceRoller } from '@components/DiceRoller.jsx';
import { useDiceRoll } from '@hooks/useDiceRoll.js';
import styles from './host.module.css';

export function GMControls({
  isBossTurn,
  isEnvironmentPhase,
  gmMode,
  players,
  onBossAttack,
  onBossAoe,
  onBossBurrow,
  onBossGrab,
  onEndBossTurn,
  onRunEnvironment,
  onAdvancePhase,
  onSaveGame,
}) {
  const { isRolling, lastRoll, roll } = useDiceRoll();
  const [selectedTargetId, setSelectedTargetId] = useState(null);

  const alivePlayers = Object.values(players || {}).filter(p => p.alive);

  async function handleBossAttack() {
    const result = await roll();
    const targetId = selectedTargetId || alivePlayers[0]?.id;
    if (targetId) onBossAttack?.(targetId, result.raw);
  }

  async function handleBossAoe() {
    const result = await roll();
    onBossAoe?.(result.raw);
  }

  return (
    <div className={styles.gmControls}>
      <span className={styles.gmLabel}>GM</span>

      {isBossTurn && gmMode === 'human' && (
        <>
          <select
            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: 'var(--space-2)', borderRadius: 'var(--border-radius-sm)', fontSize: 'var(--text-sm)' }}
            value={selectedTargetId || ''}
            onChange={(e) => setSelectedTargetId(e.target.value)}
          >
            <option value="">Select Target</option>
            {alivePlayers.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({p.hp} HP)</option>
            ))}
          </select>
          <ActionButton variant="danger" onClick={handleBossAttack} disabled={isRolling} icon="⚔️">
            Attack
          </ActionButton>
          <ActionButton onClick={handleBossAoe} disabled={isRolling} icon="💥">
            AOE
          </ActionButton>
          <ActionButton onClick={onBossBurrow} icon="🕳️">Burrow</ActionButton>
          <ActionButton variant="success" onClick={onEndBossTurn} icon="→">
            End Boss Turn
          </ActionButton>
        </>
      )}

      {isBossTurn && gmMode === 'scripted' && (
        <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
          Auto-resolving boss turn...
        </span>
      )}

      {isEnvironmentPhase && (
        <ActionButton variant="primary" onClick={onRunEnvironment} icon="🌿">
          Resolve Environment
        </ActionButton>
      )}

      {!isBossTurn && !isEnvironmentPhase && (
        <ActionButton onClick={onAdvancePhase} icon="→">
          Advance Phase
        </ActionButton>
      )}

      <div style={{ marginLeft: 'auto', display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
        <ActionButton onClick={onSaveGame} icon="💾">Save</ActionButton>
        <DiceRoller isRolling={isRolling} result={lastRoll} label="D20" />
      </div>
    </div>
  );
}
