import { z } from 'zod';

// V2: view model passed from engine state → 3D scene layer for each entity
export const MiniatureViewModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  modelUrl: z.string().optional(),   // empty = use placeholder capsule
  position: z.object({ x: z.number(), y: z.number(), z: z.number() }),
  rotation: z.number(),              // Y-axis rotation in radians
  team: z.enum(['player', 'enemy', 'neutral']),
  ringColor: z.string(),             // CSS color — critical for battlefield readability
  hp: z.object({ current: z.number().int(), max: z.number().int() }),
  statusEffects: z.array(z.string()),
  isActive: z.boolean(),
  isTargeted: z.boolean(),
});

// V2: authored encounter scene definition (lives in campaigns/tzorath/encounters/)
export const TerrainPieceSchema = z.object({
  type: z.string(),
  position: z.object({ x: z.number(), y: z.number(), z: z.number() }),
  rotation: z.number().optional(),
  scale: z.object({ x: z.number(), y: z.number(), z: z.number() }).optional(),
});

export const SpawnPointSchema = z.object({
  id: z.string(),
  team: z.enum(['player', 'enemy', 'neutral']),
  position: z.object({ x: z.number(), y: z.number(), z: z.number() }),
});

export const EncounterSceneSchema = z.object({
  id: z.string(),
  name: z.string(),
  map: z.object({
    sceneUrl: z.string().optional(),
    terrainPieces: z.array(TerrainPieceSchema),
    bounds: z.object({ width: z.number(), height: z.number() }),
    gridSize: z.number(),
  }),
  spawnPoints: z.array(SpawnPointSchema),
});

export function validateMiniatureViewModel(value) {
  return MiniatureViewModelSchema.safeParse(value);
}

export function validateEncounterScene(value) {
  return EncounterSceneSchema.safeParse(value);
}
