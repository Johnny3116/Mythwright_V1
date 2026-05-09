import MythwrightCanvas from '@scene3d/MythwrightCanvas.jsx';
import TabletopScene from '@scene3d/TabletopScene.jsx';

// M1 verification view — one terrain plane, four class miniatures, isometric camera.
// Not part of the game flow; navigate to /scene-test during development.
const TEST_MINIATURES = [
  {
    id: 'p1', name: 'Assault', team: 'player', ringColor: '#4488ff',
    position: { x: -3, y: 0, z: -2 }, rotation: 0,
    hp: { current: 120, max: 120 }, statusEffects: [], isActive: true, isTargeted: false,
  },
  {
    id: 'p2', name: 'Trapper', team: 'player', ringColor: '#44cc88',
    position: { x: -1, y: 0, z: -2 }, rotation: 0,
    hp: { current: 85, max: 100 }, statusEffects: [], isActive: false, isTargeted: false,
  },
  {
    id: 'p3', name: 'Medic', team: 'player', ringColor: '#ffcc44',
    position: { x: 1, y: 0, z: -2 }, rotation: 0,
    hp: { current: 90, max: 90 }, statusEffects: [], isActive: false, isTargeted: false,
  },
  {
    id: 'p4', name: 'Support', team: 'player', ringColor: '#cc44ff',
    position: { x: 3, y: 0, z: -2 }, rotation: 0,
    hp: { current: 110, max: 110 }, statusEffects: [], isActive: false, isTargeted: false,
  },
  {
    id: 'boss', name: 'Tzorath', team: 'enemy', ringColor: '#ff4444',
    position: { x: 0, y: 0, z: 3 }, rotation: Math.PI,
    hp: { current: 340, max: 500 }, statusEffects: [], isActive: false, isTargeted: true,
  },
];

export default function SceneTestView() {
  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        padding: '8px 16px',
        background: '#0d0d1a',
        color: '#888',
        fontSize: '12px',
        fontFamily: 'monospace',
        borderBottom: '1px solid #333',
      }}>
        M1 — 3D Combat Viewer &nbsp;|&nbsp; Left-drag: rotate &nbsp;|&nbsp; Right-drag: pan &nbsp;|&nbsp; Scroll: zoom
      </div>
      <div style={{ flex: 1 }}>
        <MythwrightCanvas>
          <TabletopScene miniatures={TEST_MINIATURES} />
        </MythwrightCanvas>
      </div>
    </div>
  );
}
