# Prompt 05: Build Out Views & UI

## Context
Read `CLAUDE.md`, `PROJECT.md`, and `BUILD_WORKFLOW.md` before starting. Phases 0-3 must be complete.

## Role
Frontend Developer / UX Designer / Interaction Designer

## Objective
Build all 4 game views and finalize all shared UI components. The aesthetic is **dark fantasy** — moody, atmospheric, with parchment-like textures and glowing accents. Every view must use the theme CSS variables from `index.css` and CSS Modules for scoped styling.

## Design Direction
- **Theme:** Dark fantasy — deep blacks, warm amber accents, muted golds, crimson danger indicators
- **Typography:** Cinzel for headings/titles, Inter for body/UI, JetBrains Mono for numbers/stats
- **Atmosphere:** Subtle texture overlays, dim ambient glows, sharp borders with soft inner shadows
- **Interactions:** Smooth transitions (200-300ms), hover states on all interactive elements, scale animations on buttons
- **Layout:** Desktop-first (1280px minimum), single-page views with no scrolling during gameplay

---

## View 1: Lobby (`src/views/lobby/`)

### LobbyView.jsx
Parent container. Two modes: "Create Game" and "Join Game" — toggle between them.

### CreateGame.jsx
Host flow:
1. **Campaign Upload Area** — Large drag-drop zone accepting `.json` and `.md` files plus image files (`.png`, `.jpg`). Shows file name and validation status after upload. Parse JSON immediately and show success/error.
2. **Host Editor** — After upload, show an editable preview of the blueprint. Collapsible sections for: Meta, Classes, Enemies, Zones, Systems, Narrative. Each section shows key data in a readable format (not raw JSON). Host can edit values inline.
3. **GM Mode Selector** — Three cards: Human Host, Scripted, AI Driver. Selecting AI shows an API key input field. Selected mode has a glowing border.
4. **Turn Timer Toggle** — Switch to enable/disable turn timer. If enabled, show duration slider (30s-120s).
5. **Room Code Display** — Large, bold room code (6 chars) in a bordered box. "Copy" button. Appears after PeerJS room creation.
6. **Player List** — Shows connected players: name, selected class (if chosen), ready status (green dot). Host has a crown icon.
7. **Start Game Button** — Enabled only when: blueprint loaded + at least 3 players connected + all players ready. Pulsing glow when ready.

### JoinGame.jsx
Player flow:
1. **Name Input** — Text field for player name
2. **Room Code Input** — 6 character input with auto-uppercase, large monospace font
3. **Join Button** — Validates code format, attempts PeerJS connection, shows loading/error states
4. **Waiting State** — After joining, show: connected players list, host's campaign title, "Waiting for host to start..."

### CampaignUpload.jsx
Reusable upload component:
- Drag-drop zone with dashed border animation on hover
- File type validation (JSON, MD, PNG, JPG)
- Parse JSON on upload, show validation results
- Image preview thumbnails for uploaded zone art
- Error display for invalid files

### HostEditor.jsx
Blueprint editor:
- Accordion/collapsible sections for each blueprint area
- Inline editing for text values (click to edit, Enter to save)
- Number inputs with +/- steppers for stats
- Add/remove items in arrays (zones, trap types, etc.)
- Reset button to revert to uploaded original
- "Looks Good" confirmation button

---

## View 2: Character Select (`src/views/character/`)

### CharacterSelect.jsx
Class selection screen for all players:

1. **Class Cards** — One card per class from blueprint `classes[]`. Card shows:
   - Class icon (large, centered)
   - Class name (Cinzel font)
   - Stat bars: HP, Damage, Defense (visual bar + number)
   - Special Ability name and short description
   - "Select" button
   - Already-selected classes show the player name who chose them (dimmed, not selectable)

2. **Character Customization Panel** — After selecting a class:
   - Name input (pre-filled with player name from lobby)
   - Color picker (accent color for their token on the map)
   - Small avatar selection (3-4 silhouette options per class)

3. **Party Preview** — Side panel showing all players' selections:
   - Player name + class + ready status
   - "Waiting for [name] to choose..." for unselected players

4. **Ready Button** — Confirms selection, locks in choice, sends to host

5. **Host Controls** — Host sees "Start Adventure" button (appears when all players are ready)

---

## View 3: Game View (`src/views/game/`)

### GameView.jsx
The main gameplay screen. Layout:
```
┌─────────────────────────────────────────────────┐
│                Turn Order Bar                     │
├────────┬───────────────────────────┬─────────────┤
│        │                           │             │
│ Char   │       Zone Map            │  Narrator   │
│ Sheet  │       (center)            │  Feed       │
│        │                           │             │
│        │                           │             │
├────────┴───────────────────────────┴─────────────┤
│              Action Panel + Dice Roller            │
└───────────────────────────────────────────────────┘
```

