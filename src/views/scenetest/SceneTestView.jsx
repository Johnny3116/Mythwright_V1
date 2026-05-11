import { useCallback, useEffect, useState } from 'react';
import MythwrightCanvas from '@scene3d/MythwrightCanvas.jsx';
import TabletopScene from '@scene3d/TabletopScene.jsx';
import ActionOverlay from '@ui/ActionOverlay.jsx';
import {
  SelectionProvider,
  SelectionBridge,
  useSelectionBridgeValue,
  useSelection,
  useSelectionActions,
} from '@scene3d/state/SelectionContext.jsx';

// M2 verification view — adds selection/targeting on top of M1's rendering.
// Click a player mini → action panel appears → click an action → enemies get
// target rings → hover an enemy → dotted line + distance label → click to commit.
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
    hp: { current: 340, max: 500 }, statusEffects: [], isActive: false, isTargeted: false,
  },
  {
    id: 'mob1', name: 'Wolf', team: 'enemy', ringColor: '#cc6644',
    position: { x: 4, y: 0, z: 2 }, rotation: Math.PI,
    hp: { current: 30, max: 30 }, statusEffects: [], isActive: false, isTargeted: false,
  },
];

// Drains pendingAttack into a local log buffer so M2 is provably end-to-end
// without the V1 engine wired in yet. M3 will replace this with a real
// dispatch into the engine's combat reducer.
function PendingAttackLogger({ onLog }) {
  const { pendingAttack } = useSelection();
  const { clear } = useSelectionActions();
  useEffect(() => {
    if (!pendingAttack) return;
    onLog(pendingAttack);
    clear();
  }, [pendingAttack, clear, onLog]);
  return null;
}

function PhaseIndicator() {
  const { phase, selectedMiniId, selectedAction, hoveredTargetId } = useSelection();
  return (
    <span style={{ color: '#aacccc' }}>
      phase=<b>{phase}</b>
      {' '}sel=<b>{selectedMiniId ?? '—'}</b>
      {' '}act=<b>{selectedAction?.id ?? '—'}</b>
      {' '}hover=<b>{hoveredTargetId ?? '—'}</b>
    </span>
  );
}

// Inner shell — runs inside SelectionProvider so the dev header bar can read
// state, AND captures the bridge value to forward into the canvas.
function SceneTestInner() {
  const [log, setLog] = useState([]);
  const bridge = useSelectionBridgeValue();

  // Stable identity so PendingAttackLogger's effect doesn't re-fire every
  // render (which would re-log the same attack on each frame).
  const handleLog = useCallback((att) => {
    setLog((l) => [att, ...l].slice(0, 6));
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        padding: '8px 16px',
        background: '#0d0d1a',
        color: '#888',
        fontSize: '12px',
        fontFamily: 'monospace',
        borderBottom: '1px solid #333',
        display: 'flex',
        gap: 16,
        alignItems: 'center',
        flexWrap: 'wrap',
      }}>
        <span>M2 — Selection &amp; Targeting</span>
        <span>Click player → action → hover enemy → click</span>
        <PhaseIndicator />
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        <MythwrightCanvas>
          <SelectionBridge value={bridge}>
            <TabletopScene miniatures={TEST_MINIATURES} />
            <ActionOverlay miniatures={TEST_MINIATURES} />
            <PendingAttackLogger onLog={handleLog} />
          </SelectionBridge>
        </MythwrightCanvas>

        {log.length > 0 && (
          <div style={{
            position: 'absolute',
            bottom: 12,
            left: 12,
            padding: '8px 12px',
            background: 'rgba(13,13,26,0.92)',
            border: '1px solid #4488ff',
            borderRadius: 6,
            fontFamily: 'monospace',
            fontSize: 11,
            color: '#ffffff',
            maxWidth: 360,
          }}>
            <div style={{ color: '#88aacc', fontSize: 10, marginBottom: 4 }}>
              PENDING ATTACKS (latest first) — M3 will route these to the engine
            </div>
            {log.map((att, i) => (
              <div key={i} style={{ opacity: 1 - i * 0.12 }}>
                {att.attackerId} → {att.targetId} via {att.action?.label}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SceneTestView() {
  return (
    <SelectionProvider>
      <SceneTestInner />
    </SelectionProvider>
  );
}
