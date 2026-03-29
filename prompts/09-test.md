# Phase 8: Testing

**Role:** QA Engineer / Test Automation Specialist
**Dependencies:** All previous phases (0–7)

---

## Objective

Validate the Mythwright engine end-to-end through automated tests and a documented manual testing checklist. The goal is to confirm that the game loop, network synchronization, save/load persistence, and GM driver behaviors all work correctly against the Monster Hunt: Tzorath campaign blueprint.

---

## Automated Tests

All automated tests use **Vitest** and run via `npm test`.

### Unit Tests (already completed in Phase 7)

Residing in `tests/engine/` and `tests/network/`:

| Module | File |
|--------|------|
| DiceSystem | `tests/engine/DiceSystem.test.js` |
| CombatResolver | `tests/engine/CombatResolver.test.js` |
| BehaviorTree | `tests/engine/BehaviorTree.test.js` |
| EvolutionSystem | `tests/engine/EvolutionSystem.test.js` |
| TrapSystem | `tests/engine/TrapSystem.test.js` |
| WildlifeSystem | `tests/engine/WildlifeSystem.test.js` |
| FloraSystem | `tests/engine/FloraSystem.test.js` |
| RetreatSystem | `tests/engine/RetreatSystem.test.js` |
| StatusEffects | `tests/engine/StatusEffects.test.js` |
| BlueprintLoader | `tests/engine/BlueprintLoader.test.js` |
| TurnManager | `tests/engine/TurnManager.test.js` |
| GameEngine | `tests/engine/GameEngine.test.js` |
| PeerManager | `tests/network/PeerManager.test.js` |
| StateSync | `tests/network/StateSync.test.js` |
| MessageTypes | `tests/network/MessageTypes.test.js` |
| UI Components | `tests/views/components.test.jsx` |

### Integration Tests (added in Phase 8)

Residing in `tests/integration/`:

#### `gameLoop.test.js` — Full game loop integration
- State machine: `LOBBY → CHARACTER_SELECT → TURN_LOOP`
- `START_GAME` initializes turn order and boss at full HP
- 3-round combat: cumulative boss damage, narrative log growth, miss/hit differentiation
- Boss wins: all players dead → `GAME_OVER` with `winner: 'boss'`
- Players win: boss defeated at final stage → `GAME_OVER` with `winner: 'players'`
- Boss evolution: HP at retreat threshold → `isEvolving: true`, stage increments, HP recovery, narrative added
- Multi-player (4-player) setup and AOE/burrow actions

#### `saveLoad.test.js` — Persistence round-trip
- Serialize mid-game state to valid JSON
- JSON contains all required fields (`phase`, `round`, `boss`, `players`, `narrativeLog`)
- Deserialize and verify: game phase, round counter, boss HP/stage/alive, all player data, narrative log
- Resume gameplay after load: attacks work, win conditions trigger, double round-trip clean

#### `gmDrivers.test.js` — GM Driver interface compliance
- `ScriptedDriver`: factory shape, valid action for all 5 boss stages, idle on missing state, narrative for all triggers, `bossActionToDispatch` mapping (attack, aoe, multi, burrow, grab, dodge, unknown)
- `HumanDriver`: factory shape, promise lifecycle (pending while waiting, resolves on `triggerAction`, rejects on `destroy`), empty narrative (host writes their own), `humanActionToDispatch` mapping
- Cross-driver consistency: both return `{ action, target, params }` shapes; both map `attack → BOSS_ATTACK` with matching targetId

---

## Manual Testing Checklist

These tests require a running browser instance. Check each box when verified.

### Game Setup
- [ ] Load application (`npm run dev` or deployed URL)
- [ ] Lobby renders correctly with campaign upload and GM mode selector
- [ ] Upload `campaigns/monster-hunt-tzorath.json` — loads without errors
- [ ] Select GM mode: Scripted → Start Game (host flow)
- [ ] Open second tab → join via room code → character select renders

### Gameplay
- [ ] 3-player game from start to finish (Scripted mode, all stages reached)
- [ ] 4-player game with Human Host (manual boss control via GM Controls)
- [ ] All 5 boss stages reached and narratives displayed
- [ ] Every trap type (5 types) placed and triggered at least once
- [ ] Every zone visited by at least one player token
- [ ] Wildlife hunt roll occurs and buff is applied
- [ ] Flora searched successfully and healing applied
- [ ] Retreat mechanic used — all 4 outcomes observed across multiple attempts

### Network
- [ ] Player disconnect mid-game — reconnect → receives current state
- [ ] 3-4 simultaneous connections work without state drift

### Error Handling
- [ ] Upload invalid JSON → graceful error message (no crash)
- [ ] Upload valid JSON with missing required fields → validation error shown

### Save / Resume
- [ ] Save game mid-combat → download JSON file
- [ ] Reload page → upload saved JSON → game resumes at correct round and HP values
- [ ] Saved file is human-readable JSON (can be opened in a text editor)

---

## Known Caveats

- **Boss initial stage index:** `GameEngine.createInitialState()` initializes `boss.currentStage: 0` (array index), while `checkEvolutionThreshold` matches against the blueprint's 1-indexed `stage` field. Evolution cannot be triggered through the reducer from the initial state; it requires a `LOAD_STATE` with `currentStage: 1` first. This is an integration gap noted in Phase 8 but not changed to avoid scope creep.
- **AI Driver:** Requires a valid `VITE_CLAUDE_API_KEY` in `.env`. Falls back gracefully to Scripted when not available.
- **PeerJS:** Requires internet access for STUN servers. Tests using PeerManager run fully mocked (no real WebRTC).

---

## Running Tests

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Run only integration tests
npx vitest run tests/integration/
```
