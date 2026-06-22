/**
 * Gift Types Router
 *
 * Company-scoped gift type categories (the `gift_types` table).
 */

import { router, protectedProcedure } from '@/server/trpc/trpc';
import { z } from 'zod';
import { giftTypes } from '@/lib/db/schema';
import { and, eq, ilike, asc } from 'drizzle-orm';

export const giftTypesRouter = router({
  list: protectedProcedure
    .input(z.object({ search: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) return [];
      const conditions = [eq(giftTypes.companyId, ctx.companyId)];
      if (input.search) conditions.push(ilike(giftTypes.name, `%${input.search}%`));
      return ctx.db
        .select()
        .from(giftTypes)
        .where(and(...conditions))
        .orderBy(asc(giftTypes.name));
    }),
});