### ZoneMap.jsx
Interactive map with an **isometric perspective** — the game board should feel like a physical tabletop:
- **Isometric grid layout**: Zones arranged in a tilted top-down view (CSS transform: `rotateX(60deg) rotateZ(45deg)` or similar isometric projection). Start with a simpler 2D isometric *feel* using diamond-shaped zone tiles if full 3D is too complex for v1.
- Zones rendered as **elevated tile cards** with subtle shadow and depth — not flat circles
- Zone name displayed on each tile, with the zone's uploaded image (or gradient fallback) as background
- Lines/paths connecting adjacent zones (from `connectedZones[]`) rendered as roads or trails
- **Player tokens** — colored circular bases with class icon on top (like miniature figurines on stands, matching the reference screenshots). Each token has the player's chosen color as the base ring.
- **Boss token** — larger token with skull/monster icon, red base ring. Hidden if burrowed/fled, shown with "?" if location unknown.
- **Floating damage numbers** — when combat resolves on a zone, `FloatingDamage` component renders damage/healing numbers above the affected token. Numbers pop up, float upward, and fade out.
- **Trap indicators** — small gear icons on zones with active traps
- **Flora indicators** — small plant icons on zones with spawned plants
- Click a zone to see ZoneCard popup with full details
- Fog of war (optional): unexplored zones are darker/grayed with "?" overlay
- Animate token movement on zone change (token slides along the path between zones)
- **Movement range indicator**: When player selects "Move," highlight reachable zones with a glow

### ActionPanel.jsx
Context-sensitive action buttons for the current player's turn:
- **Attack** (sword icon) — available if in same zone as enemy
- **Use Ability** (lightning icon) — shows ability name, available if not on cooldown
- **Set Trap** (trap icon) — opens trap selection sub-menu
- **Move** (boot icon) — opens connected zones selection
- **Retreat** (boot + arrow icon) — available in combat zones
- **Search Flora** (plant icon) — available if flora spawned in zone
- **Use Item** (pouch icon) — opens inventory
- **End Turn** (clock icon) — skip remaining actions
- Disabled state for unavailable actions (grayed out, no pointer)
- Only visible/interactive during the current player's turn

### CharacterSheet.jsx
Left sidebar showing current player's character:
- Character name and class icon
- HP bar (HealthBar component)
- Base stats: Damage, Defense
- Special ability with cooldown indicator
- Active status effects (icons with remaining duration)
- Inventory (trap items, healing items)
- Current zone name

### NarratorFeed.jsx
Right sidebar with scrolling game narrative:
- Typewriter effect for new entries
- Color-coded entries: narrative (amber), combat (red), healing (green), system (gray)
- Auto-scroll to latest
- Scrollable history
- Timestamps on each entry

### TurnTracker.jsx
Top bar showing turn order — modeled after tabletop RPG initiative bars:
- All player portraits + boss portrait displayed in **D20-shaped hexagonal frames**
- Each frame has a **colored border** matching the player's chosen color
- **Initiative roll number** displayed below each portrait (rolled at encounter start)
- Active entity has **glowing animated border** (pulse effect)
- Dead entities grayed out with skull overlay
- Round counter: "Round 3" displayed at the right end
- Turn timer (if enabled): countdown bar below the tracker
- Smooth slide animation when turn advances to next entity

---

## View 4: Host View (`src/views/host/`)

### HostView.jsx
Everything from GameView plus DM overlay panels:

### MonsterPanel.jsx
Boss information (host-only visibility):
- Boss name and current stage name
- Full HP bar with exact numbers
- Current stats: Damage, Defense
- Active special traits for current stage
- Behavior queue: what the boss will do next (from BehaviorTree)
- Evolution progress: HP threshold indicators per stage

### PlayerOverview.jsx
All player info at a glance:
- Card per player: name, class, HP bar, current zone, active effects
- Danger indicators: flash if player HP < 30%
- Dead players shown with skull overlay

### GMControls.jsx
Host control buttons:
- **Advance Story** — trigger next narrative beat
- **Override Dice** — input a specific roll value for next roll
- **Trigger Event** — dropdown: force evolution, spawn wildlife, spawn flora
- **Skip Turn** — skip current entity's turn
- **Pause Game** — freeze turn progression
- **End Game** — force game over (win or lose selection)

### DriverToggle.jsx
Switch between GM modes mid-game:
- Three toggle buttons: Human / Scripted / AI
- If switching to AI, show API key input if not already set
- Confirmation dialog: "Switch to Scripted mode? The engine will auto-resolve boss turns."
- Current mode indicator (glowing border)

---

## Shared Components (finalize from Phase 1 shells)

### DiceRoller.jsx
**Large, dramatic D20 roller — the centerpiece of every action.** This is NOT a small sidebar widget.
The dice roll should feel *weighty* and cinematic, like the reference game screenshots:

