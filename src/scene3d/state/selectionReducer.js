// Pure reducer for the M2/M3 selection/targeting state.
// Lives outside React so it can be unit-tested without renderers.
//
// State machine:
//   IDLE          → click mini → MINI_SELECTED
//   MINI_SELECTED → click action with targetType=null → IDLE (fires pendingAction)
//   MINI_SELECTED → click action with target → ACTION_PICKING
//   ACTION_PICKING → click target → IDLE (fires pendingAction)
//   any → ESC / empty-plane click → IDLE
//
// We don't fire side effects here; the consuming hook does that.
//
// Backward compat (V2 M2): the legacy field `pendingAttack` is preserved as a
// read-only mirror of `pendingAction` so any code still reading the old shape
// keeps working until the M3 wiring is fully migrated.

export const SELECTION_PHASE = Object.freeze({
  IDLE: 'IDLE',
  MINI_SELECTED: 'MINI_SELECTED',
  ACTION_PICKING: 'ACTION_PICKING',
});

export const SELECTION_ACTIONS = Object.freeze({
  SELECT_MINI: 'SELECT_MINI',
  CLEAR: 'CLEAR',
  SET_ACTION: 'SET_ACTION',
  HOVER_TARGET: 'HOVER_TARGET',
  COMMIT_TARGET: 'COMMIT_TARGET',
  COMMIT_NO_TARGET: 'COMMIT_NO_TARGET',
  DRAIN_PENDING: 'DRAIN_PENDING',
});

export const initialSelectionState = Object.freeze({
  phase: SELECTION_PHASE.IDLE,
  selectedMiniId: null,
  selectedAction: null,    // descriptor from usePlayerActions, or null
  hoveredTargetId: null,
  pendingAction: null,     // { attackerId, targetId, action } — drained by dispatcher
  pendingAttack: null,     // legacy mirror of pendingAction (M2 compat)
});

function stagePending(attackerId, targetId, action) {
  const pending = { attackerId, targetId, action };
  return {
    ...initialSelectionState,
    pendingAction: pending,
    pendingAttack: pending,
  };
}

export function selectionReducer(state, action) {
  switch (action.type) {
    case SELECTION_ACTIONS.SELECT_MINI: {
      // Re-clicking the same mini in MINI_SELECTED is a no-op; in any other phase
      // we collapse back to a fresh selection (drops action + hover).
      if (
        state.phase === SELECTION_PHASE.MINI_SELECTED &&
        state.selectedMiniId === action.miniId
      ) {
        return state;
      }
      return {
        ...initialSelectionState,
        phase: SELECTION_PHASE.MINI_SELECTED,
        selectedMiniId: action.miniId,
      };
    }

    case SELECTION_ACTIONS.SET_ACTION: {
      // Only meaningful if a mini is selected.
      if (
        state.phase !== SELECTION_PHASE.MINI_SELECTED &&
        state.phase !== SELECTION_PHASE.ACTION_PICKING
      ) {
        return state;
      }
      // Setting null backs out of action picking.
      if (!action.action) {
        return {
          ...state,
          phase: SELECTION_PHASE.MINI_SELECTED,
          selectedAction: null,
          hoveredTargetId: null,
        };
      }
      return {
        ...state,
        phase: SELECTION_PHASE.ACTION_PICKING,
        selectedAction: action.action,
        hoveredTargetId: null,
      };
    }

    case SELECTION_ACTIONS.HOVER_TARGET: {
      // Hover only matters during target picking — silently ignored otherwise so
      // R3F pointer events outside the loop don't churn state.
      if (state.phase !== SELECTION_PHASE.ACTION_PICKING) {
        return state;
      }
      if (state.hoveredTargetId === action.targetId) {
        return state;
      }
      return { ...state, hoveredTargetId: action.targetId };
    }

    case SELECTION_ACTIONS.COMMIT_TARGET: {
      if (state.phase !== SELECTION_PHASE.ACTION_PICKING) {
        return state;
      }
      return stagePending(state.selectedMiniId, action.targetId, state.selectedAction);
    }

    // V2 M3: action with no target (Search, End Turn, etc.) commits straight
    // from MINI_SELECTED without going through ACTION_PICKING.
    case SELECTION_ACTIONS.COMMIT_NO_TARGET: {
      if (state.phase !== SELECTION_PHASE.MINI_SELECTED && state.phase !== SELECTION_PHASE.ACTION_PICKING) {
        return state;
      }
      return stagePending(state.selectedMiniId, null, action.action);
    }

    case SELECTION_ACTIONS.DRAIN_PENDING: {
      // Dispatcher acknowledges it consumed pendingAction.
      return { ...state, pendingAction: null, pendingAttack: null };
    }

    case SELECTION_ACTIONS.CLEAR: {
      // Preserve pendingAction across CLEAR so a consumer that hasn't drained it
      // yet doesn't lose the event. Use COMMIT → drain → CLEAR semantics.
      return {
        ...initialSelectionState,
        pendingAction: state.pendingAction,
        pendingAttack: state.pendingAttack,
      };
    }

    default:
      return state;
  }
}
