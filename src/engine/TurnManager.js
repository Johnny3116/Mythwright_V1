/**
 * TurnManager — Cycle through player turns → boss turn → environment → next round
 *
 * Turn order: all players (in join order) → boss → environment phase → next round
 */

export const TurnPhase = {
  PLAYER_TURN: 'player',
  BOSS_TURN: 'boss',
  ENVIRONMENT: 'environment',
};

/**
 * Create a turn manager for the current game session.
 *
 * @param {string[]} playerIds - Ordered list of player IDs (join order)
 * @param {string} bossId - Boss entity ID
 * @returns {object} TurnManager instance
 */
export function createTurnManager(playerIds, bossId) {
  let activePlayers = [...playerIds];
  let currentIndex = 0;
  let phase = TurnPhase.PLAYER_TURN;
  let round = 1;
  let actedThisRound = new Set();

  function getCurrentEntity() {
    if (phase === TurnPhase.PLAYER_TURN) {
      return activePlayers[currentIndex] ?? null;
    }
    if (phase === TurnPhase.BOSS_TURN) return bossId;
    return 'environment';
  }

  function advance() {
    const current = getCurrentEntity();
    if (current) actedThisRound.add(current);

    if (phase === TurnPhase.PLAYER_TURN) {
      currentIndex += 1;
      if (currentIndex >= activePlayers.length) {
        currentIndex = 0;
        phase = TurnPhase.BOSS_TURN;
      }
    } else if (phase === TurnPhase.BOSS_TURN) {
      phase = TurnPhase.ENVIRONMENT;
    } else if (phase === TurnPhase.ENVIRONMENT) {
      round += 1;
      actedThisRound = new Set();
      currentIndex = 0;
      phase = TurnPhase.PLAYER_TURN;
    }
  }

  function startNewRound() {
    round += 1;
    actedThisRound = new Set();
    currentIndex = 0;
    phase = TurnPhase.PLAYER_TURN;
  }

  function removeEntity(entityId) {
    const idx = activePlayers.indexOf(entityId);
    if (idx === -1) return;
    activePlayers.splice(idx, 1);
    if (phase === TurnPhase.PLAYER_TURN && idx < currentIndex) {
      currentIndex = Math.max(0, currentIndex - 1);
    }
    if (phase === TurnPhase.PLAYER_TURN && activePlayers.length > 0 && currentIndex >= activePlayers.length) {
      currentIndex = 0;
      phase = TurnPhase.BOSS_TURN;
    }
  }

  function isRoundComplete() {
    return (
      activePlayers.every((id) => actedThisRound.has(id)) &&
      actedThisRound.has(bossId) &&
      actedThisRound.has('environment')
    );
  }

  function serialize() {
    return {
      activePlayers: [...activePlayers],
      bossId,
      currentIndex,
      phase,
      round,
      actedThisRound: [...actedThisRound],
    };
  }

  function deserialize(data) {
    activePlayers = [...data.activePlayers];
    currentIndex = data.currentIndex;
    phase = data.phase;
    round = data.round;
    actedThisRound = new Set(data.actedThisRound);
  }

  return {
    getCurrentEntity,
    advance,
    getPhase() { return phase; },
    getRound() { return round; },
    isRoundComplete,
    startNewRound,
    removeEntity,
    getActivePlayers() { return [...activePlayers]; },
    serialize,
    deserialize,
  };
}

// ─── Legacy functional API (kept for backwards compatibility) ─────────────────

/**
 * Initialize turn order from player list.
 * @param {string[]} playerIds
 * @returns {object} Turn state
 */
export function initializeTurnOrder(playerIds) {
  return {
    order: [...playerIds],
    currentIndex: 0,
    round: 1,
    phase: TurnPhase.PLAYER_TURN,
  };
}

/**
 * Advance to the next turn/phase in the cycle.
 * @param {object} turnState
 * @param {string} bossId
 * @returns {object} New turn state
 */
export function advanceTurn(turnState, bossId) {
  const state = { ...turnState };
  if (state.phase === TurnPhase.PLAYER_TURN) {
    state.currentIndex += 1;
    if (state.currentIndex >= state.order.length) {
      state.currentIndex = 0;
      state.phase = TurnPhase.BOSS_TURN;
    }
  } else if (state.phase === TurnPhase.BOSS_TURN) {
    state.phase = TurnPhase.ENVIRONMENT;
  } else {
    state.round += 1;
    state.currentIndex = 0;
    state.phase = TurnPhase.PLAYER_TURN;
  }
  return state;
}

/**
 * Get the currently active entity id.
 * @param {object} turnState
 * @param {string} bossId
 * @returns {string}
 */
export function getActiveEntity(turnState, bossId) {
  if (turnState.phase === TurnPhase.BOSS_TURN) return bossId;
  if (turnState.phase === TurnPhase.ENVIRONMENT) return 'environment';
  return turnState.order[turnState.currentIndex];
}
