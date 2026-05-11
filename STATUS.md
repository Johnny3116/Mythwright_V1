# Mythwright — Project Status

> Last updated: 2026-05-10 (rev 6 — V2 M2 complete)

## Overview

Browser-based tabletop game engine built with React + Vite, PeerJS/WebRTC multiplayer, campaign blueprint system. Designed for cooperative dungeon-crawl style gameplay with a boss antagonist controlled by AI/scripted/human GM drivers.

## Tech Stack

- React 18 + Vite (frontend)
- PeerJS/WebRTC (multiplayer networking)
- Vitest (testing)
- Campaign JSON blueprints (content)

---

## Completed Phases

### Phase 0–6: Core Engine Build

- 12 engine modules: DiceSystem, CombatResolver, CampaignLoader, ZoneManager, CharacterManager, InventoryManager, QuestManager, NarrativeEngine, SaveSystem, StateManager, GameLoop, EventBus
- 4 views: Lobby, CharacterSelect, GameView, HostDashboard
- PeerJS networking layer with host-authority model
- 3 GM drivers: HumanDriver, ScriptedDriver, AIDriver
- Campaign blueprint compiler
- 259 unit tests passing

### Phase 7: Code Review & Bug Fixes

Comprehensive code review across all 43 source files. Found and fixed **17 critical issues**:

- TrapSystem field mismatch (`traps` → `placedTraps`)
- EvolutionSystem field mismatch (`stage` → `currentStage`)
- StatusEffects field mismatch (`effects` → `statusEffects`)
- TurnPhase enum consolidation (two separate enums with different string values)
- FloraSystem biased shuffle → Fisher-Yates
- BehaviorTree wrong parameter (`roll.raw` → `roll`)
- PeerManager first-join emit fix
- PeerManager `peer.reconnect()` added
- NetworkContext monotonic version counter
- Reconnect.js `lastSeen` fix
- STATE_REQUEST/RECONNECT_REQUEST alignment
- FloatingDamage wired into GameView
- TurnTracker → TurnOrderBar prop mismatch
- ActionButton render children
- HostView useEffect dependency arrays
- AIDriver model ID fix
- Peer identity validation

Also fixed **14 moderate/minor issues**:

- Broadcast debounce (75ms)
- Missing `bossId` in `getActiveEntity`
- Network error handler ordering
- Narrator useEffect deps
- `deserializeState` version validation
- ZoneMap style memoization
- DiceSystem history clear on new game
- ScriptedDriver dynamic stage keys
- ZoneMap blueprint positions wired
- CampaignUpload key fix
- HumanDriver promise leak/cancellation
- AIDriver AbortController compatibility

### Phase 8: Integration Testing

104 new integration tests across 3 test files:

- `GameLoop.test.js` (35 tests) — Full gameplay flow
- `Network.test.js` (23 tests) — In-memory peer simulation
- `GMDrivers.test.js` (46 tests) — All 3 driver types

Discovered and documented 2 engine edge cases. **Total: 395 tests passing.**

### Phase 9: Playtest & UX Polish

Fixed **6 critical UX bugs**:

- EncounterSplash visibility prop mismatch
- Player stuck on CharacterSelect (auto-redirect added)
- Game-over dead end (stats + return to lobby)
- Evolution overlay stuck (auto-dismiss with `CLEAR_EVOLVING`)
- JoinGame 500ms race condition removed
- Save/load error display

New systems added:

- `DisconnectOverlay` — full-screen disconnect handling
- `useSoundEvents` hook — event bus for audio (ready for audio files)
- Load Saved Game in lobby

Polish:

- Responsive breakpoints (tablet ≤1024px, mobile ≤768px)
- Hover/active state transforms
- Turn label pulse animation
- ActionPanel trap menu click-outside close
- `RESET_TO_LOBBY` and `CLEAR_EVOLVING` engine actions

### Phase 10: Spatial Gameplay & Action System

- New **SpatialSystem** engine module — zone mob init, boss movement, boss hunt resolution, player search/heal/flee, mob combat
- **4 new ActionTypes**: `BOSS_MOVE`, `PLAYER_HEAL`, `PLAYER_SEARCH`, `PLAYER_FLEE`
- Zone state tracking with mob HP/alive/cleared per zone
- Boss movement: moves to ANY zone, hunts local wildlife for power-ups (HP/damage/evolution boost)
- Boss visibility system — hidden until searched or same zone; `searchRevealed` clears on boss move
- 7-action context-aware ActionPanel: Move, Attack, Search, Heal, Set Trap, Ability, Flee, End Turn
- ZoneMap overhaul: player tokens, boss token (visibility), mob badges, cleared indicators, fog of war, move-mode pulse
- HostView boss movement before action phase
- 45 new tests

