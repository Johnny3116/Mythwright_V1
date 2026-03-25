# Mythwright Changelog

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
