import { useMemo } from 'react';
import { Line, Html } from '@react-three/drei';
import { useSelection } from './state/SelectionContext.jsx';

// Visual constants. Grid square = 5 ft, matching V1's spatial conventions.
const FT_PER_UNIT = 5;
const IN_RANGE_COLOR = '#ffffff';
const OUT_OF_RANGE_COLOR = '#ff4444';
const LINE_Y = 1.0; // ride along the body height for readability

// Dotted targeting line + distance label between the selected mini and the
// currently-hovered enemy. Visual-only range gating: line turns red and the
// distance label tints when the action's `range` (in feet) is exceeded. Engine
// gating is M3's job.
//
// Looks up positions from the miniatures list passed in by the scene so this
// component doesn't need its own R3F state — purely derived.
export default function TargetingLine({ miniatures = [] }) {
  const { phase, selectedMiniId, hoveredTargetId, selectedAction } = useSelection();

  const { from, to, distFt, outOfRange } = useMemo(() => {
    if (phase !== 'ACTION_PICKING' || !selectedMiniId || !hoveredTargetId) {
      return { from: null, to: null, distFt: 0, outOfRange: false };
    }
    const a = miniatures.find((m) => m.id === selectedMiniId);
    const b = miniatures.find((m) => m.id === hoveredTargetId);
    if (!a || !b) return { from: null, to: null, distFt: 0, outOfRange: false };
    const ax = a.position.x, az = a.position.z;
    const bx = b.position.x, bz = b.position.z;
    const dx = bx - ax;
    const dz = bz - az;
    const distUnits = Math.hypot(dx, dz);
    const ft = Math.round(distUnits * FT_PER_UNIT);
    const range = selectedAction?.range ?? Infinity;
    return {
      from: [ax, LINE_Y, az],
      to:   [bx, LINE_Y, bz],
      distFt: ft,
      outOfRange: ft > range,
    };
  }, [phase, selectedMiniId, hoveredTargetId, selectedAction, miniatures]);

  if (!from || !to) return null;

  const color = outOfRange ? OUT_OF_RANGE_COLOR : IN_RANGE_COLOR;
  const mid = [(from[0] + to[0]) / 2, LINE_Y + 0.4, (from[2] + to[2]) / 2];

  return (
    <>
      <Line
        points={[from, to]}
        color={color}
        lineWidth={2}
        dashed
        dashSize={0.2}
        gapSize={0.15}
        transparent
        opacity={0.9}
      />
      <Html position={mid} center style={{ pointerEvents: 'none' }}>
        <div style={{
          color,
          fontSize: '12px',
          fontFamily: 'monospace',
          fontWeight: 700,
          letterSpacing: '0.5px',
          padding: '2px 6px',
          background: 'rgba(0,0,0,0.6)',
          border: `1px solid ${color}`,
          borderRadius: 3,
          textShadow: '0 0 4px #000',
          whiteSpace: 'nowrap',
        }}>
          {distFt} FT{outOfRange ? ' • OUT OF RANGE' : ''}
        </div>
      </Html>
    </>
  );
}
