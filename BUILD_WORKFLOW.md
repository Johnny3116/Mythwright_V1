# Mythwright — Build Workflow

This document defines the exact build order for Mythwright. Each phase has clear inputs, outputs, dependencies, and acceptance criteria. Phases must be completed in order — each builds on the previous.

---

## Phase 0: Project Scaffolding
**Prompt:** `prompts/01-scaffold.md`
**Dependencies:** None
**Duration:** ~30 minutes

### Tasks
1. Initialize Vite + React project (`npm create vite@latest`)
2. Create the full folder structure as defined in `PROJECT.md`
3. Set up path aliases in `vite.config.js` (`@engine`, `@views`, `@components`, etc.)
4. Create placeholder files (empty components with basic exports) for every module
5. Install core dependencies: `react`, `react-dom`, `react-router-dom`
6. Install dev dependencies: `vite`, `@vitejs/plugin-react`, `vitest`, `@testing-library/react`
7. Set up basic routing in `App.jsx`: `/lobby`, `/character-select`, `/game`, `/host`
8. Create base CSS with theme variables in `index.css`
9. Add `.env.example` with `VITE_CLAUDE_API_KEY=`

### Acceptance Criteria
- [ ] `npm run dev` starts without errors
- [ ] All 4 routes render placeholder text
- [ ] Folder structure matches `PROJECT.md` specification
- [ ] All placeholder files export named components/functions
- [ ] Theme CSS variables are applied globally

---

## Phase 1: Asset Pipeline
**Prompt:** `prompts/02-assets.md`
**Dependencies:** Phase 0
**Duration:** ~1 hour

### Tasks
1. Create SVG icon set for classes (Assault, Trapper, Medic, Support)
2. Create SVG icon set for UI elements (sword, shield, heart, dice, trap, plant, skull)
3. Create placeholder zone images (CSS gradient backgrounds as fallbacks)
4. Set up font loading (Cinzel for display, Inter for body, JetBrains Mono for stats)
5. Create D20 dice SVG/CSS for the animated roller
6. Build the base component library shells: `HealthBar`, `StatCard`, `ActionButton`, `Modal`
7. Create the shared CSS module with animation keyframes
8. Copy `monster-hunt-tzorath.json` into `campaigns/`

### Acceptance Criteria
- [ ] All icon SVGs render at multiple sizes (16px, 24px, 32px, 48px)
- [ ] Fonts load correctly and apply per theme variables
- [ ] D20 dice element renders and can be rotated via CSS
- [ ] Base components render with placeholder content
- [ ] `campaigns/monster-hunt-tzorath.json` is loadable and valid JSON

---

## Phase 2: Game Engine Core
**Prompt:** `prompts/03-engine.md`
**Dependencies:** Phase 0 + campaign blueprint JSON
**Duration:** ~3-4 hours

### Tasks
1. **BlueprintLoader.js** — Parse and validate campaign JSON against expected schema. Return typed game data or error list.
2. **DiceSystem.js** — `rollD20()` using `crypto.getRandomValues()`. Support modifiers. Maintain roll history.
3. **CombatResolver.js** — Pure function: `(attacker, defender, roll, settings) → CombatResult`. Handles hit/miss/crit, damage calc, defense, modifiers, status effects.
4. **GameEngine.js** — Finite state machine: `LOBBY → CHARACTER_SELECT → GAME_SETUP → TURN_LOOP → GAME_OVER`. Manages full game state object. Exposes `dispatch(action)` API.
5. **TurnManager.js** — Cycle through: all player turns → boss turn → environment phase → win check → next round. Track initiative order.
6. **BehaviorTree.js** — Read enemy stage data. Evaluate conditions (dodge chance, burrow, grab, AOE). Select action. Resolve against D20.
7. **EvolutionSystem.js** — Monitor boss HP against stage retreat thresholds. Trigger evolution sequence. Apply HP recovery. Transition to next stage.
8. **TrapSystem.js** — Handle trap placement (setup rolls), trap storage per zone, trigger resolution when boss enters zone, escape roll resolution.
9. **WildlifeSystem.js** — Per-zone wildlife behavior. Boss hunt rolls. Player intervention. Buff application.
10. **FloraSystem.js** — Plant spawn per zone based on weights. Relocation every N turns. Search rolls. Healing application.
11. **RetreatSystem.js** — Player escape action. D20 + zone modifier. Outcome resolution (fail/partial/success/perfect).
12. **StatusEffects.js** — Track active effects per entity. Tick on turn end. Remove on expiry. Stack rules.

### Build Order (within this phase)
```
DiceSystem → CombatResolver → StatusEffects → BlueprintLoader →
TurnManager → BehaviorTree → EvolutionSystem →
TrapSystem → WildlifeSystem → FloraSystem → RetreatSystem →
GameEngine (integrates all of the above)
```

