// V2 M3 selector: convert a V1 engine entity into a MiniatureViewModel for the
// 3D scene layer. Pure function — same inputs always produce the same output.
//
// The engine knows nothing about 3D positions; this selector resolves them by
// reading the blueprint's `defaultZoneSpawnPoints` (the per-zone spawn anchor
// template) plus a per-zone optional `spawnPoints` override.

import { MiniatureViewModelSchema } from '@shared/contracts/encounter.js';

const CLASS_RING_COLORS = {
  assault: '#e0533d',
  trapper: '#8b8b8b',
  medic:   '#3dc97a',
  support: '#3d8be0',
};

const DEFAULT_PLAYER_RING = '#9aa0a6';
const ENEMY_RING = '#e6a23d';
const BOSS_RING  = '#b0364a';

/**
 * Resolve the spawn point template for a zone — falling back to the blueprint
 * default if the zone has no override.
 */
export function getZoneSpawnPoints(blueprint, zoneId) {
  const zone = blueprint?.zones?.find((z) => z.id === zoneId);
  return zone?.spawnPoints ?? blueprint?.defaultZoneSpawnPoints ?? null;
}

/**
 * Pick a stable anchor by index, wrapping if there are more entities than
 * anchors. Returns the anchor's position or null if no anchors exist.
 */
function anchorAt(anchors, index) {
  if (!anchors || anchors.length === 0) return null;
  return anchors[index % anchors.length].position;
}

/**
 * Build a MiniatureViewModel for a player.
 * Returns null if anchors are missing — selector callers filter nulls out.
 */
export function playerToMiniatureViewModel(player, ctx) {
  const { spawnPoints, indexInZone, isActive, isTargeted } = ctx;
  if (!player || !spawnPoints) return null;
  // V2 M3: if the player has chosen an axisAnchor (PLAYER_SET_ANCHOR), use it;
  // otherwise fall back to the stable per-class indexed slot.
  const axisAnchor = player.axisAnchor
    ? spawnPoints.moveAnchors?.find((a) => a.id === player.axisAnchor)?.position
    : null;
  const position = axisAnchor ?? anchorAt(spawnPoints.players, indexInZone);
  if (!position) return null;

  const ringColor = CLASS_RING_COLORS[player.classId] ?? DEFAULT_PLAYER_RING;
  const vm = {
    id: player.id,
    name: player.name ?? player.id,
    modelUrl: player.modelUrl,
    position,
    rotation: 0,
    team: 'player',
    ringColor,
    hp: {
      current: Math.round(player.hp ?? 0),
      max: Math.round(player.maxHp ?? player.hp ?? 0),
    },
    statusEffects: extractStatusEffectNames(player),
    isActive: !!isActive,
    isTargeted: !!isTargeted,
  };
  return assertValid(vm);
}

/**
 * Build a MiniatureViewModel for the boss — only meaningful when the boss is
 * in the same zone the scene is rendering. Caller decides when to call this.
 */
export function bossToMiniatureViewModel(boss, ctx) {
  const { spawnPoints, isActive, isTargeted } = ctx;
  if (!boss || !spawnPoints?.boss) return null;
  const vm = {
    id: boss.id ?? 'boss',
    name: boss.name ?? 'Boss',
    modelUrl: boss.modelUrl,
    position: spawnPoints.boss.position,
    rotation: Math.PI,
    team: 'enemy',
    ringColor: BOSS_RING,
    hp: {
      current: Math.round(boss.hp ?? 0),
      max: Math.round(boss.maxHp ?? boss.hp ?? 0),
    },
    statusEffects: extractStatusEffectNames(boss),
    isActive: !!isActive,
    isTargeted: !!isTargeted,
  };
  return assertValid(vm);
}

/**
 * Build a MiniatureViewModel for a zone wildlife mob.
 * V1 mobs have no HP — they're binary (present | cleared), so we render hp = 1/1.
 */
export function mobToMiniatureViewModel(mob, ctx) {
  const { zoneId, spawnPoints, indexInZone = 0, isTargeted } = ctx;
  if (!mob || !mob.present || mob.cleared || !spawnPoints) return null;
  const position = anchorAt(spawnPoints.enemies, indexInZone);
  if (!position) return null;

  const vm = {
    id: `mob:${zoneId}`,
    name: mob.creature ?? 'Wildlife',
    position,
    rotation: Math.PI,
    team: 'enemy',
    ringColor: ENEMY_RING,
    hp: { current: 1, max: 1 },
    statusEffects: [],
    isActive: false,
    isTargeted: !!isTargeted,
  };
  return assertValid(vm);
}

function extractStatusEffectNames(entity) {
  if (!entity?.statusEffects) return [];
  if (Array.isArray(entity.statusEffects)) {
    return entity.statusEffects.map((e) => (typeof e === 'string' ? e : e.type)).filter(Boolean);
  }
  return [];
}

function assertValid(vm) {
  // In dev we throw on shape drift so tests fail loudly; in prod we strip and
  // hand back the object regardless. This mirrors the M2 contract pattern.
  const r = MiniatureViewModelSchema.safeParse(vm);
  if (!r.success && import.meta?.env?.DEV) {
    throw new Error(`Invalid MiniatureViewModel: ${JSON.stringify(r.error.format())}`);
  }
  return vm;
}
