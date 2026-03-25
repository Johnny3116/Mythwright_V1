import { useGameContext } from '@context/GameContext';

/**
 * useGameEngine — Derived game-state selectors and actions from GameContext.
 *
 * Returns a focused subset of context so consumers don't need to import
 * GameContext directly and can rely on stable, memoized references.
 */
export function useGameEngine() {
  const {
    gameState,
    blueprint,
    isHost,
    myPlayerId,
    addNarratorEntry,
    updatePlayer,
    updateBoss,
    updateGameState,
  } = useGameContext();

  // Derived selectors — computed inline; only recalculate when dependencies change.

  /** The local player's state object, or null if the game hasn't started. */
  const myPlayer =
    gameState && myPlayerId ? (gameState.players[myPlayerId] ?? null) : null;

  /** The boss state object, or null before the game starts. */
  const boss = gameState ? (gameState.boss ?? null) : null;

  /**
   * True when it is the local player's turn to act.
   * Requires: game phase is PLAYER_TURN and the current entity is this player.
   */
  const isMyTurn =
    gameState !== null &&
    gameState.phase === 'PLAYER_TURN' &&
    gameState.currentTurnEntityId === myPlayerId;

  return {
    gameState,
    blueprint,
    isHost,
    myPlayerId,
    myPlayer,
    boss,
    isMyTurn,
    addNarratorEntry,
    updatePlayer,
    updateBoss,
    updateGameState,
  };
}
