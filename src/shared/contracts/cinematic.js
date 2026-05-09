import { z } from 'zod';

// V2: presentation-layer events consumed by the UI overlay system.
// Never stored in engine state — dispatched and consumed by the scene layer.
export const CinematicEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('ENCOUNTER_START'), title: z.string() }),
  z.object({ type: z.literal('VICTORY'), title: z.string() }),
  z.object({ type: z.literal('DEFEAT'), title: z.string() }),
  z.object({ type: z.literal('BOSS_EVOLUTION'), title: z.string() }),
  z.object({ type: z.literal('CRITICAL_HIT'), actorId: z.string() }),
]);

export function validateCinematicEvent(value) {
  return CinematicEventSchema.safeParse(value);
}
