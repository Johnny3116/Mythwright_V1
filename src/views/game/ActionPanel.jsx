import { useState } from 'react';
import { ActionButton } from '@components/ActionButton.jsx';
import { DiceRoller } from '@components/DiceRoller.jsx';
import { useDiceRoll } from '@hooks/useDiceRoll.js';
import { getAvailableTrapTypes } from '@engine/TrapSystem.js';
import styles from './game.module.css';

export function ActionPanel({ player, isMyTurn, blueprint, onAttack, onUseAbility, onSetTrap, onRetreat, onSearchFlora, onMove, onEndTurn }) {
  const { isRolling, lastRoll, roll } = useDiceRoll();
  const [showTrapMenu, setShowTrapMenu] = useState(false);

  if (!player) return null;

  const trapTypes = blueprint ? getAvailableTrapTypes(blueprint) : [];

  async function handleAttack() {
    const result = await roll();
    onAttack?.(result.raw);
  }

  async function handleTrap(trapTypeId) {
    setShowTrapMenu(false);
    const result = await roll();
    onSetTrap?.(trapTypeId, result.raw);
  }

  async function handleRetreat() {
    const result = await roll();
    onRetreat?.(result.raw);
  }

  async function handleSearchFlora() {
    const result = await roll();
    onSearchFlora?.(result.raw);
  }

  async function handleAbility() {
    const result = await roll();
    onUseAbility?.(result.raw);
  }

  return (
    <div className={styles.actionPanel}>
      {isMyTurn ? (
        <>
          <span className={styles.turnLabel}>Your Turn</span>
          <div className={styles.actionGroup}>
            <ActionButton variant="primary" onClick={handleAttack} disabled={isRolling} icon="⚔️">
              Attack
            </ActionButton>
            <ActionButton onClick={handleAbility} disabled={isRolling} icon="✨">
              Ability
            </ActionButton>
            <ActionButton onClick={handleSearchFlora} disabled={isRolling} icon="🌿">
              Search Flora
            </ActionButton>
            <ActionButton onClick={() => setShowTrapMenu(v => !v)} disabled={isRolling} icon="⚙️">
              Set Trap
            </ActionButton>
            <ActionButton onClick={handleRetreat} disabled={isRolling} icon="💨">
              Retreat
            </ActionButton>
            <ActionButton variant="success" onClick={onEndTurn} disabled={isRolling} icon="→">
              End Turn
            </ActionButton>
          </div>

          {showTrapMenu && trapTypes.length > 0 && (
            <div className={styles.trapMenu} style={{ position: 'absolute', bottom: '80px', left: '160px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)', padding: 'var(--space-3)', zIndex: 100 }}>
              {trapTypes.map(trap => (
                <ActionButton
                  key={trap.id}
                  onClick={() => handleTrap(trap.id)}
                  style={{ display: 'block', marginBottom: 'var(--space-1)' }}
                >
                  {trap.name} (Roll {trap.setupRoll}+)
                </ActionButton>
              ))}
            </div>
          )}
        </>
      ) : (
        <span className={styles.turnLabel} style={{ color: 'var(--text-muted)' }}>Waiting for your turn...</span>
      )}

      <div className={styles.diceArea}>
        <DiceRoller isRolling={isRolling} result={lastRoll} label="D20" />
      </div>
    </div>
  );
}
