# Mythwright — Project Specification

## Overview

Mythwright is a universal browser-based tabletop game engine. It reads structured campaign data (Campaign Blueprints) and renders a fully interactive, multiplayer game session with combat, exploration, narrative, and strategic mechanics.

The engine is **campaign-agnostic** — the same codebase runs any genre (monster hunt, dungeon crawl, sci-fi survival, horror investigation) by swapping the blueprint JSON.

---

## Architecture

### Two-Phase Design

**Phase 1: Pre-Game (AI-Powered, Optional)**
- Host uploads campaign data (JSON/Markdown + images)
- Campaign Compiler (Claude API) validates, balances, and expands the data into a full Session Blueprint
- Host reviews and edits the compiled blueprint in the Host Editor
- Output: A complete, self-contained JSON blueprint

**Phase 2: Runtime (Pure Code, No AI)**
- Game engine reads the blueprint and executes deterministically
- All combat, movement, events, and monster behavior resolved locally via state machines
- D20 rolls use local RNG (cryptographically random via `crypto.getRandomValues`)
- PeerJS syncs game state between host and player devices
- Zero API calls during gameplay (unless AI Driver mode is active)

### GM Driver System

The Game Master is a **pluggable driver interface**. Three implementations share the same engine API:

**Human Host Driver**
- Host sees full DM view (all monster HP, hidden loot, upcoming events)
- Manual control: trigger boss actions, pick targets, advance story, override dice
- Can pause, rewind, or skip encounters
- Best for: traditional tabletop feel

**Scripted Driver**
- Engine auto-resolves all non-player turns using blueprint data
- Monster targeting: configurable (random, lowest-HP, highest-damage-dealt)
- Narrative text pulled from blueprint `narrative` block
- Story auto-advances with "Continue" button between major beats
- Best for: quick sessions, playtesting, no dedicated GM

**AI Driver**
- Accepts an API key (Claude, OpenAI, or compatible endpoint)
- AI reads current game state each non-player turn
- Generates dynamic narrative, makes tactical boss decisions, improvises NPC dialogue
- Falls back to Scripted behavior if API call fails
- Best for: dynamic storytelling without a human GM

---

## Campaign Blueprint Schema

Every game is defined by a single JSON file. The schema has 8 top-level sections:

### `meta`
Campaign metadata — title, description, genre tag, player count range, estimated duration, author, version, supported GM modes, and image asset references.

### `settings`
Global game settings — dice type (d20, d12, d6, etc.), turn timer config, combat system type, hit/miss/crit roll ranges, and critical hit multiplier.

### `classes[]`
Array of playable character classes. Each class defines:
- `id` — Unique identifier
- `name` — Display name
- `icon` — Emoji or icon reference
- `baseStats` — HP, damage range [min, max], defense
- `specialAbility` — Name, description, trigger condition, effect (type, value, duration, target)

### `enemies`
Enemy definitions. Supports two structures:
- `enemies.boss` — Single escalating enemy with `stages[]` array (Monster Hunt style)
- `enemies.encounters[]` — Array of distinct encounters (D&D dungeon style)

Each enemy/stage defines: HP, damage, defense, special traits, behavior tree (dodge chance, burrow, grab, AOE, retreat actions, target zone).

### `zones[]`
Map locations. Each zone defines:
- `id`, `name`, `subtitle`, `description`, `image`
- `retreatModifier` — Bonus/penalty to escape rolls
- `trapBonus` — Zone-specific trap enhancement
- `connectedZones[]` — Adjacency list for traversal
- `wildlife` — Resident creature with boss interaction effects and player attack chance
- `flora` — Healing plant spawn weight

### `systems`
Modular game mechanics. Each system has an `enabled` flag so blueprints can opt in/out:
- **traps** — Trap types with setup rolls, damage, effects, escape chances
- **wildlife** — Boss hunting behavior, player intervention rules
- **flora** — Healing plant types, spawn/search rolls, respawn interval
- **retreat** — Escape roll outcomes, zone modifiers

Custom systems can be added for new campaign types (e.g., `systems.spellcasting`, `systems.stealth`, `systems.crafting`).

