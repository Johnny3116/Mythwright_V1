# Mythwright Changelog

## [Phase 6] - 2026-03-25

### Completed
- Updated `package.json` to v1.0.0 with full spec-compliant scripts (`test:coverage`, `lint`, `format`), description, and all required dev dependencies (`eslint`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `prettier`, `@vitest/coverage-v8`, `terser`)
- Updated `vite.config.js` with production build config: `manualChunks` (vendor/peer/engine), `target: es2020`, `sourcemap: false`, `minify: terser`, and Vitest coverage config
- Created `.eslintrc.cjs` with React 18 rules (no-prop-types, no-react-in-jsx-scope off, unused-vars as warning)
- Created `.prettierrc` with project formatting standards
- Created `vercel.json` with SPA rewrite rule
- Created `netlify.toml` with SPA redirect rule
- Added `import.meta.env.VITE_CLAUDE_API_KEY` reference in `CampaignCompiler.js` per spec
- Verified `tests/setup.js` and `.env.example` are correct
- `npm run build` produces clean output: vendor 51.87KB gzipped, zero errors
- `npm run test` exits cleanly
- `npm run lint` exits with warnings only (no errors) — all warnings are expected stubs

### Known Issues
- `peer` and `engine` manualChunks produce empty files (expected — those modules are stubs throwing `not yet implemented`)
- All engine, network, driver, and compiler modules still throw `not yet implemented` — to be built in Phases 2-5

### Deviations from Spec
- Added `terser` as explicit devDependency — required by Vite v3+ when `minify: 'terser'` is set (not listed in spec but necessary)
- `eslint v8` deprecation warnings are expected — spec calls for `^8.x` explicitly

### Next Steps
- Phase 1: Asset Pipeline — create SVG icon sets, font loading, D20 dice element, base component styling
- Phase 2: Game Engine — implement all 12 engine modules in dependency order

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
