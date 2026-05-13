import { useEffect, useMemo, useRef, useState } from 'react';
import MythwrightCanvas from '@scene3d/MythwrightCanvas.jsx';
import TabletopScene from '@scene3d/TabletopScene.jsx';
import MoveAnchors from '@scene3d/MoveAnchors.jsx';
import ActionOverlay from '@ui/ActionOverlay.jsx';
import {
  SelectionProvider,
  SelectionBridge,
  useSelectionBridgeValue,
  useSelection,
} from '@scene3d/state/SelectionContext.jsx';
import { useGameContext } from '@context/GameContext.jsx';
import { useActionDispatcher } from '@hooks/useActionDispatcher.js';
import {
  toEncounterMiniatures,
  getZoneSpawnPoints,
} from '@scene3d/selectors/index.js';
import { loadDefaultBlueprint } from '@engine/BlueprintLoader.js';
import { ActionTypes } from '@utils/constants.js';

// V2 M3 verification view — selection + targeting now drives the real V1
// engine. Click a player → action panel (data-driven from class) → click
// target (enemy / ally / anchor) → engine reducer fires → narrator log
// updates with tier-aware text.

const PARTY = [
  { peerId: 'p1', name: 'Aria',   classId: 'assault' },
  { peerId: 'p2', name: 'Brenn',  classId: 'trapper' },
  { peerId: 'p3', name: 'Cyra',   classId: 'medic'   },
  { peerId: 'p4', name: 'Drust',  classId: 'support' },
];

/**
 * Bootstrap a fresh sandbox game on first render if no game is in progress.
 * Idempotent — does nothing once state.boss exists.
 */
function useScenetestBootstrap() {
  const { state, dispatch } = useGameContext();
  const [bootstrapState, setBootstrapState] = useState('idle'); // idle|loading|ready|error
  const [error, setError] = useState(null);
  // Use a ref instead of state for the once-guard. StrictMode double-invokes
  // effects in dev; a closure-captured cancellation flag would cancel the only
  // run that ever dispatched, leaving the view stuck on "Loading…".
  const startedRef = useRef(false);

  useEffect(() => {
    if (state.boss || startedRef.current) return;
    startedRef.current = true;
    setBootstrapState('loading');
    (async () => {
      const result = await loadDefaultBlueprint();
      if (!result.valid) {
        setError(result.errors.join('; '));
        setBootstrapState('error');
        return;
      }
      dispatch({ type: ActionTypes.SET_BLUEPRINT, payload: { blueprint: result.data } });
      dispatch({ type: ActionTypes.START_CHARACTER_SELECT, payload: {} });
      for (const p of PARTY) {
        dispatch({ type: ActionTypes.PLAYER_REGISTER, payload: { peerId: p.peerId, playerName: p.name } });
        dispatch({
          type: ActionTypes.PLAYER_SELECT_CLASS,
          payload: { peerId: p.peerId, classId: p.classId, playerName: p.name },
        });
      }
      dispatch({ type: ActionTypes.START_GAME, payload: {} });
      setBootstrapState('ready');
    })();
  }, [state.boss, dispatch]);

  return { ready: !!state.boss, bootstrapState, error };
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

function NarrativeLog() {
  const { state } = useGameContext();
  const lines = (state.narrativeLog ?? []).slice(-6).reverse();
  if (lines.length === 0) return null;
  return (
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
      maxWidth: 480,
    }}>
      <div style={{ color: '#88aacc', fontSize: 10, marginBottom: 4 }}>
        NARRATOR (latest first)
      </div>
      {lines.map((entry) => (
        <div key={entry.id} style={{ marginBottom: 2 }}>· {entry.text}</div>
      ))}
    </div>
  );
}

function SceneTestInner() {
  const { state } = useGameContext();
  const bridge = useSelectionBridgeValue();
  // Drains pendingAction → engine actions. Mount once.
  useActionDispatcher();

  // Pick the zone to render: first registered player's zone (all start in same zone).
  const zoneId = useMemo(() => {
    const firstId = state.playerOrder?.[0];
    return state.players?.[firstId]?.zone ?? state.blueprint?.zones?.[0]?.id ?? null;
  }, [state]);

  // Drive minis from real engine state via the selectors.
  const miniatures = useMemo(
    () => (zoneId ? toEncounterMiniatures(state, zoneId) : []),
    [state, zoneId],
  );

  // Move anchors for the rendered zone.
  const anchors = useMemo(() => {
    const sp = getZoneSpawnPoints(state.blueprint, zoneId);
    return sp?.moveAnchors ?? [];
  }, [state.blueprint, zoneId]);

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
        <span>M3 — Engine Wiring</span>
        <span>Click player → action → target (enemy / ally / anchor)</span>
        <span>zone=<b>{zoneId ?? '—'}</b></span>
        <PhaseIndicator />
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        <MythwrightCanvas>
          <SelectionBridge value={bridge}>
            <TabletopScene miniatures={miniatures} zoneId={zoneId} />
            <MoveAnchors anchors={anchors} />
            <ActionOverlay miniatures={miniatures} />
          </SelectionBridge>
        </MythwrightCanvas>
        <NarrativeLog />
      </div>
    </div>
  );
}

export default function SceneTestView() {
  const { ready, bootstrapState, error } = useScenetestBootstrap();
  if (error) {
    return (
      <div style={{
        padding: 24, fontFamily: 'monospace', color: '#ff8844',
        background: '#0d0d1a', minHeight: '100vh',
      }}>
        Failed to bootstrap scene-test: {error}
      </div>
    );
  }
  if (!ready) {
    return (
      <div style={{
        padding: 24, fontFamily: 'monospace', color: '#88aacc',
        background: '#0d0d1a', minHeight: '100vh',
      }}>
        Loading {bootstrapState}…
      </div>
    );
  }
  return (
    <SelectionProvider>
      <SceneTestInner />
    </SelectionProvider>
  );
}