**Total: 440 tests passing.**

### QA Playtest Fixes (2026-04-01)

Applied targeted fixes from structured playtest report across 10 files:

- **Bug #1**: ActionButton — `children` prop with `displayLabel` fallback, PropTypes validation added
- **Bug #2**: useDiceRoll — accepts `{ onRollEnd }` options parameter, returns `result` alias for DiceRoller compatibility
- **Bug #3**: GameState/ActionTypes consolidated into `@utils/constants.js` as single source of truth (GameEngine.js now imports instead of defining inline)
- **Bug #5**: CombatResolver — roll normalization accepts both raw numbers and `{ natural, modified }` objects
- **Bug #6**: PeerManager — 5-second connection timeouts added to `createRoom()` and `joinRoom()`
- PropTypes added to DiceRoller and EncounterSplash components
- `prop-types` added as runtime dependency

**455 tests passing across 20 test files. Clean production build.**

### Phase 11: 5-Tier Dice System & Action UX (2026-04-13)

Implemented a full 5-tier roll outcome system, full-screen dice overlay, and 1-action-per-turn enforcement:

**5-Tier Hit Range System:**
- Blueprint `settings.hitRanges` updated from 3-tier to 5-tier: `critFail [1,1]`, `miss [2,5]`, `glancing [6,10]`, `hit [11,19]`, `critHit [20,20]`
- `CombatResolver.js` — handles all 5 tiers; `critFail` returns `fumble:true` + `effectsApplied:['disarmed']`; `glancing` applies `multiplier * 0.5`; all results include `tier` field
- `DiceSystem.js` — added `getOutcomeTier(rollValue, hitRanges)` utility (moved from `RollOutcomeCard.jsx` to fix Vite Fast Refresh HMR warning)
- Tier-aware narrator in GameEngine `PLAYER_ATTACK` — distinct message for each of 5 tiers including boss/player name

**Full-Screen Dice Roll Overlay:**
- New `DiceRollOverlay.jsx` component — full-screen fixed overlay, 200px animated D20, number flickers at 70ms during 1.5s roll, result held 2s then auto-dismisses (or click to dismiss)
- `RollOutcomeCard.jsx` — small persistent outcome card shown after overlay dismisses, auto-dismisses at 4.5s
- All tier descriptions in both components are action-neutral (not attack-specific)
- `rollWithOverlay(actionName)` in `ActionPanel` — wraps every rolled action, shows overlay during/after roll

**1-Action-Per-Turn Enforcement:**
- `endTurnAfterOverlay = useRef(false)` flag in `ActionPanel` — set after every rolled action dispatch
- `handleOverlayDismiss` calls `onEndTurn?.()` when flag is set — turn advances after player sees result
- Move action ends turn immediately (no roll/overlay)
- "End Turn" button remains for manual pass

**Bug Fixes:**
- Failed Search roll (≤5) no longer reveals creature intel in narrator — `resolveSearch` in `SpatialEngine.js` only appends wildlife text on rolls > 5
- Outcome descriptions were attack-specific ("may do damage") even on non-attack actions — replaced with generic tier text in both overlay and outcome card

**Tests:** 4 new CombatResolver tests (critFail fumble, glancing half-damage, roll-specific tier assertions). **Total: 459 tests passing.**

---

## V2 — In Progress

### Track 1: Shared Contracts ✅ (2026-05-09)
- `src/shared/contracts/dice.js` — `DiceResultSchema`, `TieredDiceResultSchema` (Zod)
- `src/shared/contracts/actions.js` — `ActionIntentSchema`, `CombatResultSchema` (Zod)
- `src/shared/contracts/cinematic.js` — `CinematicEventSchema` discriminated union (Zod)
- `src/shared/contracts/encounter.js` — `MiniatureViewModelSchema`, `EncounterSceneSchema` (Zod)
- `src/shared/index.js` — barrel export
- Packages: `zod@^4`

### M1: 3D Combat Viewer ✅ (2026-05-09)
- `MythwrightCanvas.jsx` — R3F `<Canvas>` wrapper with shadows
- `CameraRig.jsx` — orthographic isometric camera (45°), OrbitControls
- `TabletopScene.jsx` — terrain plane, grid, ambient + directional lighting
- `Miniature.jsx` — capsule mesh, HP label, active/targeted emissive states
- `MiniBaseRing.jsx` — colored torus ring under each mini
- `/scene-test` route mounted on `SceneTestView` — dev sandbox
- Packages: `three@^0.184`, `@react-three/fiber@^8`, `@react-three/drei@^9`

