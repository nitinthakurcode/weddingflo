/**
 * Internal Budget Router - Stub
 *
 * Manages internal company budgets.
 * TODO: Implement full functionality
 */

import { router, protectedProcedure } from '@/server/trpc/trpc';
import { z } from 'zod';

export const internalBudgetRouter = router({
  // Placeholder - returns empty array
  list: protectedProcedure
    .input(z.object({ year: z.number().optional() }))
    .query(async () => {
      return [];
    }),
});