### Acceptance Criteria
- [ ] `BlueprintLoader` successfully parses `monster-hunt-tzorath.json`
- [ ] `DiceSystem.rollD20()` returns values 1-20 with even distribution over 10,000 rolls
- [ ] `CombatResolver` correctly calculates damage for miss/hit/crit scenarios
- [ ] `GameEngine` state machine transitions through all states without error
- [ ] `BehaviorTree` selects correct actions based on boss stage data
- [ ] `EvolutionSystem` triggers at correct HP thresholds
- [ ] All systems can be enabled/disabled via blueprint `systems.X.enabled` flag
- [ ] Full game loop can run headlessly (no UI) with console output
- [ ] Unit tests pass for all engine modules

---

## Phase 3: Networking Layer
**Prompt:** `prompts/04-network.md`
**Dependencies:** Phase 2 (GameEngine)
**Duration:** ~2 hours

### Tasks
1. **PeerManager.js** — Initialize PeerJS. Host creates room (generates room code). Players connect with room code. Handle connection lifecycle.
2. **MessageTypes.js** — Define all message type constants and payload schemas.
3. **StateSync.js** — Host broadcasts full game state on every change. Players receive and apply. Conflict resolution: host is always authoritative.
4. **Reconnect.js** — Heartbeat every 5s. Detect disconnect. Auto-reconnect with state catch-up. Grace period before marking player disconnected.

### Acceptance Criteria
- [ ] Host can create a room and display a room code
- [ ] Player can join using room code from a different browser tab
- [ ] Game state changes on host are reflected on player within 500ms
- [ ] Player actions are sent to host and resolved
- [ ] Disconnected player can reconnect and receive current state
- [ ] 3-4 simultaneous connections work without state drift

---

## Phase 4: Views & UI
**Prompt:** `prompts/05-views.md`
**Dependencies:** Phase 2 + Phase 3
**Duration:** ~4-5 hours

### Tasks

**Lobby View**
1. Create/Join game toggle UI
2. Campaign upload (drag-drop JSON + image files)
3. Host editor: editable blueprint preview with JSON tree view
4. Room code display (large, copyable)
5. Connected players list with ready status
6. GM mode selector (Human / Scripted / AI with API key input)
7. Start Game button (host only, requires all players ready)

**Character Select View**
1. Class cards with flip animation showing stats on back
2. Stat comparison display (HP, DMG, DEF, Special)
3. Name input and color/icon picker
4. Ready-up button
5. Waiting screen showing other players' selections

**Game View**
1. Zone map (interactive, shows connections, player/boss tokens)
2. Action panel (context-sensitive buttons for current turn)
3. Character sheet sidebar (current player stats, inventory, effects)
4. Narrator feed (scrolling text with typewriter animation)
5. Turn order bar (top, shows all entities, highlights active)
6. D20 dice roller (animated, shows result overlay)

**Host View**
1. Inherits all Game View elements
2. Monster stats panel (full HP, stage, next action queue)
3. All-player overview (HP bars, positions, status effects)
4. GM control buttons (advance story, override, trigger event, skip)
5. Driver toggle (switch Human/Scripted/AI without restarting)
6. Event log / upcoming events timeline

**Shared Components**
1. `DiceRoller` — 3D CSS animated D20 with number reveal
2. `HealthBar` — Animated HP bar (green → yellow → red)
3. `StatCard` — Reusable stat display with icon + value
4. `NarratorBox` — Typewriter text feed with auto-scroll
5. `TurnOrderBar` — Horizontal entity portraits with active glow
6. `ActionButton` — Disabled/enabled/highlighted states
7. `Modal` — Reusable dialog for confirmations, trap placement, item use
8. `ZoneCard` — Popup showing zone details, modifiers, wildlife, traps

### Acceptance Criteria
- [ ] All views render correctly on desktop (1280px+)
- [ ] Lobby: can upload JSON, edit, select GM mode, show room code
- [ ] Character: can select class, enter name, ready up
- [ ] Game: zone map shows all zones and connections from blueprint
- [ ] Game: action panel shows correct actions for player's turn
- [ ] Game: D20 roller animates and shows result
- [ ] Game: narrator feed displays narrative text with typewriter effect
- [ ] Host: can see all monster and player data simultaneously
- [ ] Host: GM controls trigger appropriate engine actions
- [ ] All components use theme CSS variables consistently
- [ ] Dark theme renders correctly across all views

---

## Phase 5: Campaign Engine Integration
**Prompt:** `prompts/06-campaign-engine.md`
**Dependencies:** Phase 2 + Phase 4
**Duration:** ~2-3 hours

### Tasks
1. Wire `BlueprintLoader` to Lobby's campaign upload
2. Populate zone map from blueprint `zones[]` data
3. Load class options from blueprint `classes[]` into character select
4. Initialize boss state from blueprint `enemies.boss.stages[0]`
5. Wire all game systems (traps, wildlife, flora, retreat) to their UI components
6. Connect GM driver to turn resolution — Scripted driver auto-plays boss turns
7. Implement full game loop: player turn → engine resolve → state sync → UI update → next turn
8. Evolution sequence: when boss retreats, play narrative, show stage transition animation, update stats
9. Win/lose condition checking after each action resolution
10. Game over screen with victory/defeat narrative from blueprint

