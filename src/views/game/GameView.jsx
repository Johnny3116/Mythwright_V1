import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './game.module.css';
import { ZoneMap } from './ZoneMap.jsx';
import { ActionPanel } from './ActionPanel.jsx';
import { CharacterSheet } from './CharacterSheet.jsx';
import { NarratorFeed } from './NarratorFeed.jsx';
import { TurnTracker } from './TurnTracker.jsx';
import { EncounterSplash } from '@components/EncounterSplash.jsx';
import { FloatingDamage } from '@components/FloatingDamage.jsx';
import { DisconnectOverlay } from '@components/DisconnectOverlay.jsx';
import { useGameEngine } from '@hooks/useGameEngine.js';
import { usePeerConnection } from '@hooks/usePeerConnection.js';
import { useTurnManager } from '@hooks/useTurnManager.js';
import { GameState, ActionTypes } from '@engine/GameEngine.js';
import { isBossVisible, getAdjacentZones, getPlayersInZone } from '@engine/SpatialSystem.js';
import { useGameContext } from '@context/GameContext.jsx';
import { useNetworkContext } from '@context/NetworkContext.jsx';

export default function GameView() {
  const navigate = useNavigate();
  const { dispatch } = useGameContext();
  const { network, clearDisconnected } = useNetworkContext();
  const {
    state,
    isHost,
    playerAttack,
    playerAttackMob,
    playerUseAbility,
    playerSetTrap,
    playerRetreat,
    playerSearchFlora,
    playerSearch,
    playerHeal,
    playerMove,
    playerFlee,
    endPlayerTurn,
    activePlayerId,
  } = useGameEngine();
  const { myPeerId } = usePeerConnection();
  const { turnPhase, round } = useTurnManager();

  const { blueprint, players, boss, narrativeLog, floraState, placedTraps, zoneState, gameOverResult, isEvolving } = state;
  const myPlayer = players[myPeerId];
  const isMyTurn = activePlayerId === myPeerId;

  // Floating damage/heal event
  const [floatEvent, setFloatEvent] = useState(null);
  useEffect(() => {
    if (!state.lastRoll?.result) return;
    const { hit, damageDealt } = state.lastRoll.result;
    if (hit && damageDealt > 0) {
      setFloatEvent({ amount: damageDealt, type: 'damage', key: Date.now() });
    } else if (hit && damageDealt < 0) {
      setFloatEvent({ amount: Math.abs(damageDealt), type: 'heal', key: Date.now() });
    } else if (!hit) {
      setFloatEvent({ amount: 0, type: 'miss', key: Date.now() });
    }
  }, [state.lastRoll]);

  // Move mode state (player clicked Move — map enters zone-select mode)
  const [moveMode, setMoveMode] = useState(false);

  // Reset move mode when turn changes
  useEffect(() => {
    setMoveMode(false);
  }, [activePlayerId]);

  // Redirect host to HostView
  useEffect(() => {
    if (isHost) navigate('/host');
  }, [isHost, navigate]);

  useEffect(() => {
    if (state.phase === GameState.TURN_LOOP && !isHost) {
      navigate('/game');
    }
  }, [state.phase, isHost, navigate]);

  function handleReturnToLobby() {
    dispatch({ type: ActionTypes.RESET_TO_LOBBY });
    navigate('/');
  }

  function buildGameOverStats() {
    const allPlayers = Object.values(players);
    const totalDamage = allPlayers.reduce((sum, p) => sum + (p.damageDealt || 0), 0);
    const mvpPlayer = [...allPlayers].sort((a, b) => (b.damageDealt || 0) - (a.damageDealt || 0))[0];
    return { rounds: round, totalDamage, mvp: mvpPlayer?.name || null };
  }

  // ── Context values for ActionPanel ──────────────────────────────────────────

  const myZoneId      = myPlayer?.zone ?? null;
  const bossInZone    = blueprint && boss
    ? isBossVisible(myZoneId, boss) && boss.zone === myZoneId
    : false;
  const mobsInZone    = myZoneId ? zoneState?.[myZoneId]?.wildlifeAlive === true : false;
  const alliesInZone  = blueprint && myZoneId
    ? getPlayersInZone(myZoneId, players).filter(p => p.id !== myPeerId)
    : [];
  const adjacentZones = blueprint && myZoneId
    ? getAdjacentZones(myZoneId, blueprint).map(id => {
        const z = blueprint.zones.find(z => z.id === id);
        return { id, name: z?.name || id };
      })
    : [];

  // ── Action handlers ──────────────────────────────────────────────────────────

  function handleMove() {
    setMoveMode(v => !v);
  }

  function handleMoveToZone(zoneId) {
    setMoveMode(false);
    playerMove(myPeerId, zoneId);
  }

  if (state.phase === GameState.LOBBY || !blueprint) {
    return (
      <div className={styles.gameView} style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-display)' }}>
          Waiting for game to start...
        </div>
      </div>
    );
  }

  if (state.phase === GameState.GAME_OVER && gameOverResult) {
    const isVictory = gameOverResult.winner === 'players';
    return (
      <EncounterSplash
        type={isVictory ? 'VICTORY' : 'DEFEAT'}
        subtitle={isVictory ? blueprint.narrative?.victoryText : blueprint.narrative?.defeatText}
        visible={true}
        onReturnToLobby={handleReturnToLobby}
        stats={buildGameOverStats()}
      />
    );
  }

  return (
    <div className={styles.gameView}>
      {/* Header */}
      <div className={styles.gameHeader}>
        <div className={styles.gameMeta}>
          <span className={styles.roundBadge}>Round {round}</span>
          <span className={styles.phaseBadge}>{turnPhase}</span>
          {boss && (
            <span style={{ color: 'var(--accent-danger)', fontFamily: 'var(--font-display)', fontSize: 'var(--text-sm)' }}>
              {boss.name} [{boss.stages?.[boss.currentStage]?.name || `Stage ${boss.currentStage + 1}`}] — {boss.hp}/{boss.maxHp} HP
            </span>
          )}
        </div>
        <TurnTracker players={players} boss={boss} activeEntityId={activePlayerId} round={round} phase={turnPhase} />
      </div>

      {/* Left Sidebar */}
      <div className={styles.gameSidebar}>
        <div className={styles.sidebarSection}>
          <div className={styles.sidebarTitle}>Your Character</div>
          <CharacterSheet player={myPlayer} />
        </div>
        {/* Zone status */}
        {myZoneId && blueprint && (
          <div className={styles.sidebarSection}>
            <div className={styles.sidebarTitle}>Current Zone</div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
              {blueprint.zones.find(z => z.id === myZoneId)?.name || myZoneId}
            </div>
            {mobsInZone && (
              <div style={{ fontSize: 'var(--text-xs)', color: '#c87941', marginTop: 'var(--space-1)' }}>
                🐾 {zoneState[myZoneId]?.creature} prowling nearby
              </div>
            )}
            {bossInZone && (
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--accent-danger)', marginTop: 'var(--space-1)' }}>
                🦎 Boss is HERE
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className={styles.gameMain}>
        <div className={styles.narratorArea}>
          <NarratorFeed entries={narrativeLog} />
        </div>
        <div className={styles.zoneMapArea}>
          <ZoneMap
            zones={blueprint.zones}
            players={players}
            boss={boss}
            floraState={floraState}
            placedTraps={placedTraps}
            zoneState={zoneState || {}}
            myPlayerId={myPeerId}
            moveMode={moveMode}
            onMoveToZone={handleMoveToZone}
          />
        </div>
      </div>

      {/* Action Panel */}
      <div className={styles.gameActions}>
        <ActionPanel
          player={myPlayer}
          isMyTurn={isMyTurn}
          blueprint={blueprint}
          bossInZone={bossInZone}
          mobsInZone={mobsInZone}
          alliesInZone={alliesInZone}
          adjacentZones={adjacentZones}
          moveMode={moveMode}
          onAttackBoss={(roll) => playerAttack(myPeerId, roll)}
          onAttackMob={(roll) => playerAttackMob(myPeerId, roll)}
          onUseAbility={(roll) => playerUseAbility(myPeerId, null, roll)}
          onSearch={(roll) => playerSearch(myPeerId, roll)}
          onSetTrap={(trapTypeId, roll) => playerSetTrap(myPeerId, trapTypeId, roll)}
          onHeal={(targetId, roll) => playerHeal(myPeerId, targetId, roll)}
          onMove={handleMove}
          onFlee={() => playerFlee(myPeerId)}
          onEndTurn={endPlayerTurn}
        />
      </div>

      {/* Floating damage/heal number */}
      {floatEvent && (
        <FloatingDamage
          key={floatEvent.key}
          amount={floatEvent.amount}
          type={floatEvent.type}
          onAnimationEnd={() => setFloatEvent(null)}
        />
      )}

      {/* Evolution splash */}
      {isEvolving && (
        <EncounterSplash
          type="EVOLUTION"
          subtitle={`${boss?.name} evolves to Stage ${(boss?.currentStage || 0) + 1}!`}
          visible={isEvolving}
          onComplete={() => dispatch({ type: ActionTypes.CLEAR_EVOLVING })}
        />
      )}

      {/* Disconnect overlay */}
      {network.isDisconnected && (
        <DisconnectOverlay
          isHost={false}
          onDismiss={clearDisconnected}
          onReturnToLobby={() => {
            dispatch({ type: ActionTypes.RESET_TO_LOBBY });
            navigate('/');
          }}
        />
      )}
    </div>
  );
}
