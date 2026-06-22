/**
 * Internal Budget Router
 *
 * Internal company (operational) budgets — distinct from per-wedding client
 * budgets. No dedicated `internal_budgets` table exists yet; returns an empty
 * list (safe, non-throwing default) until the feature's schema is added.
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
