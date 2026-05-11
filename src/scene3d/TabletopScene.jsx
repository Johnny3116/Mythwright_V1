import CameraRig from './CameraRig.jsx';
import Miniature from './Miniature.jsx';
import TargetingLine from './TargetingLine.jsx';
import { useSelectionActions } from './state/SelectionContext.jsx';

// Terrain plane — flat tabletop surface with grid. Clicking the plane (with
// no mini between you and it) clears the current selection.
function Terrain({ size = 20, onClick }) {
  return (
    <>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        onClick={onClick}
      >
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial color="#2a2a3e" />
      </mesh>
      <gridHelper args={[size, size, '#444466', '#333355']} position={[0, 0.01, 0]} />
    </>
  );
}

export default function TabletopScene({ miniatures = [] }) {
  const { clear } = useSelectionActions();

  // Clear selection on terrain click. Miniatures stop propagation via onClick,
  // so this only fires when the user clicks empty ground. Using onClick (not
  // onPointerDown) so OrbitControls camera rotation doesn't deselect.
  const handlePlaneClick = (e) => {
    if (e.button === 0) clear();
  };

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

      <Terrain size={20} onClick={handlePlaneClick} />

      {miniatures.map((mini) => (
        <Miniature key={mini.id} mini={mini} />
      ))}

      <TargetingLine miniatures={miniatures} />
    </>
  );
}
