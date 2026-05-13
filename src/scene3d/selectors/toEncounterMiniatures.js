// V2 M3 selector: compose a full list of MiniatureViewModels for a single
// zone — players in that zone, the boss if present, the wildlife mob if
// uncleared. The 3D scene layer renders whatever this returns.

import {
  getZoneSpawnPoints,
  playerToMiniatureViewModel,
  bossToMiniatureViewModel,
  mobToMiniatureViewModel,
} from './toMiniatureViewModel.js';

/**
 * @param {object} state    V1 engine state
 * @param {string} zoneId   The zone the scene is rendering
 * @param {object} options  { activeEntityId?, targetedId? }
 * @returns {object[]}      Array of MiniatureViewModel
 */
export function toEncounterMiniatures(state, zoneId, options = {}) {
  if (!state || !state.blueprint || !zoneId) return [];

  const spawnPoints = getZoneSpawnPoints(state.blueprint, zoneId);
  if (!spawnPoints) return [];

  const { activeEntityId = null, targetedId = null } = options;
  const minis = [];

  // Players in this zone (preserve `playerOrder` index for stable anchor slots)
  const playerOrder = state.playerOrder ?? Object.keys(state.players ?? {});
  let playerSlot = 0;
  for (const playerId of playerOrder) {
    const player = state.players?.[playerId];
    if (!player) continue;
    if (player.zone && player.zone !== zoneId) continue;
    const vm = playerToMiniatureViewModel(player, {
      spawnPoints,
      indexInZone: playerSlot,
      isActive: playerId === activeEntityId,
      isTargeted: player.id === targetedId,
    });
    if (vm) minis.push(vm);
    playerSlot += 1;
  }

  // Boss if present in this zone
  if (state.boss && state.boss.zone === zoneId && state.boss.alive !== false) {
    const vm = bossToMiniatureViewModel(state.boss, {
      spawnPoints,
      isActive: (state.boss.id ?? 'boss') === activeEntityId,
      isTargeted: targetedId === 'boss' || targetedId === (state.boss.id ?? 'boss'),
    });
    if (vm) minis.push(vm);
  }

  // Wildlife mob — exactly one per zone in V1's model
  const mob = state.zoneMobs?.[zoneId];
  if (mob) {
    const vm = mobToMiniatureViewModel(mob, {
      zoneId,
      spawnPoints,
      indexInZone: 0,
      isTargeted: targetedId === `mob:${zoneId}`,
    });
    if (vm) minis.push(vm);
  }

  return minis;
}
