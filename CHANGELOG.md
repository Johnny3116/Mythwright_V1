# Mythwright Changelog

## [Phase 1] - 2026-03-25

### Completed
- Created 4 SVG class icons: assault (crossed swords), trapper (gear/cog), medic (cross), support (shield) — viewBox 0 0 48 48, currentColor fill
- Created 12 SVG UI icons: sword, shield, heart, d20, trap, plant, skull, boot, eye, lightning, clock, users
- Verified font loading: Cinzel, Inter, JetBrains Mono via Google Fonts with display=swap in index.html
- Built DiceRoller.jsx: animated D20 with idle/rolling/revealing/done states, shuffle numbers during roll, color-coded result (miss=red, hit=green, critical=gold)
- Built HealthBar.jsx: animated width transition, green→yellow→red color thresholds, size variants (sm/md/lg), accessible progressbar role
- Built StatCard.jsx: icon + label + value layout, optional +/- modifier indicator
- Built ActionButton.jsx: icon support, 4 variants (primary/secondary/danger/ghost), 3 sizes, hover scale animation
- Built Modal.jsx: backdrop overlay, Escape key close, scroll lock, entrance animation, footer actions[]
- Built NarratorBox.jsx: typewriter animation on newest message, auto-scroll to bottom, timestamp display
- Built TurnOrderBar.jsx: horizontal entity list, active glow animation, dead state grayscale
- Built ZoneCard.jsx: zone info popup with wildlife, active traps, connected zones, retreat modifier
- Rewrote components.module.css: full styles for all components + 8 keyframe animations (fadeIn, fadeInScale, slideUp, slideDown, pulse, shimmer, diceRoll, glowPulse, turnGlow)
- Created 10 zone placeholder SVGs with distinct visual identities (jungle, canopy, cliffs, grotto, swamp, wastes, hollow, basin, storm ridge, ancient throne)
- `npm run build` and `npm run test` both pass clean

### Known Issues
- None

### Deviations from Spec
- None. All CSS uses theme variables, no hardcoded colors.

### Next Steps
- Phase 2: Game Engine — implement all 12 engine modules (DiceSystem, CombatResolver, etc.) in dependency order

## [Phase 0] - 2026-03-25

### Completed
- Initialized Vite + React 18 project with `type: module`
- Created full folder structure per `PROJECT.md` specification
- Set up path aliases in `vite.config.js` (`@engine`, `@views`, `@components`, `@network`, `@drivers`, `@hooks`, `@context`, `@utils`, `@compiler`)
- Configured Vitest with jsdom environment and `passWithNoTests: true`
- Created all 12 engine module stubs in `src/engine/` with JSDoc signatures
- Created all 4 network module stubs in `src/network/`
- Created all 3 GM driver stubs in `src/drivers/` plus `DriverInterface.js`
- Created all 3 compiler module stubs in `src/compiler/`
- Created all 4 view directories with placeholder components and CSS modules
- Created all 8 shared components in `src/components/`
- Created all 4 hooks in `src/hooks/`
- Created `GameContext.jsx` and `NetworkContext.jsx` in `src/context/`
- Created `constants.js`, `helpers.js`, `theme.js` in `src/utils/`
- Set up React Router v6 with routes: `/` (Lobby), `/character-select`, `/game`, `/host`
- Created full dark fantasy theme CSS in `src/index.css` with all CSS custom properties, reset, scrollbar styling
- Created `public/assets/` directory tree (icons, zones, enemies, ui) and `public/fonts/`
- Created `tests/` directory with subdirectories for engine, network, views
- Copied `campaigns/monster-hunt-tzorath.json` campaign blueprint
- Created placeholder `prompts/` directory with all 9 phase prompt files
- Added `PROJECT.md` and `BUILD_WORKFLOW.md`
- Added `.env.example` with `VITE_CLAUDE_API_KEY`
- `npm run build` produces clean static bundle (~163KB JS, 53KB gzipped)
- `npm run test` exits cleanly (no tests yet, `passWithNoTests: true`)

### Known Issues
- `npm run dev` not directly verified (no browser environment in build context), but `npm run build` confirms Vite processes all modules correctly
- All engine, network, driver, and compiler modules throw `not yet implemented` errors — to be built in Phases 2-5

### Deviations from Spec
- None. All decisions match `PROJECT.md` exactly.

### Next Steps
- Phase 1: Asset Pipeline — create SVG icon sets, font loading, D20 dice element, base component styling
- Phase 2: Game Engine — implement all 12 engine modules in dependency order
