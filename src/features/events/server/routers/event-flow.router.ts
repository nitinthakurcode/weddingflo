/**
 * Event Flow Router
 *
 * Event flow/schedule tracking. No dedicated `event_flow` table exists yet —
 * day-of flow currently lives in the timeline module. Returns an empty list
 * (safe, non-throwing default) until a dedicated table is introduced.
 */

import { router, protectedProcedure } from '@/server/trpc/trpc';
import { z } from 'zod';

export const eventFlowRouter = router({
  // Placeholder - returns empty array
  list: protectedProcedure
    .input(z.object({ eventId: z.string().optional() }))
    .query(async () => {
      return [];
    }),
});
