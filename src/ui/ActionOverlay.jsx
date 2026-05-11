import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import {
  useSelection,
  useSelectionActions,
  SELECTION_PHASE,
} from '../scene3d/state/SelectionContext.jsx';

// Stub action set for M2 — every player mini gets the same three buttons.
// M3 wires this to the actual class data from the V1 engine.
const STUB_ACTIONS = [
  { id: 'bow_shot',   label: 'Bow Shot',   range: 30 },
  { id: 'sword_slash',label: 'Sword Slash',range: 5 },
  { id: 'fireball',   label: 'Fireball',   range: 60 },
];

// Small 2D HTML panel anchored above the selected miniature in screen space.
// Renders inside the R3F tree via drei <Html> so projection is automatic, but
// the contents are pure DOM with normal CSS — no world-space tilt.
//
// Lives in src/ui/ per the V2 plan. This is the only ui/ component for M2;
// CharacterPanel/InitiativeBar arrive in M4.
export default function ActionOverlay({ miniatures = [] }) {
  const { phase, selectedMiniId, selectedAction } = useSelection();
  const { setAction } = useSelectionActions();

  const selectedMini = useMemo(
    () => miniatures.find((m) => m.id === selectedMiniId) ?? null,
    [miniatures, selectedMiniId],
  );

  // Show whenever a player mini is selected; remain visible during ACTION_PICKING
  // so the user can swap actions without re-clicking the mini.
  const visible =
    selectedMini &&
    selectedMini.team === 'player' &&
    (phase === SELECTION_PHASE.MINI_SELECTED || phase === SELECTION_PHASE.ACTION_PICKING);

  if (!visible) return null;

  const { x, y, z } = selectedMini.position;

  return (
    <Html
      position={[x, y + 1.4, z]}
      center
      // No distanceFactor: render the panel at native CSS size in screen
      // space rather than world-space-scaled. Keeps controls readable at any
      // zoom level.
      style={{ pointerEvents: 'auto' }}
    >
      <div
        // Stop the canvas seeing this click — otherwise the empty-plane handler
        // would clear the selection the moment a button is pressed.
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          padding: '8px 10px',
          background: 'rgba(13,13,26,0.92)',
          border: '1px solid #4488ff',
          borderRadius: 6,
          minWidth: 140,
          fontFamily: 'monospace',
          fontSize: 12,
          color: '#ffffff',
          textShadow: '0 0 4px #000',
          boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
        }}
      >
        <div style={{
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          color: '#88aacc',
          marginBottom: 2,
        }}>
          {selectedMini.name} — Actions
        </div>
        {STUB_ACTIONS.map((action) => {
          const isPicked = selectedAction?.id === action.id;
          return (
            <button
              key={action.id}
              type="button"
              onClick={() => setAction(isPicked ? null : action)}
              style={{
                textAlign: 'left',
                padding: '4px 8px',
                background: isPicked ? '#4488ff' : 'transparent',
                color: isPicked ? '#0d0d1a' : '#ffffff',
                border: '1px solid #4488ff',
                borderRadius: 3,
                fontFamily: 'inherit',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              {action.label} <span style={{ opacity: 0.7 }}>({action.range} ft)</span>
            </button>
          );
        })}
        {phase === SELECTION_PHASE.ACTION_PICKING && (
          <div style={{ fontSize: 10, color: '#ffaa44', marginTop: 4 }}>
            Click an enemy to commit
          </div>
        )}
      </div>
    </Html>
  );
}
