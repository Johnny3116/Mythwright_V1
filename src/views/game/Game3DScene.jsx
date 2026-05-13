// V2 M3: opt-in 3D scene panel for the live GameView, gated by ?view3d=1.
// The 2D ZoneMap remains the default. This component assumes the GameContext
// is already populated (lobby → character select → start game), so it does no
// bootstrap of its own — unlike SceneTestView which auto-bootstraps a sandbox.

import { useMemo } from 'react';
import MythwrightCanvas from '@scene3d/MythwrightCanvas.jsx';
import TabletopScene from '@scene3d/TabletopScene.jsx';
import MoveAnchors from '@scene3d/MoveAnchors.jsx';
import ActionOverlay from '@ui/ActionOverlay.jsx';
import {
  SelectionProvider,
  SelectionBridge,
  useSelectionBridgeValue,
} from '@scene3d/state/SelectionContext.jsx';
import { useGameContext } from '@context/GameContext.jsx';
import { useActionDispatcher } from '@hooks/useActionDispatcher.js';
import {
  toEncounterMiniatures,
  getZoneSpawnPoints,
} from '@scene3d/selectors/index.js';

function Game3DSceneInner({ zoneId }) {
  const { state } = useGameContext();
  const bridge = useSelectionBridgeValue();
  useActionDispatcher();

  const miniatures = useMemo(
    () => (zoneId ? toEncounterMiniatures(state, zoneId) : []),
    [state, zoneId],
  );
  const anchors = useMemo(() => {
    const sp = getZoneSpawnPoints(state.blueprint, zoneId);
    return sp?.moveAnchors ?? [];
  }, [state.blueprint, zoneId]);

  return (
    <MythwrightCanvas>
      <SelectionBridge value={bridge}>
        <TabletopScene miniatures={miniatures} />
        <MoveAnchors anchors={anchors} />
        <ActionOverlay miniatures={miniatures} />
      </SelectionBridge>
    </MythwrightCanvas>
  );
}

export default function Game3DScene({ zoneId }) {
  return (
    <SelectionProvider>
      <Game3DSceneInner zoneId={zoneId} />
    </SelectionProvider>
  );
}
