import { useState, useCallback } from 'react';
import { useGameEngine } from '@hooks/useGameEngine';
import { useTurnManager } from '@hooks/useTurnManager';
import { ZoneCard } from '@components/ZoneCard';
import { FloatingDamage } from '@components/FloatingDamage';
import { EncounterSplash } from '@components/EncounterSplash';
import { useState } from 'react';
import { useGameEngine } from '@hooks/useGameEngine';
import { useTurnManager } from '@hooks/useTurnManager';
import { ZoneCard } from '@components/ZoneCard';
import { TurnTracker } from './TurnTracker';
import { CharacterSheet } from './CharacterSheet';
import { ZoneMap } from './ZoneMap';
import { NarratorFeed } from './NarratorFeed';
import { ActionPanel } from './ActionPanel';
import styles from './game.module.css';

// ── Mock game state — used when no live game state is available ─────────────

const MOCK_GAME_STATE = {
  phase: 'PLAYER_TURN',
  round: 3,
  currentTurnEntityId: 'player-1',
  turnOrder: ['player-1', 'player-2', 'player-3', 'boss'],
  players: {
    'player-1': {
      id: 'player-1',
      name: 'Zara',
      classId: 'assault',
      color: '#c74a38',
      hp: 85,
      maxHp: 120,
      damage: [20, 30],
      defense: 10,
      zoneId: 'verdant-maw',
      effects: [],
      isDead: false,
      initiative: 17,
    },
    'player-2': {
      id: 'player-2',
      name: 'Hex',
      classId: 'trapper',
      color: '#4a7ec7',
      hp: 60,
      maxHp: 100,
      damage: [15, 25],
      defense: 15,
      zoneId: 'razorback-canopy',
      effects: [{ id: 'e1', type: 'poison', duration: 2 }],
      isDead: false,
      initiative: 12,
    },
    'player-3': {
      id: 'player-3',
      name: 'Doc',
      classId: 'medic',
      color: '#4a9e6a',
      hp: 45,
      maxHp: 90,
      damage: [10, 15],
      defense: 10,
      zoneId: 'verdant-maw',
      effects: [],
      isDead: false,
      initiative: 9,
    },
  },
  boss: {
    hp: 180,
    maxHp: 200,
    stageIndex: 0,
    damage: [15, 25],
    defense: 10,
    zoneId: 'shattered-cliffs',
    effects: [],
    isBurrowed: false,
    initiative: 5,
  },
  zones: {
    'verdant-maw':      { traps: [], hasFlora: true,  floraType: 'lifebloom-orchid' },
    'razorback-canopy': { traps: [{ id: 't1', trapTypeId: 'snare-vine', active: true }], hasFlora: false, floraType: null },
    'shattered-cliffs': { traps: [], hasFlora: false, floraType: null },
  },
  narratorLog: [
    { id: 1, text: 'The hunt begins. Tzorath stalks the Verdant Maw.', type: 'narrative', timestamp: Date.now() - 120000 },
    { id: 2, text: 'Zara attacks! Roll: 14 — Hit! Deals 24 damage.', type: 'combat',   timestamp: Date.now() - 90000  },
    { id: 3, text: 'Hex sets a Snare Vine in the Razorback Canopy.',  type: 'system',   timestamp: Date.now() - 60000  },
    { id: 4, text: 'Doc searches for flora — Lifebloom Orchid found! +30 HP.', type: 'healing', timestamp: Date.now() - 30000 },
    { id: 5, text: 'Tzorath charges toward the Verdant Maw!',          type: 'combat',   timestamp: Date.now()          },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * GameView — Main gameplay screen.
 *
 * Layout:
 *   TurnTracker (top bar, full width)
 *   CharacterSheet | ZoneMap | NarratorFeed
 *   ActionPanel (bottom bar, full width)
 *
 * Includes FloatingDamage popups wired to combat events and
 * EncounterSplash overlays for major game events.
 */
export default function GameView() {
  const { gameState: liveGameState, blueprint, myPlayerId: livePlayerId } = useGameEngine();
  const { availableActions, isMyTurn: liveIsMyTurn } = useTurnManager();

  // Fall back to mock data in demo mode.
  const isDemoMode  = liveGameState === null;
  const gameState   = liveGameState ?? MOCK_GAME_STATE;
  const myPlayerId  = isDemoMode ? 'player-1' : livePlayerId;
  const isMyTurn    = isDemoMode
    ? gameState.phase === 'PLAYER_TURN' && gameState.currentTurnEntityId === myPlayerId
    : liveIsMyTurn;
  const demoActions = isDemoMode && isMyTurn
    ? ['ATTACK', 'USE_ABILITY', 'SET_TRAP', 'MOVE', 'RETREAT', 'SEARCH_FLORA', 'END_TURN']
    : [];
  const activeAvailableActions = isDemoMode ? demoActions : availableActions;

  // Zone card popup state.
  const [selectedZoneId, setSelectedZoneId] = useState(null);
  const [zoneCardPos, setZoneCardPos]       = useState({ top: 80, left: 300 });

  // FloatingDamage events — array of { id, amount, type, zoneId }
  const [floatingEvents, setFloatingEvents] = useState([]);

  // EncounterSplash state
  const [splash, setSplash] = useState(null); // { type, title, subtitle }

  // Expose a trigger for testing/demo from action handler
  const triggerFloating = useCallback((amount, type = 'damage') => {
    const id = `fd-${Date.now()}-${Math.random()}`;
    setFloatingEvents((prev) => [...prev, { id, amount, type }]);
  }, []);

  const dismissFloating = useCallback((id) => {
    setFloatingEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const triggerSplash = useCallback((type, title, subtitle) => {
    setSplash({ type, title, subtitle });
  }, []);

  // Derive blueprint zones array for the map.
  const blueprintZones = blueprint?.zones ?? [];

  // Merge blueprint zone data with live zone state.
  const enrichedZones = blueprintZones.map((z) => {
    const liveZone = gameState.zones?.[z.id] ?? {};
    return {
      ...z,
      hasFlora:  liveZone.hasFlora  ?? false,
      trapCount: (liveZone.traps ?? []).length,
    };
  });

  // Selected zone full object for the popup.
  const selectedZone = selectedZoneId
    ? blueprintZones.find((z) => z.id === selectedZoneId) ?? null
    : null;

  // Build a mock blueprint zone for demo mode when no blueprint is loaded.
  // Build a mock blueprint zone for demo mode.
  const demoZone = selectedZoneId && !selectedZone
    ? {
        id:         selectedZoneId,
        name:       selectedZoneId.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        subtitle:   'Zone of the Hunt',
        description:'A treacherous region teeming with danger and opportunity for the skilled hunter.',
        retreatModifier: 0,
        trapBonus:  'None',
        trapBonus:  0,
        connectedZones: [],
      }
    : null;

  const zonePopupData = selectedZone ?? demoZone;

  function handleZoneClick(zoneId, event) {
    // Position popup near click, clamped to visible area.
    if (event) {
      const containerRect = event.currentTarget?.closest?.('[data-map-area]')?.getBoundingClientRect?.();
      if (containerRect) {
        const x = event.clientX - containerRect.left;
        const y = event.clientY - containerRect.top;
        setZoneCardPos({
          top:  Math.max(10, Math.min(y - 20, containerRect.height - 320)),
          left: Math.max(10, Math.min(x + 15, containerRect.width - 280)),
        });
      }
    }
    setSelectedZoneId((prev) => (prev === zoneId ? null : zoneId));
  }

  function handleZoneCardClose() {
    setSelectedZoneId(null);
  }

  function handleAction(actionType) {
    if (isDemoMode) {
      // Demo: simulate a combat event so FloatingDamage / EncounterSplash are testable.
      if (actionType === 'ATTACK') {
        triggerFloating(24, 'damage');
        triggerSplash('encounter', 'ENCOUNTER', 'You engage Tzorath in combat!');
      } else if (actionType === 'SEARCH_FLORA') {
        triggerFloating(30, 'heal');
      }
    } else {
      // Phase 5: dispatch player action intent to host via network.
    // In live mode, dispatch the player action intent.
    // This will be wired to the full engine dispatch in Phase 5.
    if (!isDemoMode) {
      // TODO (Phase 5): dispatch player action intent to host via network.
      console.debug('[GameView] Player action intent:', actionType); // eslint-disable-line no-console
    }
  }

  const myPlayer    = myPlayerId ? (gameState.players[myPlayerId] ?? null) : null;
  const timerEnabled = blueprint?.settings?.turnTimer?.enabled ?? false;
  const timerSeconds = blueprint?.settings?.turnTimer?.defaultSeconds ?? 60;

  return (
    <div className={styles.gameView} role="main" aria-label="Game view">

      {/* ── EncounterSplash overlay (full-screen, z-index above everything) ── */}
      {splash && (
        <EncounterSplash
          type={splash.type}
          title={splash.title}
          subtitle={splash.subtitle}
          isVisible={Boolean(splash)}
          onComplete={() => setSplash(null)}
        />
      )}

      {/* ── Floating damage popups (positioned in map area) ── */}
      {floatingEvents.map((evt) => (
        <FloatingDamage
          key={evt.id}
          amount={evt.amount}
          type={evt.type}
          onAnimationEnd={() => dismissFloating(evt.id)}
        />
      ))}

  // Derive myPlayer.
  const myPlayer = myPlayerId ? (gameState.players[myPlayerId] ?? null) : null;

  // Turn tracker timer config.
  const timerEnabled   = blueprint?.settings?.turnTimer?.enabled ?? false;
  const timerSeconds   = blueprint?.settings?.turnTimer?.defaultSeconds ?? 60;

  return (
    <div className={styles.gameView} role="main" aria-label="Game view">
      {/* ── Turn tracker (top bar) ── */}
      <div className={styles.turnBar}>
        <TurnTracker
          turnOrder={gameState.turnOrder}
          players={gameState.players}
          boss={gameState.boss}
          activeEntityId={gameState.currentTurnEntityId}
          round={gameState.round}
          timerEnabled={timerEnabled}
          timerSeconds={timerSeconds}
          timerRemaining={timerSeconds}
          blueprint={blueprint}
        />
      </div>

      {/* ── Character sheet (left sidebar) ── */}
      <div className={styles.charSheet}>
        <CharacterSheet player={myPlayer} blueprint={blueprint} />
      </div>

      {/* ── Zone map (center) ── */}
      <div className={styles.mapArea} data-map-area="">
      <div
        className={styles.mapArea}
        data-map-area=""
      >
        <ZoneMap
          zones={enrichedZones}
          players={gameState.players}
          boss={gameState.boss}
          onZoneClick={handleZoneClick}
          myZoneId={myPlayer?.zoneId ?? null}
        />

        {/* Zone card popup */}
        {zonePopupData && (
          <div
            className={styles.zoneCardWrapper}
            style={{ top: zoneCardPos.top, left: zoneCardPos.left }}
          >
            <ZoneCard
              zone={zonePopupData}
              onClose={handleZoneCardClose}
              position={{ top: 0, left: 0 }}
            />
          </div>
        )}

        {/* Demo mode badge */}
        {isDemoMode && (
          <div className={styles.demoBadge} aria-hidden="true">
          <div
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              padding: '4px 10px',
              background: 'rgba(212, 168, 67, 0.18)',
              border: '1px solid rgba(212, 168, 67, 0.4)',
              borderRadius: 4,
              fontSize: '0.68rem',
              fontWeight: 700,
              color: 'var(--accent-secondary)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              pointerEvents: 'none',
            }}
            aria-hidden="true"
          >
            Demo Mode
          </div>
        )}
      </div>

      {/* ── Narrator feed (right sidebar) ── */}
      <div className={styles.narratorArea}>
        <NarratorFeed entries={gameState.narratorLog} maxEntries={100} />
      </div>

      {/* ── Action panel (bottom bar) ── */}
      <div className={styles.actionBar}>
        <ActionPanel
          availableActions={activeAvailableActions}
          onAction={handleAction}
          isMyTurn={isMyTurn}
          blueprint={blueprint}
        />
      </div>
    </div>
  );
}
