# Mythwright V1 — Project Status

> Last updated: 2026-03-29

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

---

## Test Status

| Suite | Count |
|---|---|
| Unit tests | 336 |
| Integration tests | 104 |
| **Total** | **440** |

All tests passing. Build clean (Vite, ~1.3s).

---

## Dev Server

```bash
npm run dev -- --host   # Vite on port 5173/5174
```

## Repository

All work committed and pushed to GitHub. Branch: `main`.
