# Mythwright

**Universal AI-Compiled Tabletop Game Engine**

Mythwright is a browser-based tabletop game engine that transforms campaign data into fully playable sessions. Feed it a story, enemies, zones, and mechanics — Mythwright compiles them into a living game board that 3-4 players can experience together in real time.

No servers. No subscriptions. No AI dependency during gameplay. Just your campaign blueprint, your friends, and a browser.

-----

## How It Works

### 1. Write Your Campaign

Define your world in a structured JSON or Markdown file — story, zones, enemies, classes, items, mechanics. Every game is a **Campaign Blueprint**: a self-contained data contract that tells the engine everything it needs to run your session.

### 2. Compile It

Upload your blueprint to Mythwright. The **Campaign Compiler** (powered by Claude API) validates your data, generates missing narrative, balances encounters, and outputs a complete session-ready blueprint. Or skip the AI entirely and hand-craft every detail yourself.

### 3. Host a Session

Create a room. Share the code. Players join from their own devices via peer-to-peer WebRTC — no server infrastructure required. The host controls pacing, the engine handles the rest.

### 4. Play

Players pick classes, customize characters, and dive in. Combat resolves through animated D20 rolls. Monsters operate on deterministic state machines. The map reveals zones as the party moves through them. Every mechanic runs locally — no API calls, no latency, no surprises.

-----

## Three GM Modes

Mythwright supports three interchangeable Game Master drivers. Same engine, same UI — different brains behind the curtain:

|Mode          |How It Works                                                                                          |Best For                                     |
|--------------|------------------------------------------------------------------------------------------------------|---------------------------------------------|
|**Human Host**|Full DM control — manually trigger boss actions, advance story, override anything                     |Traditional tabletop feel with a dedicated GM|
|**Scripted**  |Engine auto-resolves all non-player actions using state machines + blueprint data                     |Quick sessions, solo testing, no GM needed   |
|**AI Driver** |Plug in an API key (Claude, OpenAI, etc.) — AI narrates, improvises, and makes tactical boss decisions|Dynamic storytelling without a human GM      |

-----

## First Campaign: Monster Hunt — Tzorath the Ancient

*Hunt an evolving reptilian predator across the hostile jungles of Zarkona.*

Mythwright ships with its first complete campaign blueprint as a playable demo and reference implementation.

### The Premise

A monstrous predator is tearing through outposts on the alien world of Zarkona. Your squad of 3-4 hunters must track, trap, and terminate the creature before it evolves into its final, unstoppable form.

### The Target

**Tzorath the Ancient, Wrath of the Jungle** — an adaptive reptilian creature that evolves through 5 stages, growing stronger with each transformation. At Stage 1 it's fast and evasive. By Final Form, it attacks every player simultaneously and cannot retreat.

### 10 Explorable Zones

Each zone has unique terrain modifiers, resident wildlife, healing flora, and strategic advantages for trap placement:

- **Verdant Maw** — Dense jungle entrance (+2 retreat modifier)
- **Razorback Canopy** — Towering treetops for the agile
- **Shattered Cliffs** — Brutal rocky terrain
- **Obsidian Grotto** — Dark caves with bioluminescent fungi
- **Sunken Veil** — Fog-covered swamp
- **Echoing Wastes** — Barren wasteland with massive footprints
- **Serpent's Hollow** — Twisting root maze, ambush territory
- **Devourer's Basin** — River valley with quicksand and ruins
- **Howling Crest** — Storm-ravaged mountain ridge
- **Tzorath's Throne** — The final lair. No retreat. No traps. Fight to the death.

### 4 Hunter Classes

|Class  |HP |Damage|Defense|Special Ability                       |
|-------|---|------|-------|--------------------------------------|
|Assault|120|20-30 |10     |+50% damage after 3 consecutive hits  |
|Trapper|100|15-25 |15     |Snare monster for 1 turn              |
|Medic  |90 |10-15 |10     |Heal teammate 25 HP per turn          |
|Support|110|10-20 |20     |Deploy shield, -50% damage for 2 turns|

### Interlocking Systems

- **Boss Evolution** — Tzorath evolves through 5 stages with increasing HP, damage, defense, and unique abilities per stage
- **Trap System** — 5 trap types with setup rolls, zone bonuses, and escape mechanics
- **Wildlife Ecology** — Zone creatures that Tzorath can hunt to gain power, or that may attack players
- **Mystical Flora** — Healing plants that spawn randomly and relocate every 3 turns
- **Retreat System** — Risk/reward escape mechanic with D20 outcomes and zone modifiers

-----

## Campaign Blueprint Schema

Every Mythwright game is defined by a single JSON file called a **Campaign Blueprint**. The schema is designed to be genre-agnostic — the same engine that runs a monster hunt can run a D&D dungeon crawl, a sci-fi survival mission, or a horror investigation.

See `campaigns/monster-hunt-tzorath.json` for the complete reference implementation.

### Blueprint Structure

```
meta            → Title, description, player count, GM modes, images
settings        → Dice type, combat system, hit ranges, timers
classes[]       → Playable classes with stats and special abilities
enemies         → Boss/encounter definitions with stages and behavior trees
zones[]         → Map locations with modifiers, wildlife, flora, connections
systems         → Trap, wildlife, flora, retreat, and custom mechanic definitions
narrative       → Story text, briefings, evolution descriptions, victory/defeat
winConditions   → What triggers a win
loseConditions  → What triggers a loss
```

-----

## Tech Stack

- **Frontend**: React 18 + Vite
- **Styling**: CSS Modules with CSS custom properties for theming
- **Networking**: PeerJS (WebRTC peer-to-peer) — no server needed
- **Game Engine**: Custom state machine with deterministic D20 RNG
- **Campaign Compiler**: Claude API (pre-game only, optional)
- **Save/Resume**: JSON export/import
- **Deployment**: Static site — GitHub Pages, Vercel, or Netlify

-----

## Getting Started

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/mythwright.git
cd mythwright

# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

-----

## Project Documentation

|Document                             |Purpose                                                   |
|-------------------------------------|----------------------------------------------------------|
|`PROJECT.md`                         |Full technical specification and architecture             |
|`BUILD_WORKFLOW.md`                  |Step-by-step build order and task breakdown               |
|`CLAUDE.md`                          |AI assistant instructions for contributing to this project|
|`campaigns/monster-hunt-tzorath.json`|First campaign blueprint (Monster Hunt: Tzorath)          |

-----

## Roadmap

- [x] Campaign Blueprint schema design
- [ ] Project scaffolding and folder structure
- [ ] Core game engine (state machine, combat resolver, D20 system)
- [ ] PeerJS networking layer
- [ ] Host lobby and room creation
- [ ] Character selection and customization
- [ ] Main game board with zone map
- [ ] Host DM view with GM driver toggle
- [ ] Campaign compiler (Claude API integration)
- [ ] Animated D20 dice roller
- [ ] JSON save/resume
- [ ] Scripted GM driver (auto-pilot mode)
- [ ] AI GM driver (API key input)
- [ ] Sound effects and ambient audio
- [ ] Cloud save upgrade (Firebase/Supabase)

-----

## License

MIT

-----

*Built with Mythwright. Craft your myth.*
