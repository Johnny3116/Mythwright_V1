// V2 M3: dispatcher hook — bridges the M2/M3 selection state to the V1 engine.
//
// Reads the staged `pendingAction` from SelectionContext, builds the right
// engine ActionType payload (including a fresh D20 roll when the action
// requires one), dispatches it through GameContext, then drains the slot.
//
// Mount this once inside <SelectionProvider> + <GameProvider>. The hook
// has no return value; it operates as an effect.

import { useEffect } from 'react';
import { useGameContext } from '@context/GameContext.jsx';
import {
  usePendingAction,
  useSelectionActions,
} from '@scene3d/state/SelectionContext.jsx';
import { rollD20 } from '@engine/DiceSystem.js';
import { ActionTypes } from '@utils/constants.js';

/**
 * Translate a selection-layer pendingAction into a V1 engine action.
 * Pure function — no React, easy to unit test.
 *
 * @param {object} pending  { attackerId, targetId, action }
 * @param {object} options  { rollOverride? } — for tests
 * @returns {object|null}   { type, payload } or null if unmappable
 */
export function buildEngineAction(pending, { rollOverride } = {}) {
  if (!pending || !pending.action) return null;
  const { attackerId: playerId, targetId, action } = pending;
  const roll = action.requiresRoll
    ? (rollOverride ?? rollD20())
    : null;

  switch (action.kind) {
    case 'attack':
      // targetId may be "mob:<zoneId>" or "boss"/null (boss = engine default)
      return {
        type: ActionTypes.PLAYER_ATTACK,
        payload: { playerId, roll, targetId: targetId ?? null },
      };

    case 'ability':
      return {
        type: ActionTypes.PLAYER_USE_ABILITY,
        payload: { playerId, targetId: targetId ?? null, roll },
      };

    case 'heal':
      return {
        type: ActionTypes.PLAYER_HEAL,
        payload: { healerId: playerId, targetId, roll },
      };

    case 'setTrap':
      return {
        type: ActionTypes.PLAYER_SET_TRAP,
        payload: {
          playerId,
          // M3 ships with a default trap type; UI sub-picker is M5+ work.
          trapTypeId: action.payload?.trapTypeId ?? 'spiked-pit',
          roll,
        },
      };

    case 'move':
      // 3D axis movement — anchorId comes through as targetId from the picker.
      return {
        type: ActionTypes.PLAYER_SET_ANCHOR,
        payload: { playerId, anchorId: targetId },
      };

    case 'search':
      return { type: ActionTypes.PLAYER_SEARCH, payload: { playerId, roll } };

    case 'searchFlora':
      return { type: ActionTypes.PLAYER_SEARCH_FLORA, payload: { playerId, roll } };

    case 'retreat':
      return { type: ActionTypes.PLAYER_RETREAT, payload: { playerId, roll } };

    case 'flee':
      return {
        type: ActionTypes.PLAYER_FLEE,
        payload: { playerId, targetZoneId: targetId, roll },
      };

    case 'endTurn':
      return { type: ActionTypes.ADVANCE_PHASE, payload: {} };

    default:
      return null;
  }
}

/**
 * Hook: drain pendingAction → engine. Mount once near the top of the 3D view.
 */
export function useActionDispatcher() {
  const { dispatch } = useGameContext();
  const pending = usePendingAction();
  const { drainPending } = useSelectionActions();

  useEffect(() => {
    if (!pending) return;
    const engineAction = buildEngineAction(pending);
    if (engineAction) {
      dispatch(engineAction);
    }
    // Drain regardless — an unmappable action shouldn't stay pinned forever.
    drainPending();
  }, [pending, dispatch, drainPending]);
}
