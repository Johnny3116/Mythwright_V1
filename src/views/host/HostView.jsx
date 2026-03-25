import { useCallback } from 'react';
import { useGameContext } from '@context/GameContext';
import { useNetworkContext } from '@context/NetworkContext';
import { useGameEngine } from '@hooks/useGameEngine';

import { ZoneMap } from '@views/game/ZoneMap';
import { TurnTracker } from '@views/game/TurnTracker';
import { ActionPanel } from '@views/game/ActionPanel';
import { CharacterSheet } from '@views/game/CharacterSheet';
import { NarratorFeed } from '@views/game/NarratorFeed';

import { MonsterPanel } from './MonsterPanel';
import { PlayerOverview } from './PlayerOverview';
import { GMControls } from './GMControls';
import { DriverToggle } from './DriverToggle';

import styles from './host.module.css';

// ---------------------------------------------------------------------------
// Mock data — used when no real game state is present (demo / development)
// ---------------------------------------------------------------------------

const MOCK_GAME_STATE = {
  phase: 'PLAYER_TURN',
  round: 3,
  currentTurnEntityId: 'player-1',
  turnOrder: ['player-1', 'player-2', 'player-3', 'boss'],
  players: {
    'player-1': {
      id: 'player-1', name: 'Zara', classId: 'assault',
      hp: 85, maxHp: 120, damage: [20, 30], defense: 10,
      zoneId: 'verdant-maw', effects: [], isDead: false,
    },
    'player-2': {
      id: 'player-2', name: 'Hex', classId: 'trapper',
      hp: 60, maxHp: 100, damage: [15, 25], defense: 15,
      zoneId: 'razorback-canopy', effects: ['Poisoned'], isDead: false,
    },
    'player-3': {
      id: 'player-3', name: 'Doc', classId: 'medic',
      hp: 45, maxHp: 90, damage: [10, 15], defense: 10,
      zoneId: 'verdant-maw', effects: [], isDead: false,
    },
  },
  boss: {
    hp: 180, maxHp: 200, stageIndex: 0,
    name: 'Tzorath', stageName: 'Hatchling',
    damage: [15, 25], defense: 10,
    zoneId: 'shattered-cliffs', effects: [], isBurrowed: false,
  },
  zones: {
    'verdant-maw':       { traps: [], hasFlora: true,  floraType: 'lifebloom-orchid' },
    'razorback-canopy':  { traps: [{ id: 't1', trapTypeId: 'snare-vine', active: true }], hasFlora: false, floraType: null },
    'shattered-cliffs':  { traps: [], hasFlora: false, floraType: null },
  },
  narratorLog: [
    { id: 1, text: 'The hunt begins. Tzorath stalks the Verdant Maw.', type: 'narrative', timestamp: Date.now() - 120000 },
    { id: 2, text: 'Zara attacks! Roll: 14 — Hit! Deals 24 damage.', type: 'combat',    timestamp: Date.now() - 90000 },
    { id: 3, text: 'Tzorath charges toward the Verdant Maw!',         type: 'combat',    timestamp: Date.now() },
  ],
};

const MOCK_STAGES = [
  { stage: 1, name: 'Hatchling', maxHp: 200, damage: [15, 25], defense: 10,  retreatThreshold: 100 },
  { stage: 2, name: 'Stalker',   maxHp: 300, damage: [20, 30], defense: 15,  retreatThreshold: 150 },
  { stage: 3, name: 'Predator',  maxHp: 400, damage: [25, 40], defense: 20,  retreatThreshold: 200 },
  { stage: 4, name: 'Enraged',   maxHp: 500, damage: [30, 50], defense: 25,  retreatThreshold: 250 },
  { stage: 5, name: 'Final Form',maxHp: 700, damage: [50, 80], defense: 30,  retreatThreshold: null },
];

// ---------------------------------------------------------------------------
// HostView — default export
// ---------------------------------------------------------------------------

/**
 * HostView — The GM / dungeon master control panel view.
 * Renders the full game layout (zones, turn tracker, narrator, character
 * sheet, action bar) augmented with host-only panels on the far right.
 */
