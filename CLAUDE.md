# CLAUDE.md — Mythwright AI Assistant Guide

## Project Overview

You are working on **Mythwright**, a universal browser-based tabletop game engine. It reads structured Campaign Blueprint JSON files and renders fully playable multiplayer game sessions with combat, exploration, narrative, and strategic mechanics.

**Before writing any code, read these documents in order:**

1. `PROJECT.md` — Full technical specification, architecture, file structure, and all system designs
1. `BUILD_WORKFLOW.md` — Phase-by-phase build order with dependencies and acceptance criteria
1. `campaigns/monster-hunt-tzorath.json` — The reference campaign blueprint (Monster Hunt: Tzorath the Ancient)

**Do not skip reading these files.** The project has very specific architecture decisions, naming conventions, and system designs that must be followed exactly.

-----

## Core Principles

### Architecture Rules

- The game engine is **deterministic** — same inputs always produce same outputs
- **No AI/API calls during runtime gameplay** (only during pre-game campaign compilation and only if AI Driver mode is active)
- The host device is the **single source of truth** — all state changes originate from host
- Players send **action intents** to host; host validates, resolves, and broadcasts results
- Every game system reads from the **Campaign Blueprint JSON** — no hardcoded game logic
- The engine must be **campaign-agnostic** — Monster Hunt is the first game, not the only game

### Code Standards

- **React 18** with functional components and hooks only (no class components)
- **CSS Modules** for component styling (no global CSS except `index.css` theme variables)
- **Pure functions** for all game logic (CombatResolver, DiceSystem, etc.) — easy to test, no side effects
- **Named exports** for all modules (no default exports except view-level page components)
- State management via **React Context + useReducer** — no external state libraries
- All game state must be **JSON-serializable** (for save/resume and network sync)
- Use `crypto.getRandomValues()` for dice rolls — never `Math.random()`

### File Organization

- Engine modules go in `src/engine/` — pure JS, no React dependencies
- Network modules go in `src/network/` — PeerJS abstraction layer
- GM drivers go in `src/drivers/` — implement the `DriverInterface`
- Views go in `src/views/{viewName}/` — each view has its own directory with component + CSS module
- Shared UI components go in `src/components/` — reusable across all views
- Hooks go in `src/hooks/` — custom React hooks wrapping engine/network APIs
- Context providers go in `src/context/` — GameContext and NetworkContext

-----

## Build Phases & Assigned Skills

Each build phase requires specific expertise. When working on a phase, adopt the role(s) listed.

### Phase 0: Project Scaffolding (`prompts/01-scaffold.md`)

**Role:** Build Engineer / DevOps

- Initialize Vite + React project
- Create full folder structure per `PROJECT.md`
- Set up routing, path aliases, base CSS
- Verify `npm run dev` works

### Phase 1: Asset Pipeline (`prompts/02-assets.md`)

**Role:** Frontend Developer / UI Designer

- Create SVG icon sets
- Set up font loading
- Build base component library shells
- Create D20 dice element

### Phase 2: Game Engine (`prompts/03-engine.md`)

**Role:** Game Systems Engineer / Backend Logic Developer

- This is the most critical phase — the entire game runs on these modules
- Build all 12 engine modules in dependency order (see `BUILD_WORKFLOW.md`)
- Every module must have unit tests
- Must parse and execute against `monster-hunt-tzorath.json` correctly
- All combat math must match the blueprint's defined ranges exactly

### Phase 3: Networking (`prompts/04-network.md`)

**Role:** Network Engineer / WebRTC Specialist

- PeerJS integration for P2P connections
- State synchronization protocol
- Host-authoritative model
- Reconnection handling

### Phase 4: Views & UI (`prompts/05-views.md`)

**Role:** Frontend Developer / UX Designer / Interaction Designer

- Build all 4 views (Lobby, Character Select, Game, Host)
- Build all shared components (DiceRoller, HealthBar, StatCard, etc.)
- Dark fantasy theme implementation
- Animated D20 dice roller
- Responsive layout for desktop (1280px+)
- Typewriter-effect narrator feed

### Phase 5: Campaign Engine Integration (`prompts/06-campaign-engine.md`)

**Role:** Systems Integration Engineer / Full-Stack Developer

- Wire engine modules to UI components
- Connect network layer to game state
- Implement full game loop end-to-end
- GM driver integration
- Save/load functionality

