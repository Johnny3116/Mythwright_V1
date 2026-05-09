import { z } from 'zod';

// Shape returned by DiceSystem.rollD20()
export const DiceResultSchema = z.object({
  natural: z.number().int().min(1).max(20),
  modified: z.number().int(),
  modifier: z.number().int(),
});

// Shape returned by DiceSystem.rollD20() extended with outcome tier (Phase 11)
export const TieredDiceResultSchema = DiceResultSchema.extend({
  tier: z.enum(['critFail', 'miss', 'glancing', 'hit', 'critHit']).optional(),
});

export function validateDiceResult(value) {
  return DiceResultSchema.safeParse(value);
}