### `narrative`
All pre-written text content:
- `intro` — Opening crawl / mission briefing
- `missionBriefing` — Structured target/location/threat info
- `objective` — One-line mission goal
- `warnings[]` — Dramatic warning text
- `bossEvolutionNarrative` — Keyed text for each stage transition
- `victoryText` / `defeatText` — Endgame messages
- Zone descriptions are stored in each zone's `description` field

### `winConditions[]` / `loseConditions[]`
Array of condition objects. Types:
- `bossDefeated` — Boss reaches 0 HP at specified stage
- `allPlayersDead` — All player HP reaches 0
- `bossReachesFinalForm` — Boss evolves to max stage (optional lose condition)
- Extensible: `turnLimitReached`, `objectiveCompleted`, `escapeSuccessful`, etc.

---

## Game Engine Architecture

### State Machine

The core game loop is a finite state machine with these states:

```
LOBBY → CHARACTER_SELECT → GAME_SETUP → TURN_LOOP → GAME_OVER
                                            │
                                    ┌───────┴────────┐
                                    │   TURN_LOOP    │
                                    │                │
                                    │  PLAYER_TURN   │
                                    │       ↓        │
                                    │  BOSS_TURN     │
                                    │       ↓        │
                                    │  ENVIRONMENT   │
                                    │       ↓        │
                                    │  CHECK_WIN     │
                                    │       ↓        │
                                    │  NEXT_ROUND    │
                                    └────────────────┘
```

### Turn Resolution

**Player Turn:**
1. Active player selects action: Attack, Use Ability, Set Trap, Use Item, Move, Retreat, Search Flora
2. D20 roll animates on screen
3. Engine resolves action against blueprint rules
4. State updates broadcast to all peers
5. Turn passes to next player (or boss if all players have acted)

**Boss Turn (Scripted/AI):**
1. GM Driver selects boss action based on current stage behavior tree
2. Target selection: random (default), lowest-HP, highest-threat, or AI-chosen
3. D20 roll resolves hit/miss/lethal
4. Damage applied, status effects processed
5. Evolution check: if HP ≤ retreat threshold → trigger evolution sequence
6. State broadcast

**Environment Phase:**
1. Wildlife spawn/hunt check per zone
2. Flora relocation (every N turns per blueprint)
3. Trap trigger check (if boss entered a trapped zone)
4. Status effect tick (poison, bleed, slow expiration)
5. Round counter increment

### Combat Resolver

Pure function: `resolveCombat(attacker, defender, roll, settings) → CombatResult`

- Reads hit ranges from `settings.hitRanges`
- Applies attacker damage range (random within [min, max])
- Subtracts defender defense
- Applies modifiers (critical multiplier, zone bonuses, status effects)
- Returns: `{ hit: boolean, critical: boolean, damage: number, effectsApplied: [], narrative: string }`

### D20 System

- Uses `crypto.getRandomValues()` for fair, unpredictable rolls
- Animated 3D CSS dice or canvas-based dice roller
- Roll history logged per session
- Modifier stacking: zone modifier + status modifier + ability modifier

---

## Networking (PeerJS / WebRTC)

### Connection Flow
1. Host clicks "Create Game" → PeerJS generates a room ID
2. Host shares room code (displayed on screen, copyable)
3. Players enter code on join screen → WebRTC peer connection established
4. Host is the **authoritative source of truth** — all state changes originate from host
5. Players send **action intents** (e.g., "I attack Tzorath") → Host validates and resolves → broadcasts result

### State Sync Protocol
- Game state is a single serializable JSON object
- On any state change, host sends full state snapshot to all peers
- Delta compression optional for optimization later
- Heartbeat every 5s to detect disconnects
- Auto-reconnect with state catch-up

### Message Types
```
HOST_STATE_UPDATE    → Full game state broadcast
PLAYER_ACTION        → Player submits their turn action
PLAYER_JOIN          → New player connects
PLAYER_DISCONNECT    → Player loses connection
CHAT_MESSAGE         → In-game text chat (optional)
HOST_OVERRIDE        → Host manually changes state (Human Driver)
DICE_ROLL_RESULT     → Animated roll result sync
```

---

## UI Architecture

### Views

