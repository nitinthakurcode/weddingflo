/**
 * Gift Types Router - Stub
 *
 * Manages gift type categories and classifications.
 * TODO: Implement full functionality
 */

import { router, protectedProcedure } from '@/server/trpc/trpc';
import { z } from 'zod';

export const giftTypesRouter = router({
  // Placeholder - returns empty array
  list: protectedProcedure
    .input(z.object({ search: z.string().optional() }))
    .query(async () => {
      return [];
    }),
});
