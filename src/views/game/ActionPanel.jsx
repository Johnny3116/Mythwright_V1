import { ActionButton } from '@components/ActionButton';
import { DiceRoller } from '@components/DiceRoller';
import { PLAYER_ACTIONS } from '@utils/constants';
import styles from './game.module.css';

// ── Action metadata map ────────────────────────────────────────────────────

const ACTION_META = {
  [PLAYER_ACTIONS.ATTACK]:       { icon: '⚔️',  label: 'Attack'       },
  [PLAYER_ACTIONS.USE_ABILITY]:  { icon: '⚡',  label: 'Use Ability'  },
  [PLAYER_ACTIONS.SET_TRAP]:     { icon: '🪤',  label: 'Set Trap'     },
  [PLAYER_ACTIONS.USE_ITEM]:     { icon: '🎒',  label: 'Use Item'     },
  [PLAYER_ACTIONS.MOVE]:         { icon: '👟',  label: 'Move'         },
  [PLAYER_ACTIONS.RETREAT]:      { icon: '🏃',  label: 'Retreat'      },
  [PLAYER_ACTIONS.SEARCH_FLORA]: { icon: '🌿',  label: 'Search Flora' },
  [PLAYER_ACTIONS.END_TURN]:     { icon: '⏰',  label: 'End Turn'     },
};

// Ordered list of actions as they should appear in the panel.
const ACTION_ORDER = [
  PLAYER_ACTIONS.ATTACK,
  PLAYER_ACTIONS.USE_ABILITY,
  PLAYER_ACTIONS.SET_TRAP,
  PLAYER_ACTIONS.USE_ITEM,
  PLAYER_ACTIONS.MOVE,
  PLAYER_ACTIONS.RETREAT,
  PLAYER_ACTIONS.SEARCH_FLORA,
  PLAYER_ACTIONS.END_TURN,
];

/**
 * ActionPanel — Bottom bar with action buttons and the dice roller.
 *
 * Props:
 *   availableActions {string[]} Array of PLAYER_ACTIONS keys available this turn.
 *   onAction         {Function} Called with (actionType) when a button is clicked.
 *   isMyTurn         {boolean}  Whether it is the local player's turn.
 *   blueprint        {object}   Campaign blueprint (for future context).
 */
export function ActionPanel({ availableActions = [], onAction, isMyTurn = false, blueprint }) {
  function handleRollComplete(result) {
    // Dice roll completed — in a real integration this would trigger
    // the pending action resolution. For now just log for wiring later.
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug('[ActionPanel] Dice rolled:', result);
    }
  }

  return (
    <div className={styles.actionPanel}>
      <div className={styles.actionPanelLeft}>
        <span className={styles.actionPanelLabel}>
          {isMyTurn ? 'Your Turn — Choose an Action' : 'Actions'}
        </span>

        <div className={styles.actionGrid} role="group" aria-label="Available actions">
          {ACTION_ORDER.map((actionType) => {
            const meta      = ACTION_META[actionType];
            if (!meta) return null;
            const isAvailable = availableActions.includes(actionType);
            const isDisabled  = !isMyTurn || !isAvailable;

            return (
              <ActionButton
                key={actionType}
                label={meta.label}
                icon={meta.icon}
                onClick={() => onAction?.(actionType)}
                disabled={isDisabled}
                variant={actionType === PLAYER_ACTIONS.ATTACK && isAvailable && isMyTurn
                  ? 'primary'
                  : actionType === PLAYER_ACTIONS.END_TURN && isMyTurn
                    ? 'ghost'
                    : 'default'}
                title={
                  !isMyTurn
                    ? 'Not your turn'
                    : !isAvailable
                      ? 'Not available'
                      : meta.label
                }
              />
            );
          })}
        </div>

        {/* "Not your turn" hint */}
        {!isMyTurn && (
          <div className={styles.notYourTurnOverlay} aria-live="polite">
            <span aria-hidden="true">⏳</span>
            Waiting for your turn…
          </div>
        )}
      </div>

      {/* ── Dice roller ── */}
      <div className={styles.actionPanelRight}>
        <DiceRoller
          onRollComplete={handleRollComplete}
          modifier={0}
          disabled={!isMyTurn}
        />
      </div>
    </div>
  );
}