### Phase 6: Package & Config (`prompts/07-package.md`)

**Role:** Build Engineer / DevOps

- Finalize package.json
- Production build optimization
- Deployment configuration

### Phase 7: Code Review (`prompts/08-code-review.md`)

**Role:** Senior Developer / Code Reviewer / QA Lead

- Review ALL code against `PROJECT.md` spec
- Check engine correctness, network reliability, UI consistency
- Verify error handling, performance, security, accessibility
- Confirm blueprint compatibility for future campaign types

### Phase 8: Testing (`prompts/09-test.md`)

**Role:** QA Engineer / Test Automation Specialist

- Write and run unit tests for all engine modules
- Integration tests for game loop, network, save/load
- Manual testing checklist execution
- Bug identification and fix verification

-----

## Completion Conditions

A build phase is **complete** when ALL of the following are true:

1. **All tasks** listed in the phase's prompt file are implemented
1. **All acceptance criteria** in `BUILD_WORKFLOW.md` for that phase are checked off
1. **No console errors** — zero warnings or errors in browser console during normal operation
1. **No TypeScript/lint errors** — clean output from build tools
1. **Tests pass** — all unit tests for that phase's modules pass
1. **Code matches spec** — implementation aligns with `PROJECT.md` architecture
1. **Previous phases still work** — no regressions in earlier functionality

A phase is **NOT complete** if:

- Any acceptance criterion is unchecked
- Tests fail or are missing for core logic
- The code diverges from `PROJECT.md` without documented justification
- Console shows errors during normal gameplay flow

-----

## Session Handoff Protocol

Each build phase may be worked on in a **different Claude session**. To maintain continuity:

### Starting a New Session

1. Read `CLAUDE.md` (this file) first
1. Read `PROJECT.md` for full architecture context
1. Read `BUILD_WORKFLOW.md` and identify which phase you're working on
1. Read the specific prompt file in `prompts/` for your assigned phase
1. Check the current state of the codebase — what's already been built
1. Review any `CHANGELOG.md` entries from previous sessions

### Ending a Session

1. Update `CHANGELOG.md` with what was completed
1. Note any deviations from `PROJECT.md` and why
1. List any known issues or incomplete items
1. Ensure all new files are committed

### CHANGELOG.md Format

```markdown
## [Phase X] - YYYY-MM-DD

### Completed
- Task description

### Known Issues
- Issue description

### Deviations from Spec
- What changed and why

### Next Steps
- What the next session should pick up
```

-----

## Key Technical Decisions (Do Not Override)

These decisions are final. Do not change them without explicit instruction:

1. **React 18 + Vite** — not Next.js, not CRA, not vanilla JS
1. **PeerJS for networking** — not WebSocket server, not Firebase Realtime (yet)
1. **CSS Modules** — not Tailwind, not styled-components, not CSS-in-JS
1. **Context + useReducer** — not Redux, not Zustand, not MobX
1. **Vitest for testing** — not Jest, not Mocha
1. **D20 system** — `crypto.getRandomValues()`, never `Math.random()`
1. **Host-authoritative networking** — players never modify state directly
1. **Campaign-agnostic engine** — never hardcode Monster Hunt–specific logic into core engine
1. **Three GM drivers** — Human, Scripted, AI. All share the same interface.
1. **JSON save/resume** — not localStorage, not cloud (yet)

-----

## Common Mistakes to Avoid

- **Don't hardcode Tzorath.** The engine reads `enemies.boss` from the blueprint — it doesn't know or care that the boss is a reptilian creature. If you find yourself writing `if (boss.name === "Tzorath")`, you're doing it wrong.
- **Don't call APIs during gameplay.** The only time the Claude API is called is during pre-game campaign compilation. During runtime, everything is local computation.
- **Don't trust player-sent state.** Players send intents ("I want to attack"). The host validates and resolves. Never let a player message directly modify game state.
- **Don't use `Math.random()`.** Dice rolls must use `crypto.getRandomValues()` for fairness and unpredictability.
- **Don't put game logic in React components.** Components call engine functions and display results. The engine is pure JS with no React dependency.
- **Don't skip the blueprint.** Every number, every behavior, every piece of text comes from the Campaign Blueprint JSON. The engine is a blueprint interpreter, not a game.
