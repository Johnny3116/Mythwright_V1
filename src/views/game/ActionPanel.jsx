import { useState, useEffect, useRef } from 'react';
import { ActionButton } from '@components/ActionButton.jsx';
import { DiceRoller } from '@components/DiceRoller.jsx';
import { useDiceRoll } from '@hooks/useDiceRoll.js';
import { getAvailableTrapTypes } from '@engine/TrapSystem.js';
import styles from './game.module.css';

/**
 * Context-aware action panel shown during a player's turn.
 *
 * Props:
 *   player         — current player state
 *   isMyTurn       — whether it's this player's turn
 *   blueprint      — campaign blueprint
 *   availableActions — result of getAvailableActions() from SpatialEngine
 *   onAttack(roll)
 *   onUseAbility(roll)
 *   onSetTrap(trapTypeId, roll)
 *   onRetreat(roll)          — legacy retreat (4 outcomes)
 *   onSearchFlora(roll)
 *   onMove(targetZoneId)
 *   onSearch(roll)           — zone search for boss/items
 *   onHeal(targetId, roll)
 *   onFlee(targetZoneId, roll)
 *   onEndTurn()
 */
export function ActionPanel({
  player,
  isMyTurn,
  blueprint,
  availableActions,
  onAttack,
  onUseAbility,
  onSetTrap,
  onRetreat,
  onSearchFlora,
  onMove,
  onSearch,
  onHeal,
  onFlee,
  onEndTurn,
}) {
  const { isRolling, lastRoll, roll } = useDiceRoll();
  const [openMenu, setOpenMenu] = useState(null); // 'trap' | 'move' | 'heal' | 'flee' | null
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    if (!openMenu) return;
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenu]);

  if (!player) return null;

  const trapTypes = blueprint ? getAvailableTrapTypes(blueprint) : [];
  const actions = availableActions || {};

  // ── Action handlers ──────────────────────────────────────────────────────

  async function handleAttack() {
    const result = await roll();
    onAttack?.(result.raw);
  }

  async function handleTrap(trapTypeId) {
    setOpenMenu(null);
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

  async function handleSearch() {
    const result = await roll();
    onSearch?.(result.raw);
  }

  async function handleMove(targetZoneId) {
    setOpenMenu(null);
    onMove?.(targetZoneId);
  }

  async function handleHeal(targetId) {
    setOpenMenu(null);
    const result = await roll();
    onHeal?.(targetId, result.raw);
  }

  async function handleFlee(targetZoneId) {
    setOpenMenu(null);
    const result = await roll();
    onFlee?.(targetZoneId, result.raw);
  }

  // ── Submenu: zone list (Move or Flee) ────────────────────────────────────
  function ZoneSubmenu({ adjacentZones, onSelect, label }) {
    if (!adjacentZones || adjacentZones.length === 0) return null;
    return (
      <div ref={menuRef} className={styles.actionSubmenu}>
        <div className={styles.submenuTitle}>{label}</div>
        {adjacentZones.map((zoneId) => {
          const zone = blueprint?.zones?.find((z) => z.id === zoneId);
          return (
            <ActionButton
              key={zoneId}
              onClick={() => onSelect(zoneId)}
              style={{ display: 'block', marginBottom: 'var(--space-1)', width: '100%' }}
            >
              {zone?.name || zoneId}
            </ActionButton>
          );
        })}
      </div>
    );
  }

  // ── Submenu: heal target ──────────────────────────────────────────────────
  function HealSubmenu() {
    return (
      <div ref={menuRef} className={styles.actionSubmenu}>
        <div className={styles.submenuTitle}>Heal who?</div>
        <ActionButton
          onClick={() => handleHeal(player.id)}
          style={{ display: 'block', marginBottom: 'var(--space-1)', width: '100%' }}
        >
          Myself
        </ActionButton>
        {(actions.heal?.allies || []).map((ally) => (
          <ActionButton
            key={ally.id}
            onClick={() => handleHeal(ally.id)}
            style={{ display: 'block', marginBottom: 'var(--space-1)', width: '100%' }}
          >
            {ally.name} ({ally.hp}/{ally.maxHp} HP)
          </ActionButton>
        ))}
      </div>
    );
  }

  return (
    <div className={styles.actionPanel}>
      {isMyTurn ? (
        <>
          <span className={styles.turnLabel}>Your Turn</span>

          <div className={styles.actionGroup}>
            {/* Move */}
            <div className={styles.actionWithSubmenu}>
              <ActionButton
                variant="primary"
                onClick={() => setOpenMenu(openMenu === 'move' ? null : 'move')}
                disabled={isRolling || !actions.move?.available}
                icon="🚶"
                title={actions.move?.reason || 'Move to adjacent zone'}
              >
                Move
              </ActionButton>
              {openMenu === 'move' && (
                <ZoneSubmenu
                  adjacentZones={actions.move?.adjacentZones || []}
                  onSelect={handleMove}
                  label="Move to:"
                />
              )}
            </div>

            {/* Attack */}
            <ActionButton
              variant={actions.attack?.hasVisibleTarget ? 'danger' : 'primary'}
              onClick={handleAttack}
              disabled={isRolling || !actions.attack?.available}
              icon="⚔️"
              title={actions.attack?.reason || (actions.attack?.hasVisibleTarget ? 'Attack target' : 'Attack (target not visible)')}
            >
              Attack
            </ActionButton>

            {/* Search */}
            <ActionButton
              onClick={handleSearch}
              disabled={isRolling}
              icon="🔍"
              title="Search zone for boss, items, or threats"
            >
              Search
            </ActionButton>

            {/* Heal */}
            <div className={styles.actionWithSubmenu}>
              <ActionButton
                onClick={() => {
                  if (actions.heal?.hasAllies) {
                    setOpenMenu(openMenu === 'heal' ? null : 'heal');
                  } else {
                    handleHeal(player.id);
                  }
                }}
                disabled={isRolling}
                icon="💊"
                title="Heal yourself or an ally in this zone"
              >
                Heal
              </ActionButton>
              {openMenu === 'heal' && <HealSubmenu />}
            </div>

            {/* Set Trap */}
            <div className={styles.actionWithSubmenu}>
              <ActionButton
                onClick={() => setOpenMenu(openMenu === 'trap' ? null : 'trap')}
                disabled={isRolling || !actions.setTrap?.available || trapTypes.length === 0}
                icon="⚙️"
                title={actions.setTrap?.reason || 'Place a trap in this zone'}
              >
                Set Trap
              </ActionButton>
              {openMenu === 'trap' && trapTypes.length > 0 && (
                <div ref={menuRef} className={styles.actionSubmenu}>
                  <div className={styles.submenuTitle}>Choose trap:</div>
                  {trapTypes.map((trap) => (
                    <ActionButton
                      key={trap.id}
                      onClick={() => handleTrap(trap.id)}
                      style={{ display: 'block', marginBottom: 'var(--space-1)', width: '100%' }}
                    >
                      {trap.name} (Roll {trap.setupRoll}+)
                    </ActionButton>
                  ))}
                </div>
              )}
            </div>

            {/* Search Flora */}
            <ActionButton
              onClick={handleSearchFlora}
              disabled={isRolling}
              icon="🌿"
              title="Search zone for healing plants"
            >
              Flora
            </ActionButton>

            {/* Ability */}
            <ActionButton
              onClick={handleAbility}
              disabled={isRolling}
              icon="✨"
              title="Use your class special ability"
            >
              Ability
            </ActionButton>

            {/* Flee */}
            <div className={styles.actionWithSubmenu}>
              <ActionButton
                variant="warning"
                onClick={() => setOpenMenu(openMenu === 'flee' ? null : 'flee')}
                disabled={isRolling || !actions.flee?.available}
                icon="💨"
                title={actions.flee?.reason || 'Emergency flee to adjacent zone (may trigger opportunity attack)'}
              >
                Flee
              </ActionButton>
              {openMenu === 'flee' && (
                <ZoneSubmenu
                  adjacentZones={actions.flee?.adjacentZones || []}
                  onSelect={handleFlee}
                  label="Flee to:"
                />
              )}
            </div>

            {/* End Turn */}
            <ActionButton
              variant="success"
              onClick={onEndTurn}
              disabled={isRolling}
              icon="→"
            >
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
