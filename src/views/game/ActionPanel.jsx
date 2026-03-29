import { useState, useEffect, useRef } from 'react';
import { ActionButton } from '@components/ActionButton.jsx';
import { DiceRoller } from '@components/DiceRoller.jsx';
import { useDiceRoll } from '@hooks/useDiceRoll.js';
import { getAvailableTrapTypes } from '@engine/TrapSystem.js';
import styles from './game.module.css';

/**
 * Context-aware action panel for player turns (Phase 10).
 *
 * Props:
 *   player        — current player state
 *   isMyTurn      — boolean
 *   blueprint     — campaign blueprint
 *   bossInZone    — bool: boss is in same zone (attack boss enabled)
 *   mobsInZone    — bool: alive mob is in same zone (attack mob enabled)
 *   alliesInZone  — array of player states in same zone (for heal target)
 *   adjacentZones — array of { id, name } (for move submenu)
 *   moveMode      — bool: map is in move-select mode
 *   onAttackBoss  — (roll) =>
 *   onAttackMob   — (roll) =>
 *   onUseAbility  — (roll) =>
 *   onSearch      — (roll) =>
 *   onSetTrap     — (trapTypeId, roll) =>
 *   onHeal        — (targetId, roll) =>
 *   onMove        — () => (toggle move mode)
 *   onFlee        — () => (no roll needed)
 *   onEndTurn     — () =>
 */
