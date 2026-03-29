import { useEffect, useCallback, useRef } from 'react';
import styles from './host.module.css';
import { MonsterPanel } from './MonsterPanel.jsx';
import { PlayerOverview } from './PlayerOverview.jsx';
import { GMControls } from './GMControls.jsx';
import { DriverToggle } from './DriverToggle.jsx';
import { ZoneMap } from '@views/game/ZoneMap.jsx';
import { NarratorFeed } from '@views/game/NarratorFeed.jsx';
import { TurnTracker } from '@views/game/TurnTracker.jsx';
import { EncounterSplash } from '@components/EncounterSplash.jsx';
import { useGameEngine } from '@hooks/useGameEngine.js';
import { useGameContext } from '@context/GameContext.jsx';
import { TurnPhase, GameState, ActionTypes } from '@engine/GameEngine.js';
import { selectBossAction, bossActionToDispatch } from '@drivers/ScriptedDriver.js';
import { rollD20 } from '@engine/DiceSystem.js';

export default function HostView() {
  const { state, dispatch } = useGameContext();
  const {
    bossAttack,
    bossAoeAttack,
    bossBurrow,
    endBossTurn,
    runEnvironment,
    advancePhase,
    setGmMode,
    addNarrative,
  } = useGameEngine();
  const { saveGame } = useGameContext();

  const { blueprint, players, boss, narrativeLog, floraState, placedTraps, turnPhase, round, gameOverResult, gmMode, isEvolving } = state;

  // Keep a stable ref to the latest state so async effects can read it
  // without adding `state` to their dependency arrays (which would re-run on
  // every single dispatch).
  const stateRef = useRef(state);
  stateRef.current = state;

  // Auto-resolve scripted boss turn
  useEffect(() => {
    if (turnPhase !== TurnPhase.BOSS_TURN) return;
    if (gmMode !== 'scripted' && gmMode !== 'ai') return;
    if (!blueprint || !boss) return;

    const timer = setTimeout(async () => {
      try {
        const bossAction = await selectBossAction(stateRef.current, blueprint);
        const roll = rollD20();

        // Handle multi_attack: dispatch each hit with a short stagger
        const attackCount = bossAction.action === 'multi_attack'
          ? (bossAction.params?.attackCount || 2)
          : 1;

        for (let i = 0; i < attackCount; i++) {
          const hitRoll = i === 0 ? roll : rollD20();
          const dispatchAction = bossActionToDispatch(
            { ...bossAction, action: i === 0 && bossAction.action !== 'multi_attack' ? bossAction.action : 'attack' },
            hitRoll.modified,
          );
          // Stagger each hit by 400ms so HP bar animations are visible
          await new Promise(res => setTimeout(res, i * 400));
          dispatch(dispatchAction);
        }

        // End boss turn after all hits land
        setTimeout(() => {
          dispatch({ type: ActionTypes.BOSS_END_TURN, payload: {} });
          dispatch({ type: ActionTypes.RUN_ENVIRONMENT, payload: {} });
          dispatch({ type: ActionTypes.ADVANCE_PHASE, payload: {} });
        }, 1500);
      } catch (err) {
        console.error('Boss AI error:', err);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [turnPhase, gmMode, boss?.currentStage, blueprint, boss, dispatch]);

  // Auto-advance environment phase
  useEffect(() => {
    if (turnPhase !== TurnPhase.ENVIRONMENT) return;
    const timer = setTimeout(() => {
      dispatch({ type: ActionTypes.ADVANCE_PHASE, payload: {} });
    }, 1000);
    return () => clearTimeout(timer);
  }, [turnPhase, dispatch]);

  // Narrator guidance — fire once each time the turn phase changes
  const prevPhaseRef = useRef(null);
  useEffect(() => {
    if (!blueprint || !boss) return;
    if (turnPhase === prevPhaseRef.current) return;
    prevPhaseRef.current = turnPhase;

    if (turnPhase === TurnPhase.PLAYER_TURN) {
      const activeId = stateRef.current.turnState?.order?.[stateRef.current.turnState?.currentIndex];
      const player = players[activeId];
      const name = player?.name || 'Player';
      addNarrative(`⚔️ ${name}'s turn — choose an action: Attack, Set Trap, Search Flora, Retreat, or End Turn.`);
    } else if (turnPhase === TurnPhase.BOSS_TURN) {
      addNarrative(`🦎 ${boss.name} prepares to act — scripted AI is resolving...`);
    } else if (turnPhase === TurnPhase.ENVIRONMENT) {
      addNarrative('🌿 Environment phase — wildlife and flora events are resolving.');
    } else if (turnPhase === TurnPhase.NEXT_ROUND) {
      addNarrative(`🔄 Round ${(stateRef.current.round || 0) + 1} begins. New turn order in effect.`);
    }
  }, [turnPhase, blueprint, boss, players, addNarrative]);

  const activePlayerId = state.turnState?.order?.[state.turnState?.currentIndex] || (turnPhase === TurnPhase.BOSS_TURN ? 'boss' : null);

  if (state.phase === GameState.LOBBY || !blueprint) {
    return (
      <div className={styles.hostView} style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)' }}>
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
    <div className={styles.hostView}>
      {/* Header */}
      <div className={styles.hostHeader}>
        <span className={styles.hostTitle}>Host GM Console</span>
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
          <span className={styles.roundBadge}>Round {round}</span>
          <span className={styles.phaseBadge}>{turnPhase}</span>
          <TurnTracker players={players} boss={boss} activeEntityId={activePlayerId} round={round} phase={turnPhase} />
        </div>
        <DriverToggle currentDriver={gmMode} onSwitch={setGmMode} />
      </div>

      {/* Left — Monster Panel */}
      <div className={styles.hostLeft}>
        <div className={styles.sectionTitle}>Boss</div>
        <MonsterPanel bossState={boss} blueprint={blueprint} />
      </div>

      {/* Main */}
      <div className={styles.hostMain}>
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

      {/* Right — Player Overview */}
      <div className={styles.hostRight}>
        <div className={styles.sectionTitle}>Players</div>
        <PlayerOverview players={players} />
      </div>

      {/* Footer — GM Controls */}
      <div className={styles.hostFooter}>
        <GMControls
          isBossTurn={turnPhase === TurnPhase.BOSS_TURN}
          isEnvironmentPhase={turnPhase === TurnPhase.ENVIRONMENT}
          gmMode={gmMode}
          players={players}
          onBossAttack={(targetId, roll) => {
            dispatch({ type: ActionTypes.BOSS_ATTACK, payload: { targetId, roll } });
          }}
          onBossAoe={(roll) => {
            dispatch({ type: ActionTypes.BOSS_AOE_ATTACK, payload: { roll } });
          }}
          onBossBurrow={() => dispatch({ type: ActionTypes.BOSS_BURROW, payload: {} })}
          onEndBossTurn={() => {
            dispatch({ type: ActionTypes.BOSS_END_TURN, payload: {} });
            dispatch({ type: ActionTypes.RUN_ENVIRONMENT, payload: {} });
            dispatch({ type: ActionTypes.ADVANCE_PHASE, payload: {} });
          }}
          onRunEnvironment={() => {
            dispatch({ type: ActionTypes.RUN_ENVIRONMENT, payload: {} });
            dispatch({ type: ActionTypes.ADVANCE_PHASE, payload: {} });
          }}
          onAdvancePhase={advancePhase}
          onSaveGame={saveGame}
        />
      </div>

      {/* Evolution splash */}
      {isEvolving && boss && (
        <EncounterSplash
          type="EVOLUTION"
          subtitle={`${boss.name} evolves to Stage ${boss.currentStage + 1}!`}
          visible={isEvolving}
        />
      )}
    </div>
  );
}
