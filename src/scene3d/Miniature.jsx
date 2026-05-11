import { Html } from '@react-three/drei';
import MiniBaseRing from './MiniBaseRing.jsx';
import {
  useSelection,
  useSelectionActions,
  useIsSelected,
  useIsTargetable,
  useIsHovered,
} from './state/SelectionContext.jsx';

const TEAM_COLORS = {
  player: '#4488ff',
  enemy: '#ff4444',
  neutral: '#aaaaaa',
};

const TARGET_RING_COLOR = '#ff8844';
const HOVER_TARGET_RING_COLOR = '#ffdd44';

// Placeholder miniature — capsule body + name label + colored base ring.
// modelUrl support (glTF) comes in M2+.
//
// M2: this component is now selection-aware. Click → selectMini. While
// ACTION_PICKING is active for an enemy, a second target ring appears and
// pointer-over fires hoverTarget; click commits the attack.
export default function Miniature({ mini }) {
  const { id, name, position, rotation, team, ringColor, hp, isActive: dataActive, isTargeted: dataTargeted } = mini;
  const { x, y, z } = position;
  const bodyColor = TEAM_COLORS[team] ?? '#ffffff';

  const { phase } = useSelection();
  const { selectMini, hoverTarget, commitTarget } = useSelectionActions();
  const selected = useIsSelected(id);
  const targetable = useIsTargetable(team);
  const hovered = useIsHovered(id);

  // Visual state — the data-driven flags from the view model still apply,
  // selection layers on top.
  const isActive = dataActive || selected;
  const isTargeted = dataTargeted || (targetable && hovered);
  const emissiveIntensity = isActive ? 0.6 : isTargeted ? 0.45 : 0;

  // R3F event handlers. onClick (rather than onPointerDown) cooperates with
  // OrbitControls, which captures pointerdown for camera rotation. We always
  // stop propagation so clicks don't fall through to the ground plane (which
  // would clear selection).
  const handleClick = (e) => {
    e.stopPropagation();
    if (phase === 'ACTION_PICKING' && targetable) {
      commitTarget(id);
      return;
    }
    // Players are the only thing you can pick up to control. Clicking enemies
    // outside ACTION_PICKING is currently a no-op (will become "inspect" later).
    if (team === 'player') {
      selectMini(id);
    }
  };

  const handlePointerOver = (e) => {
    e.stopPropagation();
    if (targetable) hoverTarget(id);
  };

  const handlePointerOut = (e) => {
    e.stopPropagation();
    if (targetable && hovered) hoverTarget(null);
  };

  return (
    <group key={id} position={[x, y, z]} rotation={[0, rotation, 0]}>
      {/* Body */}
      <mesh
        position={[0, 0.7, 0]}
        castShadow
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <capsuleGeometry args={[0.22, 0.6, 4, 8]} />
        <meshStandardMaterial
          color={bodyColor}
          emissive={isActive ? bodyColor : isTargeted ? '#ffffff' : '#000000'}
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>

      {/* Name + HP label — pointer-events:none on the drei wrapper so it
          doesn't block clicks on the mini body underneath it. */}
      <Html position={[0, 1.7, 0]} center distanceFactor={10} style={{ pointerEvents: 'none' }}>
        <div style={{
          color: '#ffffff',
          fontSize: '11px',
          fontFamily: 'monospace',
          whiteSpace: 'nowrap',
          textAlign: 'center',
          textShadow: '0 0 4px #000',
          pointerEvents: 'none',
        }}>
          <div>{name}</div>
          <div style={{ color: hp.current / hp.max > 0.5 ? '#44ff88' : '#ff8844' }}>
            {hp.current}/{hp.max}
          </div>
        </div>
      </Html>

      {/* Team-color base ring (always visible) */}
      <MiniBaseRing position={[0, 0, 0]} ringColor={ringColor} />

      {/* Selection ring — slightly larger, white, only on the selected mini */}
      {selected && (
        <MiniBaseRing position={[0, 0.005, 0]} ringColor="#ffffff" radius={0.58} />
      )}

      {/* Target ring — appears on enemies during ACTION_PICKING */}
      {targetable && (
        <MiniBaseRing
          position={[0, 0.003, 0]}
          ringColor={hovered ? HOVER_TARGET_RING_COLOR : TARGET_RING_COLOR}
          radius={0.55}
        />
      )}
    </group>
  );
}
