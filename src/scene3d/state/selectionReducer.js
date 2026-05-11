// Pure reducer for the M2 selection/targeting state.
// Lives outside React so it can be unit-tested without renderers.
//
// State machine:
//   IDLE          → click mini → MINI_SELECTED
//   MINI_SELECTED → click action → ACTION_PICKING (enemies become targetable)
//   ACTION_PICKING → click target → IDLE (fires pendingAttack)
//   any → ESC / empty-plane click → IDLE
//
// We don't fire side effects here; the consuming hook does that.

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
});

export const initialSelectionState = Object.freeze({
  phase: SELECTION_PHASE.IDLE,
  selectedMiniId: null,
  selectedAction: null,    // { id, label, range? } | null
  hoveredTargetId: null,
  pendingAttack: null,     // { attackerId, targetId, action } — consumed by M3 wiring
});

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
      // Stage the pending attack and reset back to IDLE. M3 will read pendingAttack
      // from a useEffect and fire it through the V1 engine reducer.
      return {
        ...initialSelectionState,
        pendingAttack: {
          attackerId: state.selectedMiniId,
          targetId: action.targetId,
          action: state.selectedAction,
        },
      };
    }

    case SELECTION_ACTIONS.CLEAR: {
      // Preserve pendingAttack across CLEAR so a consumer that hasn't drained it
      // yet doesn't lose the event. Use COMMIT_TARGET → drain → CLEAR semantics.
      return { ...initialSelectionState, pendingAttack: state.pendingAttack };
    }

    default:
      return state;
  }
}
