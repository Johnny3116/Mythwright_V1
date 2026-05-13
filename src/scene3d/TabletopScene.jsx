import CameraRig from './CameraRig.jsx';
import Miniature from './Miniature.jsx';
import TargetingLine from './TargetingLine.jsx';
import DioramaBase from './DioramaBase.jsx';
import TacticalGrid from './TacticalGrid.jsx';
import SceneAtmosphere from './SceneAtmosphere.jsx';
import { useSelectionActions } from './state/SelectionContext.jsx';
import { getBiome } from './biomes.js';

// V2 M3 visual: composes the diorama renderer.
//
// The scene is a small staged tabletop:
//   - SceneAtmosphere supplies fog + biome-tinted lighting
//   - DioramaBase is the table (top disc + bevel + pedestal)
//   - TacticalGrid overlays the playable surface with fading shader lines
//   - Miniature[] place themselves at their view-model positions
//   - TargetingLine draws the in-progress action arc
//
// `zoneId` selects the biome palette. Defaults to verdant-maw if unset
// so the M2 sandbox path stays visually correct.
export default function TabletopScene({ miniatures = [], zoneId = 'verdant-maw', size = 20 }) {
  const { clear } = useSelectionActions();
  const biome = getBiome(zoneId);

  // Clear selection on table-top click. Miniatures stop propagation via
  // onClick, so this only fires when the user clicks the empty disc.
  const handleBaseClick = (e) => {
    if (e.button === 0) clear();
  };

  return (
    <>
      <CameraRig zoom={60} />
      <SceneAtmosphere biome={biome} />
      <DioramaBase size={size} biome={biome} onClick={handleBaseClick} />
      <TacticalGrid size={size + 2} cell={1} biome={biome} />

      {miniatures.map((mini) => (
        <Miniature key={mini.id} mini={mini} />
      ))}

      <TargetingLine miniatures={miniatures} />
    </>
  );
}
