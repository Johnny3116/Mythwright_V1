/**
 * TurnManager — Turn order, phase cycling, initiative tracking
 */

import { TurnPhase } from './GameEngine.js';

/**
 * Initialize turn order from player list.
 * @param {Array} players - Array of player objects
 * @returns {object} Turn state { order: string[], currentIndex: number, round: number, phase: string }
 */
export function initializeTurnOrder(players) {
  const alivePlayers = players.filter(p => p.alive !== false);
  return {
    order: alivePlayers.map(p => p.id),
    currentIndex: 0,
    round: 1,
    phase: TurnPhase.PLAYER_TURN,
    actedThisTurn: [],
  };
}

/**
 * Advance to the next turn/phase in the cycle.
 * Cycle: all player turns → boss turn → environment → win check → next round
 * @param {object} turnState
 * @param {number} playerCount
 * @returns {object} New turn state
 */
export function advanceTurn(turnState, playerCount) {
  const { phase, currentIndex, order, round, actedThisTurn } = turnState;

  if (phase === TurnPhase.PLAYER_TURN) {
    const nextIndex = currentIndex + 1;
    if (nextIndex < playerCount && nextIndex < order.length) {
      // Next player's turn
      return { ...turnState, currentIndex: nextIndex };
    } else {
      // All players acted → boss turn
      return { ...turnState, currentIndex: 0, phase: TurnPhase.BOSS_TURN, actedThisTurn: [] };
    }
  }

  if (phase === TurnPhase.BOSS_TURN) {
    return { ...turnState, phase: TurnPhase.ENVIRONMENT };
  }

  if (phase === TurnPhase.ENVIRONMENT) {
    return { ...turnState, phase: TurnPhase.CHECK_WIN };
  }

  if (phase === TurnPhase.CHECK_WIN) {
    return { ...turnState, phase: TurnPhase.NEXT_ROUND };
  }

  if (phase === TurnPhase.NEXT_ROUND) {
    return {
      ...turnState,
      round: round + 1,
      currentIndex: 0,
      phase: TurnPhase.PLAYER_TURN,
      actedThisTurn: [],
    };
  }

  return turnState;
}

/**
 * Get the currently active entity id.
 * @param {object} turnState
 * @returns {string} Entity id or 'boss' or 'environment'
 */
export function getActiveEntity(turnState) {
  const { phase, order, currentIndex } = turnState;

  if (phase === TurnPhase.PLAYER_TURN) {
    return order[currentIndex] || null;
  }
  if (phase === TurnPhase.BOSS_TURN) {
    return 'boss';
  }
  if (phase === TurnPhase.ENVIRONMENT) {
    return 'environment';
  }
  return null;
}

/**
 * Mark a player as having acted this turn.
 * @param {object} turnState
 * @param {string} playerId
 * @returns {object} Updated turn state
 */
export function markPlayerActed(turnState, playerId) {
  return {
    ...turnState,
    actedThisTurn: [...(turnState.actedThisTurn || []), playerId],
  };
}

/**
 * Check if a player has already acted this turn.
 * @param {object} turnState
 * @param {string} playerId
 * @returns {boolean}
 */
export function hasPlayerActed(turnState, playerId) {
  return (turnState.actedThisTurn || []).includes(playerId);
}