- **Full-screen overlay** that dims the background when rolling
- **Large 3D CSS D20** (or Three.js if feasible) — minimum 200px, centered on screen
- Rolling state: dice tumbles with physics-like rotation for 1.5-2s, numbers blur across faces
- **Camera shake / screen pulse** effect on impact (subtle CSS transform)
- Result state: dice settles, number displayed large with dramatic reveal:
  - 1-5: Red glow + "MISS" text + screen briefly tints red
  - 6-15: White flash + number + subtle sparkle
  - 16-19: Gold flash + "HIT!" text + gold particles
  - 20: Bright gold burst + "CRITICAL!" text + screen flash + particle explosion
  - 1 (natural 1): Extra dramatic red — "FUMBLE!" 
- Modifier display: "+2 zone bonus" shown below result in smaller text
- Roll lingers on screen for 1.5s after settling so players can react
- Sound-ready hooks (`onRollStart`, `onRollEnd`, `onResult` callbacks)
- **Initiative mode**: When rolling initiative at encounter start, show all players' rolls simultaneously in a row (like the reference: D20 icons with numbers below each portrait)

### FloatingDamage.jsx
**Floating damage numbers** that appear over tokens on the zone map:
- Number pops up at token position, floats upward, and fades out over 1.5s
- Color-coded: red for damage taken, green for healing, white for status effects
- Critical hits show larger numbers with gold color and a brief "burst" animation
- Multiple numbers can stack if several effects resolve at once (staggered slightly)
- CSS animation: `translateY(-60px)` + `opacity: 0` over 1.5s with ease-out
- Miss shows "MISS" text in gray, floating up and fading

### EncounterSplash.jsx
**Cinematic encounter transition screen** — plays when combat begins:
- Full-screen dark overlay with dramatic fade-in
- Crossed swords icon with D20 in center (SVG)
- "ENCOUNTER" text in bold display font (Cinzel), animated with letter-spacing reveal
- Red horizontal line accent (like the reference screenshot)
- Holds for 2 seconds, then fades out to reveal the combat view
- Also used for: "EVOLUTION" (boss stage change), "VICTORY", "DEFEAT"
- Each variant has different icon, color accent, and text

### All other components from Phase 1
Finalize with real styling, animations, and interactivity:
- `HealthBar`, `StatCard`, `ActionButton`, `Modal`, `NarratorBox`, `TurnOrderBar`, `ZoneCard`
- `FloatingDamage` — damage/healing numbers floating above tokens
- `EncounterSplash` — cinematic transition overlays (ENCOUNTER, EVOLUTION, VICTORY, DEFEAT)

---

## React Context & Hooks

### GameContext.jsx
```jsx
// Provides game state to all components
// State: { blueprint, gameState, myPlayerId, isHost, currentView }
// Actions: dispatch player actions to engine (or network)
```

### NetworkContext.jsx
```jsx
// Provides network connection info
// State: { connected, roomCode, players[], latency, isHost }
// Actions: create room, join room, send message
```

### Custom Hooks
- `useGameEngine()` — access game state, dispatch actions
- `usePeerConnection()` — access network state, send/receive
- `useDiceRoll()` — trigger roll, get result with animation timing
- `useTurnManager()` — current turn, available actions, is my turn

---

## Acceptance Criteria
- [ ] **Lobby:** Upload JSON → edit in Host Editor → select GM mode → create room → show code → players join → all ready → start game
- [ ] **Character Select:** All classes display from blueprint → selection locks → party preview updates → host starts
- [ ] **Game:** Zone map renders all 10 zones with isometric-style layout → tokens show player/boss positions with colored bases → action panel shows correct actions → narrator feed scrolls
- [ ] **Host:** Monster panel shows boss stats → player overview shows all players → GM controls trigger engine actions → driver toggle switches modes
- [ ] **DiceRoller:** Large center-screen D20 with dramatic roll animation → result reveal with color-coded flash (miss=red, hit=white, crit=gold) → lingers on screen 1.5s → initiative mode shows all rolls in a row
- [ ] **FloatingDamage:** Damage numbers pop up above tokens → float upward and fade → color-coded (red damage, green healing, gray miss) → crits show larger gold numbers
- [ ] **EncounterSplash:** "ENCOUNTER" transition plays with crossed-swords icon → holds 2s → fades to combat → also works for "EVOLUTION", "VICTORY", "DEFEAT" variants
- [ ] **TurnTracker:** Portraits in D20-shaped frames → colored borders per player → initiative roll numbers below each portrait → active entity has glowing pulse → smooth slide on turn advance
- [ ] All views use theme CSS variables (zero hardcoded colors)
- [ ] All views render correctly at 1280px width
- [ ] Dark theme is consistent across all views
- [ ] All interactive elements have hover/active states
- [ ] Transitions between views are smooth (fade or slide)

## Output
Commit with message: `feat: all views and UI components (Phase 4)`
