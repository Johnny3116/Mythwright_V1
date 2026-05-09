import { z } from 'zod';

// What a player client sends to the host
export const ActionIntentSchema = z.object({
  type: z.string(),          // ActionTypes constant
  playerId: z.string(),
  payload: z.record(z.unknown()).optional(),
});

// What the engine returns after resolving a combat action
export const CombatResultSchema = z.object({
  hit: z.boolean(),
  critical: z.boolean(),
  damageRoll: z.number().int().min(0),
  damageDealt: z.number().int().min(0),
  effectsApplied: z.array(z.string()),
  narrative: z.string(),
  tier: z.string().optional(),
  fumble: z.boolean().optional(),
});

export function validateActionIntent(value) {
  return ActionIntentSchema.safeParse(value);
}

export function validateCombatResult(value) {
  return CombatResultSchema.safeParse(value);
}
