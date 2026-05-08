# Mythwright V2 — Vision & Architecture

**Design direction:** *3D tabletop diorama, miniature-first combat, tactical UI overlays, cinematic encounter moments.*

V2 builds a Three.js / React Three Fiber rendering layer on top of the V1 engine. The engine stays deterministic and engine-driven. The 3D scene is a presentation layer only — a fancy puppet stage. Game logic never moves into the renderer.

---

## Core Principle

```
Existing Mythwright Engine (V1)
          ↓
  View Models / Selectors
          ↓
  Three.js / R3F Scene (3D)
          ↓
  2D Tactical UI Overlays
```

The engine remains the source of truth. The 3D layer only renders:

- Map tiles / terrain
- Miniatures
- Colored base rings
- Health bars
- Movement range
- Targeting lines
- Distance labels
- Dice overlays
- Encounter splash screens

---

## Folder Structure

```
src/
  engine/               ← V1 engine, untouched
    combat/
    movement/
    turn/
    campaign/

  shared/               ← NEW: shared contracts (see Schema-Driven section)
    constants/
    types/
    contracts/
    schema/

  scene3d/              ← NEW: Three.js / React Three Fiber scene
    MythwrightCanvas.jsx
    CameraRig.jsx
    TabletopScene.jsx
    Miniature.jsx
    MiniBaseRing.jsx
    HealthBillboard.jsx
    TargetingLine.jsx
    DistanceLabel.jsx
    MovementPreview.jsx
    DiceOverlay3D.jsx

  ui/                   ← NEW: 2D tactical overlays (HTML/CSS over canvas)
    InitiativeBar.jsx
    EncounterSplash.jsx
    AbilityPanel.jsx
    CharacterPanel.jsx

  views/                ← V1 views, refactored to use new scene3d layer
  components/           ← V1 components, retained or migrated
```

---

## Milestone Plan

### M1 — 3D Combat Viewer
Render one terrain plane, four miniatures, colored base rings, health bars, and an orbit/isometric camera. Nothing clickable yet — just proof the scene works.

### M2 — Selection & Targeting
Click a miniature → available actions appear. Click an action → enemies get target rings. Hover enemy → dotted targeting line + distance label ("31 FT"). Show valid/invalid targets.

The exact interaction loop:
```
Player clicks Miri
  → available actions appear
  → clicks Bow Shot
  → enemies get target rings
  → hover monster shows line + 31 FT
  → click monster
  → dice overlay rolls
  → damage number pops
  → health bar updates
```

### M3 — Engine Wiring
Connect selected action → existing combat reducer → dice result → damage update. No new engine logic. This milestone proves the V1 engine drives the V2 scene.

### M4 — Encounter Presentation
Top initiative strip. Encounter start animation. Victory/defeat overlays. Boss evolution splash.

### M5 — Movement Preview
Show movement radius/path on hover. Validate move distance against engine. Animate miniature movement along path.

### M6 — First Playable Diorama
One complete encounter (tavern ambush or forest road) that plays start-to-finish in the 3D tactical style.

---

## Key Data Shapes

### MiniatureViewModel

```js
// src/shared/types/miniature.js
{
  id: string,
  name: string,
  modelUrl: string,
  position: { x, y, z },
  rotation: number,
  team: 'player' | 'enemy' | 'neutral',
  ringColor: string,         // base ring color — critical for battlefield readability
  hp: { current, max },
  statusEffects: string[],
  isActive: boolean,
  isTargeted: boolean,
}
```

### CinematicEvent

```js
// src/shared/types/cinematic.js
// type: 'ENCOUNTER_START' | 'VICTORY' | 'DEFEAT' | 'BOSS_EVOLUTION' | 'CRITICAL_HIT'
{
  type: string,
  title?: string,    // for splashes
  actorId?: string,  // for CRITICAL_HIT
}
```

### EncounterScene

```js
// src/shared/types/encounter.js
{
  id: string,
  name: string,
  map: {
    sceneUrl?: string,           // optional 3D scene asset
    terrainPieces: TerrainPiece[],
    bounds: { width, height },
    gridSize: number,
  },
  spawnPoints: SpawnPoint[],
  interactables: Interactable[],
}
```

Encounter files live at `campaigns/tzorath/encounters/` — not a full map editor, just authored JSON scenes:

```
campaigns/
  tzorath/
    encounters/
      tavern_ambush.json
      forest_road.json
      boss_lair.json
```

---

## Camera Style

- Default angle: 45–60 degrees
- **Orthographic camera preferred** — perspective looks cooler in screenshots, but orthographic is much easier for tactical readability
- Smooth pan / zoom / rotate
- Click mini → camera gently centers on it
- Encounter start → cinematic zoom in
- Boss attack → short camera push

Start orthographic. Add perspective as an option later.

---

## Dice / Check UI

Build as a 2D overlay first. Real 3D physics dice are a productivity swamp with physics wearing a wizard hat.

Target flow:
```
Skill check panel slides in
  → D20 rolls (2D overlay or world-space UI)
  → modifier breakdown appears
  → result resolves to success / failure
```

3D dice can come after M6.

---

## Action Pipeline (avoid reducer drift)

Move toward:

```
intent → validated action → reducer → event log → render
```

Instead of UI directly mutating assumptions. This keeps multiplayer sync, rollback, and replay stable as the codebase grows.

---

## Schema-Driven Contracts

The root cause of V1 contract drift (wrong prop names, wrong phase constants, wrong state field names) was shared concepts defined in multiple places with no enforcement.

V2 fix: centralize everything in `src/shared/`.

```
src/shared/constants/turnPhase.js    ← single TurnPhase enum, imported everywhere
src/shared/constants/gamePhase.js
src/shared/contracts/dice.js         ← DiceResult shape
src/shared/contracts/bossState.js
src/shared/contracts/actions.js      ← ActionResult, ActionIntent
src/shared/contracts/encounter.js    ← EncounterState
```

Never redefine `TurnPhase`, `DiceResult`, `BossState`, `ActionResult`, or `EncounterState` anywhere else.

Runtime validation with Zod (`npm install zod` — V2 branch, not V1) covers:
- Network payloads
- Save files
- Campaign blueprints
- AI responses
- Reducer actions

**Do not add Zod to V1.** It belongs as the first commit on the V2 branch, before any feature work, so the schemas define contracts rather than document them retroactively.

---

## V2 Development Track Order

| Track | Focus |
|---|---|
| **Track 1 — Stabilize Contracts** | `src/shared/` constants, type shapes, remove duplicate enums, normalize action payloads, add Zod |
| **Track 2 — Tactical Feel** | 3D scene (M1–M3), targeting UX, attack previews, damage feedback, camera polish |
| **Track 3 — Multiplayer Stability** | Deterministic sync, reconnect handling, rollback safety, event replay |
| **Track 4 — Campaign Authoring** | Blueprint editor, encounter scripting, map pipeline, monster templates |
| **Track 5 — AI Layer** | AI narrator, AI dungeon generation, AI encounter scripting, AI campaign compiler |

Build in this order. Track 1 prevents the project from collapsing under contract drift as the 3D layer is added. Track 5 is last — the engine needs to be solid before AI touches game state.
