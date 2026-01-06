/**
 * Pipeline Router - Stub
 *
 * Manages client sales pipeline and stages.
 * TODO: Implement full functionality
 */

import { router, protectedProcedure } from '@/server/trpc/trpc';
import { z } from 'zod';

export const pipelineRouter = router({
  // Placeholder - returns empty array
  list: protectedProcedure
    .input(z.object({ status: z.string().optional() }))
    .query(async () => {
      return [];
    }),
});
