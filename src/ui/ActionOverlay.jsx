import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import {
  useSelection,
  useSelectionActions,
  SELECTION_PHASE,
} from '../scene3d/state/SelectionContext.jsx';
import { usePlayerActions } from '@hooks/usePlayerActions.js';

// V2 M3: 2D HTML action panel anchored above the selected miniature.
// Action set is data-driven by the player's class via usePlayerActions.
// - Actions with targetType: 'enemy'|'ally'|'anchor'  → enter ACTION_PICKING
// - Actions with targetType: null                     → commit immediately
//
// Lives in src/ui/ per the V2 plan.
export default function ActionOverlay({ miniatures = [] }) {
  const { phase, selectedMiniId, selectedAction } = useSelection();
  const { setAction, commitNoTarget } = useSelectionActions();
  const actions = usePlayerActions(selectedMiniId);

  const selectedMini = useMemo(
    () => miniatures.find((m) => m.id === selectedMiniId) ?? null,
    [miniatures, selectedMiniId],
  );

  const visible =
    selectedMini &&
    selectedMini.team === 'player' &&
    (phase === SELECTION_PHASE.MINI_SELECTED || phase === SELECTION_PHASE.ACTION_PICKING);

  if (!visible) return null;

  const { x, y, z } = selectedMini.position;

  const handleActionClick = (action) => {
    const isPicked = selectedAction?.id === action.id;
    if (isPicked) {
      // toggle off — back to MINI_SELECTED
      setAction(null);
      return;
    }
    if (!action.targetType) {
      // No target needed — commit immediately (Search, Search Flora, End Turn, ...)
      commitNoTarget(action);
    } else {
      // Enter ACTION_PICKING; the click on the eventual target commits.
      setAction(action);
    }
  };

  return (
    <Html
      position={[x, y + 1.4, z]}
      center
      style={{ pointerEvents: 'auto' }}
    >
      <div
        onPointerDown={(e) => e.stopPropagation()}
        style={panelStyle}
      >
        <div style={titleStyle}>
          {selectedMini.name} — Actions
        </div>
        {actions.map((action) => {
          const isPicked = selectedAction?.id === action.id;
          const meta = formatActionMeta(action);
          return (
            <button
              key={action.id}
              type="button"
              onClick={() => handleActionClick(action)}
              style={{
                ...buttonStyle,
                background: isPicked ? '#4488ff' : 'transparent',
                color: isPicked ? '#0d0d1a' : '#ffffff',
              }}
            >
              {action.label} {meta && <span style={{ opacity: 0.7 }}>{meta}</span>}
            </button>
          );
        })}
        {phase === SELECTION_PHASE.ACTION_PICKING && (
          <div style={hintStyle}>{pickingHint(selectedAction)}</div>
        )}
      </div>
    </Html>
  );
}

function formatActionMeta(action) {
  if (action.targetType === 'enemy' && Number.isFinite(action.range)) {
    return `(${action.range} ft)`;
  }
  if (action.targetType === 'ally' && Number.isFinite(action.range)) {
    return `(ally · ${action.range} ft)`;
  }
  if (action.targetType === 'anchor') return '(reposition)';
  if (action.targetType === 'zone') return '(zone)';
  return null;
}

function pickingHint(action) {
  if (!action) return null;
  switch (action.targetType) {
    case 'enemy':  return 'Click an enemy to commit';
    case 'ally':   return 'Click an ally to commit';
    case 'anchor': return 'Click an anchor to reposition';
    case 'zone':   return 'Click a zone tile to commit';
    default:       return null;
  }
}

const panelStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  padding: '8px 10px',
  background: 'rgba(13,13,26,0.92)',
  border: '1px solid #4488ff',
  borderRadius: 6,
  minWidth: 160,
  fontFamily: 'monospace',
  fontSize: 12,
  color: '#ffffff',
  textShadow: '0 0 4px #000',
  boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
};

const titleStyle = {
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  color: '#88aacc',
  marginBottom: 2,
};

const buttonStyle = {
  textAlign: 'left',
  padding: '4px 8px',
  border: '1px solid #4488ff',
  borderRadius: 3,
  fontFamily: 'inherit',
  fontSize: 12,
  cursor: 'pointer',
};

const hintStyle = {
  fontSize: 10,
  color: '#ffaa44',
  marginTop: 4,
};
