/**
 * Guest Transport Router - Stub
 *
 * Manages guest travel and transport logistics.
 * TODO: Implement full functionality
 */

import { router, protectedProcedure } from '@/server/trpc/trpc';
import { z } from 'zod';

export const guestTransportRouter = router({
  // Placeholder - returns empty array
  list: protectedProcedure
    .input(z.object({ eventId: z.string().optional() }))
    .query(async () => {
      return [];
    }),
});
