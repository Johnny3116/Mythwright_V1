import { useMemo } from 'react';
import { useGameContext } from '@context/GameContext';
import { PLAYER_ACTIONS } from '@utils/constants';

/**
 * useTurnManager — Derived turn-state selectors computed from GameContext.
 *
 * Returns:
 *   currentEntityId  — id of the entity whose turn it currently is
 *   phase            — current game phase string
 *   isMyTurn         — true when it is the local player's turn
 *   isBossTurn       — true when it is the boss's turn
 *   availableActions — array of PLAYER_ACTIONS strings available to myPlayer
 *   round            — current round number
 *   turnOrder        — ordered array of entity ids
 */
export function useTurnManager() {
  const { gameState, blueprint, myPlayerId } = useGameContext();

  const currentEntityId = gameState?.currentTurnEntityId ?? null;
  const phase = gameState?.phase ?? null;
  const round = gameState?.round ?? 0;
  const turnOrder = gameState?.turnOrder ?? [];

  const isMyTurn =
    phase === 'PLAYER_TURN' && currentEntityId === myPlayerId;

  const isBossTurn = phase === 'BOSS_TURN';

  /**
   * Compute the list of actions available to the local player on their turn.
   * Actions are derived from game state and blueprint config — never hardcoded
   * beyond the PLAYER_ACTIONS constants themselves.
   */
  const availableActions = useMemo(() => {
    if (!isMyTurn || !gameState) return [];

    const actions = [];
    const myPlayer = myPlayerId ? (gameState.players[myPlayerId] ?? null) : null;

    if (!myPlayer) return actions;

    const myZoneId = myPlayer.zoneId;
    const bossZoneId = gameState.boss?.zoneId ?? null;
    const bossInSameZone = myZoneId !== null && myZoneId === bossZoneId;

    // ATTACK — only possible when the boss shares the player's zone.
    if (bossInSameZone) {
      actions.push(PLAYER_ACTIONS.ATTACK);
    }

    // USE_ABILITY — always available on the player's turn.
    actions.push(PLAYER_ACTIONS.USE_ABILITY);

    // SET_TRAP — available unless the campaign explicitly disables the trap system.
    const trapsEnabled = blueprint?.systems?.traps?.enabled !== false;
    if (trapsEnabled) {
      actions.push(PLAYER_ACTIONS.SET_TRAP);
    }

    // MOVE — always available.
    actions.push(PLAYER_ACTIONS.MOVE);

    // RETREAT — only when the boss is in the same zone (same condition as ATTACK).
    if (bossInSameZone) {
      actions.push(PLAYER_ACTIONS.RETREAT);
    }

    // SEARCH_FLORA — only when the current zone has flora.
    const zoneHasFlora = gameState.zones[myZoneId]?.hasFlora === true;
    if (zoneHasFlora) {
      actions.push(PLAYER_ACTIONS.SEARCH_FLORA);
    }

    // END_TURN — always available; listed last by convention.
    actions.push(PLAYER_ACTIONS.END_TURN);

    return actions;
  }, [isMyTurn, gameState, myPlayerId, blueprint]);

  return {
    currentEntityId,
    phase,
    isMyTurn,
    isBossTurn,
    availableActions,
    round,
    turnOrder,
  };
}
