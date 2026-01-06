/**
 * Guest Gifts Router - Stub
 *
 * Manages gifts to be given TO guests (party favors, welcome bags, etc.)
 * TODO: Implement full functionality
 */

import { router, protectedProcedure } from '@/server/trpc/trpc';
import { z } from 'zod';

export const guestGiftsRouter = router({
  // Placeholder - returns empty array
  list: protectedProcedure
    .input(z.object({ eventId: z.string().optional() }))
    .query(async () => {
      return [];
    }),
});