### M2: Selection & Targeting ✅ (2026-05-10)
- `selectionReducer.js` — pure state machine: `IDLE → MINI_SELECTED → ACTION_PICKING → IDLE` with persistent `pendingAttack` slot. 13 unit tests.
- `SelectionContext.jsx` — Context+useReducer per V1 architecture rule. Includes Canvas context bridge (`useSelectionBridgeValue` + `<SelectionBridge>`) because R3F v8 does not auto-propagate React context across `<Canvas>`.
- `Miniature.jsx` — click-to-select for players, click-to-commit for enemies during ACTION_PICKING. White selection ring + orange/yellow target rings.
- `MiniBaseRing.jsx` — fixed double-translation bug from M1; now correctly takes a local offset.
- `TargetingLine.jsx` — dotted line + `XX FT` distance label between selected mini and hovered enemy. Visual range gating (red + "OUT OF RANGE" when distance > action range).
- `ActionOverlay.jsx` (new `src/ui/`) — 2D HTML floating action panel via drei `<Html>`, anchored above selected mini in native screen-space size.
- `TabletopScene.jsx` — terrain plane click clears selection. `onClick` chosen over `onPointerDown` to cooperate with OrbitControls.
- `SceneTestView.jsx` — `SelectionProvider` + `SelectionBridge` plumbing, live phase indicator in header, pending-attack log in bottom-left as a stand-in for the engine wiring landing in M3.
- `vite.config.js` — added `@ui` alias.
- **End-to-end verified in Chrome over Tailscale** — full loop: click player → action panel → click action → enemies highlight → hover enemy → red dashed line + distance label → click enemy → exactly one `pendingAttack` log entry.

### Bugs found and fixed during M2 verification
1. drei `<Html>` name labels intercepted clicks (fixed by passing `pointerEvents: 'none'` on the wrapper, not just the inner div)
2. `<Html>` with `distanceFactor` rendered overlays at huge world-scale (fixed by removing it for screen-space sizing)
3. `onPointerDown` on minis fought OrbitControls (fixed by switching to `onClick`)
4. `PendingAttackLogger` re-fired its effect on every render because `onLog` was a fresh function each parent render (fixed by `useCallback`)

---

## Test Status

| Suite | Count |
|---|---|
| Unit tests (V1) | 340 |
| Integration tests | 104 |
| Spatial engine tests | 15 |
| **V2 selection reducer** | **13** |
| **Total** | **472** |

All tests passing. Build clean (Vite, ~7s, 723 modules — three chunk 210 KB gz).

---

## Dev Server

### Quick Start (recommended)

```powershell
.\scripts\Start-Mythwright.ps1
```

Launches the Vite dev server in a hidden background process, waits for it to be ready, then opens `http://localhost:5173` in the default browser automatically.

### Manual

```bash
npm run dev -- --host   # Vite on port 5173/5174
```

### Server Logging

The startup script writes a timestamped log to `scripts/server logs/server_<timestamp>.log` on every run. Logs capture all Vite stdout/stderr — useful for diagnosing startup errors or crashes. Log files are gitignored and stay local only.

---

## Repository

V1 sealed on `main`. V2 work in progress on `main` as additive layers (engine untouched). All work committed and pushed to GitHub.

---

## V2 Direction

*3D tabletop diorama, miniature-first combat, tactical UI overlays, cinematic encounter moments.*

V2 adds a Three.js / React Three Fiber rendering layer over the existing V1 engine. Engine remains the source of truth — 3D is presentation only. See [V2_VISION.md](V2_VISION.md) for the full architecture and milestone plan.

### Milestone progress
- ✅ Track 1 — Shared Contracts (Zod schemas)
- ✅ M1 — 3D Combat Viewer
- ✅ M2 — Selection & Targeting
- 🔲 M3 — Engine Wiring (route `pendingAttack` through V1 CombatResolver)
- 🔲 M4 — Encounter Presentation (initiative bar, splash overlays)
- 🔲 M5 — Movement Preview
- 🔲 M6 — First Playable Diorama

### Next up: M3
Wire the M2 `pendingAttack` payload through the V1 engine's combat path. Replace ActionOverlay's stub actions with real class actions from the campaign blueprint. Add `src/scene3d/selectors/` to translate engine state into `MiniatureViewModel[]`.