export function ActionPanel({
  player,
  isMyTurn,
  blueprint,
  bossInZone = false,
  mobsInZone = false,
  alliesInZone = [],
  adjacentZones = [],
  moveMode = false,
  onAttackBoss,
  onAttackMob,
  onUseAbility,
  onSearch,
  onSetTrap,
  onHeal,
  onMove,
  onFlee,
  onEndTurn,
}) {
  const { isRolling, lastRoll, roll } = useDiceRoll();
  const [showTrapMenu,  setShowTrapMenu]  = useState(false);
  const [showHealMenu,  setShowHealMenu]  = useState(false);
  const [showAttackMenu, setShowAttackMenu] = useState(false);
  const trapMenuRef   = useRef(null);
  const healMenuRef   = useRef(null);
  const attackMenuRef = useRef(null);

  // Close all submenus when clicking outside
  useEffect(() => {
    function handleOutside(e) {
      if (trapMenuRef.current   && !trapMenuRef.current.contains(e.target))   setShowTrapMenu(false);
      if (healMenuRef.current   && !healMenuRef.current.contains(e.target))   setShowHealMenu(false);
      if (attackMenuRef.current && !attackMenuRef.current.contains(e.target)) setShowAttackMenu(false);
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  if (!player) return null;

  const trapTypes   = blueprint ? getAvailableTrapTypes(blueprint) : [];
  const canAttackBoss = bossInZone;
  const canAttackMob  = mobsInZone;
  const canAttack     = canAttackBoss || canAttackMob;
  const canHeal       = alliesInZone.length > 0 || player.hp < player.maxHp;
  const canMove       = adjacentZones.length > 0;

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleAttackBoss() {
    setShowAttackMenu(false);
    const result = await roll();
    onAttackBoss?.(result.raw);
  }

  async function handleAttackMob() {
    setShowAttackMenu(false);
    const result = await roll();
    onAttackMob?.(result.raw);
  }

  function handleAttackClick() {
    if (canAttackBoss && canAttackMob) {
      setShowAttackMenu(v => !v);
    } else if (canAttackBoss) {
      handleAttackBoss();
    } else if (canAttackMob) {
      handleAttackMob();
    }
  }

  async function handleAbility() {
    const result = await roll();
    onUseAbility?.(result.raw);
  }

  async function handleSearch() {
    const result = await roll();
    onSearch?.(result.raw);
  }

  async function handleTrap(trapTypeId) {
    setShowTrapMenu(false);
    const result = await roll();
    onSetTrap?.(trapTypeId, result.raw);
  }

  async function handleHeal(targetId) {
    setShowHealMenu(false);
    const result = await roll();
    onHeal?.(targetId, result.raw);
  }

  function handleHealClick() {
    const healTargets = buildHealTargets();
    if (healTargets.length === 1) {
      handleHeal(healTargets[0].id);
    } else {
      setShowHealMenu(v => !v);
    }
  }

  function buildHealTargets() {
    const targets = [];
    if (player.hp < player.maxHp) {
      targets.push({ id: player.id, label: `${player.icon || player.classIcon || '🧑'} Self (${player.hp}/${player.maxHp})` });
    }
    for (const ally of alliesInZone) {
      if (ally.id !== player.id) {
        targets.push({ id: ally.id, label: `${ally.classIcon || '🧑'} ${ally.name} (${ally.hp}/${ally.maxHp})` });
      }
    }
    return targets;
  }

  return (
    <div className={styles.actionPanel}>
      {isMyTurn ? (
        <>
          <span className={[styles.turnLabel, styles.turnLabelActive].join(' ')}>Your Turn</span>

          <div className={styles.actionGroup}>
            {/* ── Movement ── */}
            <div style={{ position: 'relative' }}>
              <ActionButton
                onClick={onMove}
                disabled={isRolling || !canMove}
                icon="🚶"
                variant={moveMode ? 'primary' : undefined}
                title={canMove ? 'Select a zone to move to' : 'No adjacent zones'}
              >
                {moveMode ? 'Cancel Move' : 'Move'}
              </ActionButton>
            </div>

            {/* ── Attack ── */}
            <div style={{ position: 'relative' }} ref={attackMenuRef}>
              <ActionButton
                variant="primary"
                onClick={handleAttackClick}
                disabled={isRolling || !canAttack}
                icon="⚔️"
                title={!canAttack ? 'Nothing to attack in this zone' : canAttackBoss && canAttackMob ? 'Choose attack target' : ''}
              >
                Attack
              </ActionButton>
              {showAttackMenu && (
                <div className={styles.subMenu} style={{ bottom: '60px', left: 0 }}>
                  <ActionButton onClick={handleAttackBoss} disabled={isRolling} icon="🦎">
                    Attack Boss
                  </ActionButton>
                  <ActionButton onClick={handleAttackMob} disabled={isRolling} icon="🐾">
                    Fight Mob
                  </ActionButton>
                </div>
              )}
            </div>

            {/* ── Ability ── */}
            <ActionButton onClick={handleAbility} disabled={isRolling} icon="✨">
              Ability
            </ActionButton>

            {/* ── Search ── */}
            <ActionButton onClick={handleSearch} disabled={isRolling} icon="🔍" title="Search for boss location or items">
              Search
            </ActionButton>

            {/* ── Heal ── */}
            <div style={{ position: 'relative' }} ref={healMenuRef}>
              <ActionButton
                onClick={handleHealClick}
                disabled={isRolling || !canHeal}
                icon="💊"
                title={!canHeal ? 'No one to heal' : ''}
              >
                Heal
              </ActionButton>
              {showHealMenu && (
                <div className={styles.subMenu} style={{ bottom: '60px', left: 0 }}>
                  {buildHealTargets().map(t => (
                    <ActionButton key={t.id} onClick={() => handleHeal(t.id)} disabled={isRolling}>
                      {t.label}
                    </ActionButton>
                  ))}
                </div>
              )}
            </div>

            {/* ── Set Trap ── */}
            <div style={{ position: 'relative' }} ref={trapMenuRef}>
              <ActionButton onClick={() => setShowTrapMenu(v => !v)} disabled={isRolling} icon="⚙️">
                Set Trap
              </ActionButton>
              {showTrapMenu && trapTypes.length > 0 && (
                <div className={styles.subMenu} style={{ bottom: '60px', left: 0 }}>
                  {trapTypes.map(trap => (
                    <ActionButton key={trap.id} onClick={() => handleTrap(trap.id)} disabled={isRolling}>
                      {trap.name} (Roll {trap.setupRoll}+)
                    </ActionButton>
                  ))}
                </div>
              )}
            </div>

            {/* ── Flee ── */}
            <ActionButton
              onClick={onFlee}
              disabled={isRolling}
              icon="💨"
              title="Emergency retreat — instantly move to an adjacent zone"
            >
              Flee
            </ActionButton>

            {/* ── End Turn ── */}
            <ActionButton variant="success" onClick={onEndTurn} disabled={isRolling} icon="→">
              End Turn
            </ActionButton>
          </div>
        </>
      ) : (
        <span className={styles.turnLabel} style={{ color: 'var(--text-muted)' }}>
          Waiting for your turn...
        </span>
      )}

      <div className={styles.diceArea}>
        <DiceRoller isRolling={isRolling} result={lastRoll} label="D20" />
      </div>
    </div>
  );
}
