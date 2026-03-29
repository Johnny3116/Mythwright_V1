/**
 * useGameEngine — React hook wrapping GameEngine state machine
 * Provides convenient action dispatchers and derived state selectors.
 */

import { useCallback, useEffect, useRef } from 'react';
import { useGameContext } from '@context/GameContext.jsx';
import { useNetworkContext } from '@context/NetworkContext.jsx';
import { ActionTypes, GameState, TurnPhase, checkWinConditions } from '@engine/GameEngine.js';
import { rollD20, clearRollHistory } from '@engine/DiceSystem.js';
import { MessageTypes } from '@network/MessageTypes.js';
import { soundEvents } from '@hooks/useSoundEvents.js';

export function useGameEngine() {
  const { state, dispatch } = useGameContext();
  const { network, broadcastGameState, setMessageHandler, sendAction, checkAndUpdateStateVersion } = useNetworkContext();

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

  /**
   * After any state change (host-side), broadcast new state to all players.
   * Debounced 75ms so rapid boss multi-attack dispatches coalesce into one broadcast.
   */
  const broadcastTimerRef = useRef(null);
  useEffect(() => {
    if (!isHost || state.phase === GameState.LOBBY) return;
    clearTimeout(broadcastTimerRef.current);
    broadcastTimerRef.current = setTimeout(() => {
      broadcastGameState(state);
    }, 75);
    return () => clearTimeout(broadcastTimerRef.current);
  }, [state, isHost, broadcastGameState]);

  // Emit sound events on key state changes.
  const prevPhaseRef = useRef(null);
  const prevEvolvingRef = useRef(false);
  useEffect(() => {
    if (state.phase === GameState.GAME_OVER && prevPhaseRef.current !== GameState.GAME_OVER) {
      const event = state.gameOverResult?.winner === 'players' ? 'victory' : 'defeat';
      soundEvents.emit(event);
    }
    prevPhaseRef.current = state.phase;

    if (state.isEvolving && !prevEvolvingRef.current) {
      soundEvents.emit('evolution');
    }
    prevEvolvingRef.current = state.isEvolving;
  }, [state.phase, state.gameOverResult, state.isEvolving]);

  // Emit damage/miss sound events from lastRoll
  const prevRollRef = useRef(null);
  useEffect(() => {
    if (!state.lastRoll || state.lastRoll === prevRollRef.current) return;
    prevRollRef.current = state.lastRoll;
    const { hit, damageDealt } = state.lastRoll.result ?? {};
    if (hit && damageDealt > 0) {
      soundEvents.emit('damage', { amount: damageDealt });
    } else if (!hit) {
      soundEvents.emit('miss');
    }
  }, [state.lastRoll]);

  /**
   * Listen for incoming network messages and handle them.
   */
  useEffect(() => {
    setMessageHandler((message, fromPeerId) => {
      if (!message || !message.type) return;

      switch (message.type) {
        case MessageTypes.HOST_STATE_UPDATE:
          if (!isHost && message.payload?.state) {
            // Only apply if this version is newer than the last applied version
            if (checkAndUpdateStateVersion(message.payload.version)) {
              dispatch({ type: ActionTypes.LOAD_STATE, payload: message.payload.state });
            }
          }
          break;

        case MessageTypes.PLAYER_ACTION:
          if (isHost && message.payload?.action) {
            const action = message.payload.action;
            // Validate the action's playerId matches the sending peer to prevent
            // spoofing (a player acting as another player).
            const actionPlayerId = action.payload?.playerId;
            if (actionPlayerId && actionPlayerId !== fromPeerId) {
              console.warn(`[Security] Peer ${fromPeerId} tried to submit action for ${actionPlayerId} — rejected.`);
              break;
            }
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
    soundEvents.emit('attack');
    dispatchPlayerAction({ type: ActionTypes.PLAYER_ATTACK, payload: { playerId, roll } });
  }, [dispatchPlayerAction]);

  const playerUseAbility = useCallback((playerId, targetId, roll) => {
    dispatchPlayerAction({ type: ActionTypes.PLAYER_USE_ABILITY, payload: { playerId, targetId, roll } });
  }, [dispatchPlayerAction]);

  const playerSetTrap = useCallback((playerId, trapTypeId, roll) => {
    soundEvents.emit('trap_set');
    dispatchPlayerAction({ type: ActionTypes.PLAYER_SET_TRAP, payload: { playerId, trapTypeId, roll } });
  }, [dispatchPlayerAction]);

  const playerRetreat = useCallback((playerId, roll) => {
    soundEvents.emit('retreat');
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
    clearRollHistory(); // m1: reset roll history on new game
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