**Lobby View** (`/lobby`)
- Create Game / Join Game toggle
- Campaign upload (drag-drop JSON/MD + images)
- Host Editor: edit blueprint before starting
- Room code display + player list
- GM mode selector (Human / Scripted / AI + key input)
- Start Game button (host only)

**Character Select View** (`/character-select`)
- Class cards with stats and ability previews
- Light customization (name, icon/color)
- Ready-up system
- Pre-uploaded character support (from blueprint)

**Game View** (`/game`)
- **Zone Map** (center): Interactive map showing zones, player positions, boss position, fog of war
- **Action Panel** (bottom): Available actions for current turn, D20 roll button
- **Character Sheet** (left sidebar): Current player's stats, inventory, status effects
- **Narrator Feed** (top): Scrolling narrative text, event log
- **Turn Tracker** (top bar): Turn order, active player highlight, round counter, timer (if enabled)

**Host View** (`/host`)
- Everything in Game View plus:
- **Monster Stats Panel**: Full HP bar, current stage, behavior queue
- **All Player Stats**: HP, status, position for every player
- **GM Controls**: Advance story, override dice, trigger events, skip turns
- **Driver Toggle**: Switch between Human/Scripted/AI mid-game
- **Upcoming Events**: Next evolution threshold, pending trap triggers, flora spawns

### Shared Components
- `DiceRoller` — Animated D20 with result display
- `StatCard` — Reusable HP/DMG/DEF display
- `ZoneCard` — Zone info popup with modifiers and wildlife
- `NarratorBox` — Scrolling text feed with typewriter effect
- `TurnOrderBar` — Horizontal turn tracker
- `HealthBar` — Animated HP bar with color transitions
- `ActionButton` — Context-aware action buttons
- `Modal` — Confirmation dialogs, trap placement, item use

---

## Theming

The UI uses CSS custom properties for theming. The base theme is dark fantasy (matching Monster Hunt), but themes are swappable per campaign via a `theme` field in the blueprint `meta`:

```css
:root {
  --bg-primary: #0a0a0f;
  --bg-secondary: #12121a;
  --bg-tertiary: #1a1a25;
  --text-primary: #e8e6e0;
  --text-secondary: #9a9890;
  --accent-primary: #c74a38;
  --accent-secondary: #d4a843;
  --accent-success: #4a9e6a;
  --accent-danger: #c74a38;
  --accent-info: #4a7ec7;
  --border-color: #2a2a35;
  --font-display: 'Cinzel', serif;
  --font-body: 'Inter', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}
```

---

## File Structure

