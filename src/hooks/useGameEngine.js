/**
 * useGameEngine — React hook wrapping GameEngine state machine
 * Provides convenient action dispatchers and derived state selectors.
 */

import { useCallback, useEffect, useRef } from 'react';
import { useGameContext } from '@context/GameContext.jsx';
import { useNetworkContext } from '@context/NetworkContext.jsx';
import { ActionTypes, GameState, TurnPhase, checkWinConditions } from '@engine/GameEngine.js';
import { rollD20 } from '@engine/DiceSystem.js';
import { MessageTypes } from '@network/MessageTypes.js';

export function useGameEngine() {
  const { state, dispatch } = useGameContext();
  const { network, broadcastGameState, setMessageHandler, sendAction } = useNetworkContext();

  const isHost = network.isHost;

  /**
   * Dispatch a player-originated action. If this tab is the host, apply directly.
   * If this tab is a player, send the action to the host for validation + broadcast.
   */
  const dispatchPlayerAction = useCallback((action) => {
    if (isHost) {
      dispatch(action);
    } else {
      sendAction(action);
    }
  }, [isHost, dispatch, sendAction]);

  const broadcastTimerRef = useRef(null);

  /**
   * After any state change (host-side), broadcast new state to all players.
   * Debounced 50ms so boss multi-attacks batching 4 partial states don't
   * spray 4 separate snapshots to players in rapid succession.
   */
  useEffect(() => {
    if (!isHost || state.phase === GameState.LOBBY) return;
    if (broadcastTimerRef.current) clearTimeout(broadcastTimerRef.current);
    broadcastTimerRef.current = setTimeout(() => {
      broadcastGameState(state);
    }, 50);
    return () => clearTimeout(broadcastTimerRef.current);
  }, [state, isHost, broadcastGameState]);

  /**
   * Listen for incoming network messages and handle them.
   */
  useEffect(() => {
    setMessageHandler((message, fromPeerId) => {
      if (!message || !message.type) return;

      switch (message.type) {
        case MessageTypes.HOST_STATE_UPDATE:
          if (!isHost && message.payload?.state) {
            dispatch({ type: ActionTypes.LOAD_STATE, payload: message.payload.state });
          }
          break;

        case MessageTypes.PLAYER_ACTION:
          if (isHost && message.payload?.action) {
            // Validate that the action comes from the correct player
            const action = message.payload.action;
            dispatch(action);
          }
          break;

        case MessageTypes.PLAYER_JOIN:
          if (isHost && message.payload) {
            dispatch({
              type: ActionTypes.PLAYER_REGISTER,
              payload: {
                peerId: fromPeerId,
                playerName: message.payload.playerName || 'Player',
                isHost: false,
              },
            });
          }
          break;

        case MessageTypes.DICE_ROLL_RESULT:
          if (!isHost) {
            dispatch({ type: ActionTypes.SET_ROLL_RESULT, payload: message.payload });
          }
          break;

        case MessageTypes.STATE_REQUEST:
          if (isHost) {
            broadcastGameState(state);
          }
          break;

        default:
          break;
      }
    });
  }, [isHost, setMessageHandler, dispatch, broadcastGameState, state]);

  // ── Selectors ─────────────────────────────────────────────────────────────

  const isPlayerTurn = state.turnPhase === TurnPhase.PLAYER_TURN;
  const isBossTurn = state.turnPhase === TurnPhase.BOSS_TURN;
  const isEnvironmentPhase = state.turnPhase === TurnPhase.ENVIRONMENT;
  const activePlayerId = state.turnState?.order?.[state.turnState?.currentIndex] || null;
  const alivePlayers = Object.values(state.players).filter(p => p.alive);
  const blueprint = state.blueprint;

  // ── Player Actions ─────────────────────────────────────────────────────────

  const playerAttack = useCallback((playerId, roll) => {
    dispatchPlayerAction({ type: ActionTypes.PLAYER_ATTACK, payload: { playerId, roll } });
  }, [dispatchPlayerAction]);

  const playerUseAbility = useCallback((playerId, targetId, roll) => {
    dispatchPlayerAction({ type: ActionTypes.PLAYER_USE_ABILITY, payload: { playerId, targetId, roll } });
  }, [dispatchPlayerAction]);

  const playerSetTrap = useCallback((playerId, trapTypeId, roll) => {
    dispatchPlayerAction({ type: ActionTypes.PLAYER_SET_TRAP, payload: { playerId, trapTypeId, roll } });
  }, [dispatchPlayerAction]);

  const playerRetreat = useCallback((playerId, roll) => {
    dispatchPlayerAction({ type: ActionTypes.PLAYER_RETREAT, payload: { playerId, roll } });
  }, [dispatchPlayerAction]);

  const playerSearchFlora = useCallback((playerId, roll) => {
    dispatchPlayerAction({ type: ActionTypes.PLAYER_SEARCH_FLORA, payload: { playerId, roll } });
  }, [dispatchPlayerAction]);

  const playerMove = useCallback((playerId, targetZoneId) => {
    dispatchPlayerAction({ type: ActionTypes.PLAYER_MOVE, payload: { playerId, targetZoneId } });
  }, [dispatchPlayerAction]);

  const endPlayerTurn = useCallback(() => {
    dispatchPlayerAction({ type: ActionTypes.ADVANCE_PHASE, payload: {} });
  }, [dispatchPlayerAction]);

  // ── Boss Actions (host only) ───────────────────────────────────────────────

  const bossAttack = useCallback((targetId, roll) => {
    dispatch({ type: ActionTypes.BOSS_ATTACK, payload: { targetId, roll } });
  }, [dispatch]);

  const bossAoeAttack = useCallback((roll) => {
    dispatch({ type: ActionTypes.BOSS_AOE_ATTACK, payload: { roll } });
  }, [dispatch]);

  const bossBurrow = useCallback(() => {
    dispatch({ type: ActionTypes.BOSS_BURROW, payload: {} });
  }, [dispatch]);

  const bossGrab = useCallback((targetId) => {
    dispatch({ type: ActionTypes.BOSS_GRAB, payload: { targetId } });
  }, [dispatch]);

  const endBossTurn = useCallback(() => {
    dispatch({ type: ActionTypes.BOSS_END_TURN, payload: {} });
    dispatch({ type: ActionTypes.RUN_ENVIRONMENT, payload: {} });
  }, [dispatch]);

  // ── Game Lifecycle ─────────────────────────────────────────────────────────

  const setBlueprint = useCallback((bp) => {
    dispatch({ type: ActionTypes.SET_BLUEPRINT, payload: { blueprint: bp } });
  }, [dispatch]);

  const setGmMode = useCallback((mode) => {
    dispatch({ type: ActionTypes.SET_GM_MODE, payload: { mode } });
  }, [dispatch]);

  const startCharacterSelect = useCallback(() => {
    dispatch({ type: ActionTypes.START_CHARACTER_SELECT, payload: {} });
  }, [dispatch]);

  const registerPlayer = useCallback((peerId, playerName, isHostPlayer = false) => {
    dispatch({
      type: ActionTypes.PLAYER_REGISTER,
      payload: { peerId, playerName, isHost: isHostPlayer },
    });
  }, [dispatch]);

  const selectClass = useCallback((peerId, classId, playerName) => {
    dispatch({ type: ActionTypes.PLAYER_SELECT_CLASS, payload: { peerId, classId, playerName } });
  }, [dispatch]);

  const startGame = useCallback(() => {
    dispatch({ type: ActionTypes.START_GAME, payload: {} });
  }, [dispatch]);

  const addNarrative = useCallback((text) => {
    dispatch({ type: ActionTypes.ADD_NARRATIVE, payload: { text } });
  }, [dispatch]);

  const advancePhase = useCallback(() => {
    dispatch({ type: ActionTypes.ADVANCE_PHASE, payload: {} });
  }, [dispatch]);

  const runEnvironment = useCallback(() => {
    dispatch({ type: ActionTypes.RUN_ENVIRONMENT, payload: {} });
  }, [dispatch]);

  return {
    state,
    dispatch,
    isHost,
    isPlayerTurn,
    isBossTurn,
    isEnvironmentPhase,
    activePlayerId,
    alivePlayers,
    blueprint,
    // Player actions
    playerAttack,
    playerUseAbility,
    playerSetTrap,
    playerRetreat,
    playerSearchFlora,
    playerMove,
    endPlayerTurn,
    // Boss actions
    bossAttack,
    bossAoeAttack,
    bossBurrow,
    bossGrab,
    endBossTurn,
    // Lifecycle
    setBlueprint,
    setGmMode,
    startCharacterSelect,
    registerPlayer,
    selectClass,
    startGame,
    addNarrative,
    advancePhase,
    runEnvironment,
  };
}
