import CameraRig from './CameraRig.jsx';
import Miniature from './Miniature.jsx';

// Terrain plane — flat tabletop surface with grid.
function Terrain({ size = 20 }) {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial color="#2a2a3e" />
      </mesh>
      <gridHelper args={[size, size, '#444466', '#333355']} position={[0, 0.01, 0]} />
    </>
  );
}

export default function TabletopScene({ miniatures = [] }) {
  return (
    <>
      <CameraRig zoom={60} />

      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-5, 8, -5]} intensity={0.3} color="#8888ff" />

      <Terrain size={20} />

      {miniatures.map((mini) => (
        <Miniature key={mini.id} mini={mini} />
      ))}
    </>
  );
}
