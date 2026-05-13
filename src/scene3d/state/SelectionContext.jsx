import { createContext, useContext, useReducer, useMemo, useCallback } from 'react';
import {
  selectionReducer,
  initialSelectionState,
  SELECTION_ACTIONS,
} from './selectionReducer.js';

// Context-provider wrapper around the selection reducer. Components inside
// MythwrightCanvas read selection state via useSelection() and dispatch via
// useSelectionActions(). Two contexts so consumers that only dispatch don't
// re-render on state changes.
//
// IMPORTANT — Canvas context bridging:
// @react-three/fiber v8 uses a separate reconciler inside <Canvas>, and React
// context does NOT automatically cross that boundary. To make selection state
// reachable both inside the 3D tree and outside it (for DOM-side UI), use
// <SelectionBridge> as the immediate child of <Canvas>. SelectionBridge reads
// the outer provider value and re-publishes it on the inner tree.

const SelectionStateContext = createContext(initialSelectionState);
const SelectionDispatchContext = createContext(null);

export function SelectionProvider({ children, initialState = initialSelectionState }) {
  const [state, dispatch] = useReducer(selectionReducer, initialState);

  const actions = useMemo(() => ({
    selectMini:     (miniId)   => dispatch({ type: SELECTION_ACTIONS.SELECT_MINI, miniId }),
    setAction:      (action)   => dispatch({ type: SELECTION_ACTIONS.SET_ACTION, action }),
    hoverTarget:    (targetId) => dispatch({ type: SELECTION_ACTIONS.HOVER_TARGET, targetId }),
    commitTarget:   (targetId) => dispatch({ type: SELECTION_ACTIONS.COMMIT_TARGET, targetId }),
    commitNoTarget: (action)   => dispatch({ type: SELECTION_ACTIONS.COMMIT_NO_TARGET, action }),
    drainPending:   ()         => dispatch({ type: SELECTION_ACTIONS.DRAIN_PENDING }),
    clear:          ()         => dispatch({ type: SELECTION_ACTIONS.CLEAR }),
  }), []);

  return (
    <SelectionStateContext.Provider value={state}>
      <SelectionDispatchContext.Provider value={actions}>
        {children}
      </SelectionDispatchContext.Provider>
    </SelectionStateContext.Provider>
  );
}

// Hook — reads the outer SelectionProvider values from the *outside* React
// tree. Call this immediately above <Canvas> and pass the result into
// <SelectionBridge> as props so the inner reconciler re-publishes them.
export function useSelectionBridgeValue() {
  const state = useContext(SelectionStateContext);
  const actions = useContext(SelectionDispatchContext);
  return { state, actions };
}

// Place as the immediate child of <Canvas>. Re-publishes context values that
// were captured outside the canvas via useSelectionBridgeValue(). Without
// this, anything inside <Canvas> that calls useSelection / useSelectionActions
// sees the default context values, not your provider's state.
//
// Usage:
//   function App() {
//     const bridge = useSelectionBridgeValue();
//     return (
//       <Canvas>
//         <SelectionBridge value={bridge}>
//           <TabletopScene ... />
//           <ActionOverlay ... />
//         </SelectionBridge>
//       </Canvas>
//     );
//   }
//
// (App must itself be inside <SelectionProvider>.)
export function SelectionBridge({ value, children }) {
  return (
    <SelectionStateContext.Provider value={value.state}>
      <SelectionDispatchContext.Provider value={value.actions}>
        {children}
      </SelectionDispatchContext.Provider>
    </SelectionStateContext.Provider>
  );
}

export function useSelection() {
  return useContext(SelectionStateContext);
}

export function useSelectionActions() {
  const ctx = useContext(SelectionDispatchContext);
  if (!ctx) {
    throw new Error('useSelectionActions must be used inside <SelectionProvider>');
  }
  return ctx;
}

// Convenience selectors — kept as hooks so consumers don't need to memo themselves.
export function useIsSelected(miniId) {
  const { selectedMiniId } = useSelection();
  return selectedMiniId === miniId;
}

export function useIsTargetable(team) {
  const { phase, selectedAction } = useSelection();
  if (phase !== 'ACTION_PICKING' || !selectedAction) return false;
  // V2 M3: targetability depends on the action's targetType.
  switch (selectedAction.targetType) {
    case 'enemy':  return team === 'enemy';
    case 'ally':   return team === 'player';
    case 'anchor': return team === 'anchor';
    default:       return false;
  }
}

export function useIsHovered(miniId) {
  const { hoveredTargetId } = useSelection();
  return hoveredTargetId === miniId;
}

// Drain helper — consumer reads pendingAttack, runs side effect, then clears.
// V2 M3: prefer `usePendingAction` + `drainPending` from the dispatcher hook.
export function usePendingAttackDrain() {
  const { pendingAttack } = useSelection();
  const { clear } = useSelectionActions();
  return useCallback(() => {
    if (pendingAttack) clear();
    return pendingAttack;
  }, [pendingAttack, clear]);
}

// V2 M3: subscribe to the generalized pending-action slot for the dispatcher.
export function usePendingAction() {
  const { pendingAction } = useSelection();
  return pendingAction;
}

// Re-export phase enum for the convenience selectors (string compares above are
// kept inline for perf, but consumers should import this from the barrel).
export { SELECTION_PHASE } from './selectionReducer.js';
