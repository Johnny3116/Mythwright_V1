/**
 * useTurnManager — React hook wrapping TurnManager engine module
 */

import { useCallback } from 'react';
import { useGameContext } from '@context/GameContext.jsx';
import { TurnPhase, ActionTypes } from '@engine/GameEngine.js';
import { getActiveEntity } from '@engine/TurnManager.js';

export function useTurnManager() {
  const { state, dispatch } = useGameContext();
  const { turnState, turnPhase, round, players, boss } = state;

  const activeEntity = turnState ? getActiveEntity(turnState, boss?.id) : null;
  const currentPlayerId = turnPhase === TurnPhase.PLAYER_TURN ? activeEntity : null;
  const currentPlayer = currentPlayerId ? players[currentPlayerId] : null;

  const advancePhase = useCallback(() => {
    dispatch({ type: ActionTypes.ADVANCE_PHASE, payload: {} });
  }, [dispatch]);

  const runEnvironment = useCallback(() => {
    dispatch({ type: ActionTypes.RUN_ENVIRONMENT, payload: {} });
  }, [dispatch]);

  return {
    turnState,
    turnPhase,
    round,
    activeEntity,
    currentPlayerId,
    currentPlayer,
    isPlayerTurn: turnPhase === TurnPhase.PLAYER_TURN,
    isBossTurn: turnPhase === TurnPhase.BOSS_TURN,
    isEnvironmentPhase: turnPhase === TurnPhase.ENVIRONMENT,
    isCheckWin: turnPhase === TurnPhase.CHECK_WIN,
    isNextRound: turnPhase === TurnPhase.NEXT_ROUND,
    advancePhase,
    runEnvironment,
  };
}
