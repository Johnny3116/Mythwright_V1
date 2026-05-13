// V2 M3 visual: the diorama base — a beveled circular tabletop platform
// that visually anchors the encounter as a physical staged scene rather
// than an infinite floor. Three layers, top to bottom:
//
//   1. Top playable disc          — biome ground color, receives shadows
//   2. Bevel ring                 — biome groundEdge color, slight slope
//   3. Outer pedestal cylinder    — darker groundEdge, extends below 0
//
// The base is intentionally a touch larger than the gameplay area so the
// outer ring reads as "table edge" rather than terrain. Click on the top
// disc clears the current selection (cooperates with M2's selection model).

const TOP_RADIUS_OFFSET = 0.5;
const BEVEL_HEIGHT = 0.18;
const BEVEL_OUTER_OFFSET = 0.55;
const PEDESTAL_HEIGHT = 0.32;

export default function DioramaBase({ size = 20, biome, onClick }) {
  const playRadius = size / 2;
  const topRadius = playRadius + TOP_RADIUS_OFFSET;
  const bevelOuter = topRadius + BEVEL_OUTER_OFFSET;

  return (
    <group>
      {/* Top playable disc */}
      <mesh
        position={[0, 0.01, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        onClick={onClick}
      >
        <circleGeometry args={[topRadius, 96]} />
        <meshStandardMaterial color={biome.ground} roughness={0.95} metalness={0.0} />
      </mesh>

      {/* Bevel ring */}
      <mesh position={[0, -BEVEL_HEIGHT / 2, 0]} receiveShadow>
        <cylinderGeometry args={[topRadius, bevelOuter, BEVEL_HEIGHT, 96, 1, false]} />
        <meshStandardMaterial color={biome.groundEdge} roughness={0.9} />
      </mesh>

      {/* Outer pedestal */}
      <mesh position={[0, -BEVEL_HEIGHT - PEDESTAL_HEIGHT / 2, 0]} castShadow>
        <cylinderGeometry args={[bevelOuter, bevelOuter * 0.92, PEDESTAL_HEIGHT, 96, 1, false]} />
        <meshStandardMaterial color={darken(biome.groundEdge, 0.35)} roughness={0.85} />
      </mesh>

      {/* Faux floor under the pedestal so the table doesn't appear to float */}
      <mesh
        position={[0, -BEVEL_HEIGHT - PEDESTAL_HEIGHT - 0.001, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <circleGeometry args={[bevelOuter * 1.6, 64]} />
        <meshStandardMaterial color="#0a0a10" roughness={1.0} />
      </mesh>
    </group>
  );
}

function darken(hex, amount) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = Math.max(0, Math.min(255, Math.round(((n >> 16) & 0xff) * (1 - amount))));
  const g = Math.max(0, Math.min(255, Math.round(((n >> 8) & 0xff) * (1 - amount))));
  const b = Math.max(0, Math.min(255, Math.round((n & 0xff) * (1 - amount))));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