### Acceptance Criteria
- [ ] Full game of Monster Hunt: Tzorath is playable from lobby to game over
- [ ] Boss evolves through all 5 stages at correct HP thresholds
- [ ] All 5 trap types can be placed and triggered
- [ ] Wildlife spawns and interacts correctly per zone data
- [ ] Flora spawns, relocates, and can be searched/used
- [ ] Retreat mechanic works with zone modifiers
- [ ] Scripted driver auto-plays a complete game without errors
- [ ] Human driver allows full manual control
- [ ] Win condition triggers on boss defeat at stage 5
- [ ] Save to JSON captures complete state; load resumes correctly

---

## Phase 6: Package & Configuration
**Prompt:** `prompts/07-package.md`
**Dependencies:** All previous phases
**Duration:** ~30 minutes

### Tasks
1. Finalize `package.json` with all dependencies and scripts
2. Configure `vite.config.js` for production build (chunking, asset optimization)
3. Set up environment variables for API keys
4. Add `npm run build` and verify static output
5. Add `npm run preview` for local production testing
6. Configure deployment target (GitHub Pages, Vercel, or Netlify)
7. Add `npm run test` script wired to Vitest

### Acceptance Criteria
- [ ] `npm install` completes without errors
- [ ] `npm run dev` starts development server
- [ ] `npm run build` produces optimized static bundle
- [ ] `npm run preview` serves production build locally
- [ ] `npm run test` runs test suite
- [ ] Bundle size < 500KB gzipped (excluding campaign assets)
- [ ] No console errors in production build

---

## Phase 7: Code Review
**Prompt:** `prompts/08-code-review.md`
**Dependencies:** All previous phases
**Duration:** ~1-2 hours

### Review Checklist
1. **Architecture** — Does the code match `PROJECT.md` spec? Are concerns separated correctly?
2. **Engine correctness** — Do all game systems resolve identically to blueprint rules?
3. **Network reliability** — Does state sync handle edge cases (disconnect, race conditions, out-of-order messages)?
4. **UI consistency** — Do all views use theme variables? Any hardcoded colors/fonts?
5. **Error handling** — Are invalid blueprints caught? Do network failures degrade gracefully?
6. **Performance** — Any unnecessary re-renders? Large state objects being cloned inefficiently?
7. **Security** — Is the API key handled safely (never in state sync, never in client bundle)?
8. **Accessibility** — Keyboard navigation for action buttons? Screen reader labels on interactive elements?
9. **Code quality** — Consistent naming, no dead code, no TODO comments left unresolved
10. **Blueprint compatibility** — Would a differently-structured blueprint (D&D dungeon crawl) work with the engine?

---

## Phase 8: Testing
**Prompt:** `prompts/09-test.md`
**Dependencies:** All previous phases
**Duration:** ~2-3 hours

### Test Categories

**Unit Tests (Vitest)**
- DiceSystem: distribution fairness, modifier application
- CombatResolver: all hit/miss/crit paths, damage calculations
- BehaviorTree: correct action selection per stage
- EvolutionSystem: threshold triggers, HP recovery values
- TrapSystem: setup rolls, trigger resolution, escape rolls
- WildlifeSystem: hunt rolls, buff application
- FloraSystem: spawn, search, healing
- RetreatSystem: outcome resolution, zone modifiers
- BlueprintLoader: valid JSON, invalid JSON, missing fields

**Integration Tests**
- Full game loop: lobby → character select → 3 rounds of combat → evolution → game over
- Network: host creates, 2 players join, state syncs correctly
- Save/Load: export mid-game, import, resume at correct state
- GM drivers: same game scenario produces valid results in all 3 modes

**Manual Testing Checklist**
- [ ] 3-player game from start to finish (Scripted mode)
- [ ] 4-player game with Human Host
- [ ] Player disconnect and reconnect mid-game
- [ ] Campaign upload with invalid JSON (graceful error)
- [ ] All 5 boss stages reached and defeated
- [ ] Every trap type placed and triggered at least once
- [ ] Every zone visited
- [ ] Save and resume across browser sessions

---

## Deployment

Once all phases pass:

1. `npm run build`
2. Deploy `dist/` to hosting platform
3. Share URL with players
4. Host creates game, players join via room code
5. Hunt begins

---

## Estimated Total Build Time

| Phase | Est. Time |
|-------|-----------|
| 0: Scaffolding | 30 min |
| 1: Assets | 1 hr |
| 2: Engine | 3-4 hrs |
| 3: Network | 2 hrs |
| 4: Views & UI | 4-5 hrs |
| 5: Campaign Integration | 2-3 hrs |
| 6: Package & Config | 30 min |
| 7: Code Review | 1-2 hrs |
| 8: Testing | 2-3 hrs |
| **Total** | **~16-20 hrs** |
