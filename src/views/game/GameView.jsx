import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './game.module.css';
import { ZoneMap } from './ZoneMap.jsx';
import { ActionPanel } from './ActionPanel.jsx';
import { CharacterSheet } from './CharacterSheet.jsx';
import { NarratorFeed } from './NarratorFeed.jsx';
import { TurnTracker } from './TurnTracker.jsx';
import { EncounterSplash } from '@components/EncounterSplash.jsx';
import { useGameEngine } from '@hooks/useGameEngine.js';
import { usePeerConnection } from '@hooks/usePeerConnection.js';
import { useTurnManager } from '@hooks/useTurnManager.js';
import { GameState } from '@engine/GameEngine.js';

export default function GameView() {
  const navigate = useNavigate();
  const {
    state,
    isHost,
    playerAttack,
    playerUseAbility,
    playerSetTrap,
    playerRetreat,
    playerSearchFlora,
    endPlayerTurn,
    activePlayerId,
  } = useGameEngine();
  const { myPeerId } = usePeerConnection();
  const { turnPhase, round } = useTurnManager();

  const { blueprint, players, boss, narrativeLog, floraState, placedTraps, gameOverResult, isEvolving } = state;
  const myPlayer = players[myPeerId];
  const isMyTurn = activePlayerId === myPeerId;

  // Redirect to host view if host
  useEffect(() => {
    if (isHost) {
      navigate('/host');
    }
  }, [isHost, navigate]);

  // Redirect to game over if done
  useEffect(() => {
    // Game over is handled inline via state
  }, [gameOverResult]);

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
          {boss && <span style={{ color: 'var(--accent-danger)', fontFamily: 'var(--font-display)', fontSize: 'var(--text-sm)' }}>
            {boss.name} [{boss.stages?.[boss.currentStage]?.name || `Stage ${boss.currentStage + 1}`}] — {boss.hp}/{boss.maxHp} HP
          </span>}
        </div>
        <TurnTracker players={players} boss={boss} activeEntityId={activePlayerId} round={round} phase={turnPhase} />
      </div>

      {/* Left Sidebar */}
      <div className={styles.gameSidebar}>
        <div className={styles.sidebarSection}>
          <div className={styles.sidebarTitle}>Your Character</div>
          <CharacterSheet player={myPlayer} />
        </div>
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
          />
        </div>
      </div>

      {/* Action Panel */}
      <div className={styles.gameActions}>
        <ActionPanel
          player={myPlayer}
          isMyTurn={isMyTurn}
          blueprint={blueprint}
          onAttack={(roll) => playerAttack(myPeerId, roll)}
          onUseAbility={(roll) => playerUseAbility(myPeerId, null, roll)}
          onSetTrap={(trapTypeId, roll) => playerSetTrap(myPeerId, trapTypeId, roll)}
          onRetreat={(roll) => playerRetreat(myPeerId, roll)}
          onSearchFlora={(roll) => playerSearchFlora(myPeerId, roll)}
          onEndTurn={endPlayerTurn}
        />
      </div>

      {/* Evolution splash */}
      {isEvolving && (
        <EncounterSplash
          type="EVOLUTION"
          subtitle={`${boss?.name} evolves to Stage ${(boss?.currentStage || 0) + 1}!`}
          visible={isEvolving}
        />
      )}
    </div>
  );
}