```
mythwright/
├── public/
│   ├── assets/
│   │   ├── icons/              ← Class icons, UI icons
│   │   ├── zones/              ← Zone background images
│   │   ├── enemies/            ← Boss/enemy artwork
│   │   └── ui/                 ← Dice textures, borders, frames
│   ├── fonts/                  ← Self-hosted fonts
│   └── index.html
├── src/
│   ├── engine/
│   │   ├── GameEngine.js       ← Core state machine and game loop
│   │   ├── CombatResolver.js   ← Pure combat resolution function
│   │   ├── DiceSystem.js       ← D20 roll logic with crypto RNG
│   │   ├── BehaviorTree.js     ← Monster AI state machine
│   │   ├── TurnManager.js      ← Turn order, phase cycling
│   │   ├── EvolutionSystem.js  ← Boss stage transitions
│   │   ├── TrapSystem.js       ← Trap placement and trigger logic
│   │   ├── WildlifeSystem.js   ← Wildlife spawn, hunt, and combat
│   │   ├── FloraSystem.js      ← Healing plant spawn and search
│   │   ├── RetreatSystem.js    ← Player escape resolution
│   │   ├── StatusEffects.js    ← Poison, bleed, slow, shield tracking
│   │   └── BlueprintLoader.js  ← Validates and parses campaign JSON
│   ├── network/
│   │   ├── PeerManager.js      ← PeerJS connection setup and room management
│   │   ├── StateSync.js        ← Game state broadcast and reconciliation
│   │   ├── MessageTypes.js     ← Message type constants and schemas
│   │   └── Reconnect.js        ← Disconnect detection and auto-reconnect
│   ├── drivers/
│   │   ├── DriverInterface.js  ← Abstract GM driver interface
│   │   ├── HumanDriver.js      ← Human host implementation
│   │   ├── ScriptedDriver.js   ← Automated blueprint-driven implementation
│   │   └── AIDriver.js         ← LLM-powered implementation
│   ├── views/
│   │   ├── lobby/
│   │   │   ├── LobbyView.jsx
│   │   │   ├── CreateGame.jsx
│   │   │   ├── JoinGame.jsx
│   │   │   ├── CampaignUpload.jsx
│   │   │   ├── HostEditor.jsx
│   │   │   └── lobby.module.css
│   │   ├── character/
│   │   │   ├── CharacterSelect.jsx
│   │   │   ├── ClassCard.jsx
│   │   │   ├── CharacterCustomize.jsx
│   │   │   └── character.module.css
│   │   ├── game/
│   │   │   ├── GameView.jsx
│   │   │   ├── ZoneMap.jsx
│   │   │   ├── ActionPanel.jsx
│   │   │   ├── CharacterSheet.jsx
│   │   │   ├── NarratorFeed.jsx
│   │   │   ├── TurnTracker.jsx
│   │   │   └── game.module.css
│   │   └── host/
│   │       ├── HostView.jsx
│   │       ├── MonsterPanel.jsx
│   │       ├── PlayerOverview.jsx
│   │       ├── GMControls.jsx
│   │       ├── DriverToggle.jsx
│   │       └── host.module.css
│   ├── compiler/
│   │   ├── CampaignCompiler.js ← Claude API integration for blueprint generation
│   │   ├── BlueprintValidator.js ← Schema validation
│   │   └── NarrativeGenerator.js ← AI narrative expansion
│   ├── components/
│   │   ├── DiceRoller.jsx
│   │   ├── StatCard.jsx
│   │   ├── ZoneCard.jsx
│   │   ├── NarratorBox.jsx
│   │   ├── TurnOrderBar.jsx
│   │   ├── HealthBar.jsx
│   │   ├── ActionButton.jsx
│   │   ├── Modal.jsx
│   │   └── components.module.css
│   ├── hooks/
│   │   ├── useGameEngine.js
│   │   ├── usePeerConnection.js
│   │   ├── useDiceRoll.js
│   │   └── useTurnManager.js
│   ├── context/
│   │   ├── GameContext.jsx
│   │   └── NetworkContext.jsx
│   ├── utils/
│   │   ├── constants.js
│   │   ├── helpers.js
│   │   └── theme.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── campaigns/
│   └── monster-hunt-tzorath.json
├── prompts/                     ← Claude Code build prompts
│   ├── 01-scaffold.md
│   ├── 02-assets.md
│   ├── 03-engine.md
│   ├── 04-network.md
│   ├── 05-views.md
│   ├── 06-campaign-engine.md
│   ├── 07-package.md
│   ├── 08-code-review.md
│   └── 09-test.md
├── tests/
│   ├── engine/
│   ├── network/
│   └── views/
├── CLAUDE.md
├── PROJECT.md
├── BUILD_WORKFLOW.md
├── package.json
├── vite.config.js
├── .gitignore
└── README.md
```

---

## Save / Resume

### JSON Export
- Host can export full game state at any time
- Exported file contains: blueprint reference, all player states, boss state, zone states, turn counter, trap placements, event log, RNG seed
- File named: `mythwright-save-{campaignId}-{timestamp}.json`

### JSON Import
- Host uploads save file on lobby screen
- Engine validates save against blueprint version
- Session resumes at exact saved state
- Players reconnect and receive state catch-up

### Future: Cloud Saves
- Firebase Realtime Database or Supabase
- Room persistence across browser closes
- Async play support (take turns over hours/days)

---

## Performance Targets

- **Initial load**: < 3 seconds on broadband
- **Turn resolution**: < 100ms (local computation)
- **State sync**: < 200ms (PeerJS over LAN), < 500ms (over internet)
- **Dice animation**: 1.5-2 seconds
- **Memory**: < 50MB baseline (excluding loaded images)
- **Bundle size**: < 500KB gzipped (excluding campaign assets)
