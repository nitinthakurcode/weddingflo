/**
 * Event Flow Router - Stub
 *
 * Manages event flow/schedule tracking for wedding events.
 * TODO: Implement full functionality
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
