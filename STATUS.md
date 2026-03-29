# Mythwright V1 — Project Status

Browser-based tabletop game engine. React + Vite, PeerJS/WebRTC multiplayer, campaign blueprint system. Cooperative dungeon-crawl with boss antagonist controlled by AI/scripted/human GM drivers.

## Tech Stack
React 18, Vite, PeerJS/WebRTC, Vitest, Campaign JSON blueprints

## Completed Phases

### Phases 0-6: Core Engine
12 engine modules (DiceSystem, CombatResolver, CampaignLoader, ZoneManager, CharacterManager, InventoryManager, QuestManager, NarrativeEngine, SaveSystem, StateManager, GameLoop, EventBus), 4 views (Lobby, CharacterSelect, GameView, HostDashboard), PeerJS networking, 3 GM drivers (Human/Scripted/AI), campaign compiler. 259 unit tests.

### Phase 7: Code Review + 31 Bug Fixes
Full review of 43 source files. Fixed 17 critical issues (field mismatches, enum fragmentation, stale closures, missing validation, biased shuffle, peer identity) and 14 moderate/minor issues (broadcast debounce, dep arrays, error handling, driver fixes, compatibility).

### Phase 8: Integration Testing
104 new integration tests: GameLoop (35), Network (23), GMDrivers (46). Total: 395 tests passing.

### Phase 9: Playtest + UX Polish
Fixed 6 critical UX bugs (EncounterSplash visibility, CharacterSelect stuck, game-over dead end, evolution overlay lock, JoinGame race condition, save/load errors). Added DisconnectOverlay, useSoundEvents hook, Load Saved Game UI. Responsive breakpoints, hover/active states, animations.

## In Progress

### Phase 10: Spatial Gameplay + Action System
- Zone-based player/boss positioning with map tokens
- Boss movement: moves to ANY zone, hunts local mobs for power-ups (HP/damage/evolution)
- Action menu: Move, Attack, Search, Set Trap, Heal, Use Item, Flee
- Combat flow: hit rolls, damage rolls, defense, healing sequences
- Zone encounters with local mob stats
- Map: player tokens, boss token (visibility system), mob indicators, fog of war

## Stats
- Tests: 395 passing (291 unit + 104 integration)
- Build: clean (~1.3s)
- All phases committed and pushed to GitHub