export default function HostView() {
  const { blueprint, gmMode, setGmMode, gmApiKey, setGmApiKey, addNarratorEntry } = useGameContext();
  const { players: networkPlayers } = useNetworkContext();
  const { gameState: liveGameState, myPlayer, boss } = useGameEngine();

  // Use live game state when available, otherwise fall back to mock data
  const gameState = liveGameState ?? MOCK_GAME_STATE;
  const isMockMode = liveGameState === null;

  // Resolve boss stages from blueprint, with mock fallback
  const bossStages = blueprint?.enemies?.boss?.stages ?? MOCK_STAGES;

  // -------------------------------------------------------------------------
  // GM action handlers
  // -------------------------------------------------------------------------

  const handleAdvanceStory = useCallback(() => {
    addNarratorEntry({
      text: '[GM] Story advanced — the world shifts around the hunters.',
      type: 'narrative',
    });
  }, [addNarratorEntry]);

  const handleOverrideDice = useCallback((value) => {
    if (value === null) {
      addNarratorEntry({ text: '[GM] Dice override cleared — rolls are free again.', type: 'system' });
    } else {
      addNarratorEntry({ text: `[GM] Dice override set: next roll will be ${value}.`, type: 'system' });
    }
  }, [addNarratorEntry]);

  const handleTriggerEvent = useCallback((eventId) => {
    const labels = {
      force_evolution: 'Boss forced to evolve!',
      spawn_wildlife:  'Wildlife spawned in the zone.',
      spawn_flora:     'Healing flora appeared.',
      trigger_trap:    'A trap has been triggered!',
      apply_status:    'Status effect applied.',
      clear_effects:   'All status effects cleared.',
      heal_all:        'All hunters restored to full health.',
      damage_all:      'Environmental hazard — all hunters took damage!',
    };
    addNarratorEntry({
      text: `[GM Event] ${labels[eventId] ?? eventId}`,
      type: eventId === 'damage_all' || eventId === 'trigger_trap' ? 'combat' : 'narrative',
    });
  }, [addNarratorEntry]);

  const handleSkipTurn = useCallback(() => {
    addNarratorEntry({ text: '[GM] Turn skipped by the Game Master.', type: 'system' });
  }, [addNarratorEntry]);

  const handlePauseGame = useCallback((isPaused) => {
    addNarratorEntry({
      text: isPaused ? '[GM] Game paused.' : '[GM] Game resumed.',
      type: 'system',
    });
  }, [addNarratorEntry]);

  const handleEndGame = useCallback((outcome) => {
    const text = outcome === 'victory'
      ? '[GM] The hunt is over — the hunters claim victory! Tzorath is slain.'
      : '[GM] The hunt ends in darkness — the hunters have fallen.';
    addNarratorEntry({ text, type: 'narrative' });
  }, [addNarratorEntry]);

  const handleDriverModeChange = useCallback((mode) => {
    setGmMode(mode);
    addNarratorEntry({ text: `[GM] Driver switched to: ${mode} mode.`, type: 'system' });
  }, [setGmMode, addNarratorEntry]);

  const handleApiKeyChange = useCallback((key) => {
    setGmApiKey(key);
  }, [setGmApiKey]);

  // -------------------------------------------------------------------------
  // Derived values for the turn bar
  // -------------------------------------------------------------------------

  const currentEntityId = gameState.currentTurnEntityId;
  const isHostTurn = currentEntityId === 'boss' || currentEntityId?.startsWith('boss');
  const roundNumber = gameState.round ?? 1;
  const phaseLabel = gameState.phase?.replace(/_/g, ' ') ?? 'WAITING';

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className={styles.hostView}>
      <div className={styles.mainGrid}>

        {/* ── Turn Bar ───────────────────────────────────────────── */}
        <div className={styles.turnBar}>
          <span className={styles.turnBarLabel}>Round</span>
          <div className={styles.turnBarBadge}>
            {roundNumber}
          </div>
          <span className={styles.turnBarLabel}>Phase</span>
          <div className={styles.turnBarBadge} style={isHostTurn ? { borderColor: 'var(--accent-secondary)', color: 'var(--accent-secondary)', background: 'rgba(212,168,67,0.1)' } : {}}>
            {phaseLabel}
          </div>
          {isMockMode && (
            <div className={styles.turnBarBadge} style={{ borderColor: 'var(--accent-info)', color: 'var(--accent-info)', background: 'rgba(74,126,199,0.1)' }}>
              DEMO MODE
            </div>
          )}
          <div className={styles.turnBarContent}>
            <TurnTracker
              turnOrder={gameState.turnOrder}
              activeEntityId={currentEntityId}
              round={roundNumber}
            />
          </div>
        </div>

        {/* ── Character Sheet ─────────────────────────────────────── */}
        <div className={styles.charSheet}>
          <CharacterSheet player={myPlayer} />
        </div>

        {/* ── Zone Map ────────────────────────────────────────────── */}
        <div className={styles.mapArea}>
          <ZoneMap
            zones={gameState.zones}
            playerPositions={
              Object.values(gameState.players).reduce((acc, p) => {
                acc[p.id] = p.zoneId;
                return acc;
              }, {})
            }
            bossPosition={gameState.boss?.zoneId ?? null}
          />
        </div>

        {/* ── Narrator Feed ───────────────────────────────────────── */}
        <div className={styles.narratorArea}>
          <NarratorFeed entries={gameState.narratorLog ?? []} />
        </div>

        {/* ── Action Bar ──────────────────────────────────────────── */}
        <div className={styles.actionBar}>
          <ActionPanel
            actions={[]}
            onAction={() => {}}
          />
          <div style={{ marginLeft: 'auto', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
            HOST VIEW
          </div>
        </div>

        {/* ── Host Panel (far right, spans content + action rows) ─── */}
        <div className={styles.hostPanel}>

          {/* GM Identity badge */}
          <div className={styles.gmBadge}>
            <span className={styles.gmBadgeTitle}>Game Master</span>
            <div className={styles.gmBadgePips}>
              <span className={styles.gmBadgePip} />
              <span className={styles.gmBadgePip} />
              <span className={styles.gmBadgePip} />
            </div>
          </div>

          {/* Monster Panel */}
          <div className={styles.hostPanelSection}>
            <MonsterPanel
              boss={gameState.boss}
              stages={bossStages}
              blueprint={blueprint}
            />
          </div>

          {/* Player Overview */}
          <div className={styles.hostPanelSection}>
            <PlayerOverview
              players={gameState.players}
              blueprint={blueprint}
            />
          </div>

          {/* GM Controls */}
          <div className={styles.hostPanelSection}>
            <GMControls
              onAdvanceStory={handleAdvanceStory}
              onOverrideDice={handleOverrideDice}
              onTriggerEvent={handleTriggerEvent}
              onSkipTurn={handleSkipTurn}
              onPauseGame={handlePauseGame}
              onEndGame={handleEndGame}
            />
          </div>

          {/* Driver Toggle */}
          <div className={styles.hostPanelSection}>
            <DriverToggle
              currentMode={gmMode}
              onModeChange={handleDriverModeChange}
              apiKey={gmApiKey}
              onApiKeyChange={handleApiKeyChange}
            />
          </div>

        </div>
      </div>
    </div>
  );
}
