// V2 M3: floor anchor markers shown during ACTION_PICKING for a 'move' action.
// Each marker is a flat ring on the ground at a moveAnchor position. Click to
// commit the anchor as the action's target — the dispatcher routes it through
// PLAYER_SET_ANCHOR.

import { useSelection, useSelectionActions } from './state/SelectionContext.jsx';

const ANCHOR_COLOR = '#88ccff';
const HOVER_COLOR  = '#ffdd44';

function AnchorMarker({ anchor, hovered, onClick, onHover, onUnhover }) {
  const { x, y, z } = anchor.position;
  return (
    <group position={[x, y + 0.01, z]}>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={(e) => { e.stopPropagation(); onClick(anchor.id); }}
        onPointerOver={(e) => { e.stopPropagation(); onHover(anchor.id); }}
        onPointerOut={(e) => { e.stopPropagation(); onUnhover(anchor.id); }}
      >
        <ringGeometry args={[0.35, 0.5, 32]} />
        <meshBasicMaterial
          color={hovered ? HOVER_COLOR : ANCHOR_COLOR}
          transparent
          opacity={0.85}
        />
      </mesh>
      {/* Solid center dot for visibility against the floor texture */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <circleGeometry args={[0.12, 16]} />
        <meshBasicMaterial color={hovered ? HOVER_COLOR : ANCHOR_COLOR} transparent opacity={0.6} />
      </mesh>
    </group>
  );
}

export default function MoveAnchors({ anchors = [] }) {
  const { phase, selectedAction, hoveredTargetId } = useSelection();
  const { commitTarget, hoverTarget } = useSelectionActions();

  const visible =
    phase === 'ACTION_PICKING' &&
    selectedAction?.targetType === 'anchor' &&
    anchors.length > 0;

  if (!visible) return null;

  return (
    <group>
      {anchors.map((a) => (
        <AnchorMarker
          key={a.id}
          anchor={a}
          hovered={hoveredTargetId === a.id}
          onClick={commitTarget}
          onHover={hoverTarget}
          onUnhover={(id) => hoverTarget(hoveredTargetId === id ? null : hoveredTargetId)}
        />
      ))}
    </group>
  );
}
