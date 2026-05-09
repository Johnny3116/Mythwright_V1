import { Html } from '@react-three/drei';
import MiniBaseRing from './MiniBaseRing.jsx';

const TEAM_COLORS = {
  player: '#4488ff',
  enemy: '#ff4444',
  neutral: '#aaaaaa',
};

// Placeholder miniature — capsule body + name label + colored base ring.
// modelUrl support (glTF) comes in M2+.
export default function Miniature({ mini }) {
  const { id, name, position, rotation, team, ringColor, hp, isActive, isTargeted } = mini;
  const { x, y, z } = position;
  const bodyColor = TEAM_COLORS[team] ?? '#ffffff';
  const emissiveIntensity = isActive ? 0.6 : isTargeted ? 0.3 : 0;

  return (
    <group key={id} position={[x, y, z]} rotation={[0, rotation, 0]}>
      {/* Body */}
      <mesh position={[0, 0.7, 0]} castShadow>
        <capsuleGeometry args={[0.22, 0.6, 4, 8]} />
        <meshStandardMaterial
          color={bodyColor}
          emissive={isActive ? bodyColor : isTargeted ? '#ffffff' : '#000000'}
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>

      {/* Name + HP label */}
      <Html position={[0, 1.7, 0]} center distanceFactor={10}>
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

      {/* Base ring */}
      <MiniBaseRing position={[x, y, z]} ringColor={ringColor} />
    </group>
  );
}
