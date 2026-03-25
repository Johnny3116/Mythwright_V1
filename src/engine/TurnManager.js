/**
 * TurnManager — Turn order and phase cycling.
 *
 * Turn cycle: PLAYER_TURN (×n players) → BOSS_TURN → ENVIRONMENT → CHECK_WIN → NEXT_ROUND
 */

export const TurnPhase = {
  PLAYER_TURN: 'PLAYER_TURN',
  BOSS_TURN: 'BOSS_TURN',
  ENVIRONMENT: 'ENVIRONMENT',
  CHECK_WIN: 'CHECK_WIN',
  NEXT_ROUND: 'NEXT_ROUND',
};

/**
 * Build initial turn state from a player array.
 * @param {object[]} players  Each player must have an `id` field.
 * @returns {{ order:string[], currentIndex:number, round:number, phase:string }}
 */
export function initializeTurnOrder(players) {
  return {
    order: players.map(p => p.id),
    currentIndex: 0,
    round: 1,
    phase: TurnPhase.PLAYER_TURN,
  };
}

/**
 * Advance to the next phase/player in the cycle.
 * @param {{ order:string[], currentIndex:number, round:number, phase:string }} turnState
 * @param {number} playerCount
 * @returns {object} New turn state
 */
export function advanceTurn(turnState, playerCount) {
  const { currentIndex, round, phase } = turnState;

  switch (phase) {
    case TurnPhase.PLAYER_TURN: {
      if (currentIndex < playerCount - 1) {
        return { ...turnState, currentIndex: currentIndex + 1 };
      }
      return { ...turnState, phase: TurnPhase.BOSS_TURN, currentIndex: 0 };
    }
    case TurnPhase.BOSS_TURN:
      return { ...turnState, phase: TurnPhase.ENVIRONMENT };
    case TurnPhase.ENVIRONMENT:
      return { ...turnState, phase: TurnPhase.CHECK_WIN };
    case TurnPhase.CHECK_WIN:
      return { ...turnState, phase: TurnPhase.NEXT_ROUND };
    case TurnPhase.NEXT_ROUND:
      return { ...turnState, phase: TurnPhase.PLAYER_TURN, round: round + 1, currentIndex: 0 };
    default:
      return turnState;
  }
}

/**
 * Return the currently active entity identifier.
 * @param {object} turnState
 * @returns {string|null}  Player ID, 'boss', 'environment', or null
 */
export function getActiveEntity(turnState) {
  switch (turnState.phase) {
    case TurnPhase.PLAYER_TURN:
      return turnState.order[turnState.currentIndex] ?? null;
    case TurnPhase.BOSS_TURN:
      return 'boss';
    case TurnPhase.ENVIRONMENT:
      return 'environment';
    default:
      return null;
  }
}

/**
 * Skip dead players when cycling through PLAYER_TURN.
 * @param {object} turnState
 * @param {object[]} players  Full player array with `id` and `isAlive` fields
 * @returns {object} Turn state pointing to next alive player (or BOSS_TURN if all dead)
 */
export function skipDeadPlayers(turnState, players) {
  if (turnState.phase !== TurnPhase.PLAYER_TURN) return turnState;

  let state = turnState;
  let attempts = 0;

  while (attempts < players.length) {
    const activeId = state.order[state.currentIndex];
    const player = players.find(p => p.id === activeId);
    if (player?.isAlive !== false) break; // alive or unknown
    state = advanceTurn(state, players.length);
    if (state.phase !== TurnPhase.PLAYER_TURN) break;
    attempts++;
  }

  return state;
}
