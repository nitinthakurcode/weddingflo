/**
 * Guest Gifts Router
 *
 * Gifts given TO guests (party favors, welcome bags, etc.) — the `guest_gifts`
 * table, scoped to a client whose company is verified against the session.
 */

import { router, protectedProcedure } from '@/server/trpc/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { guestGifts, clients } from '@/lib/db/schema';
import { and, eq, isNull, desc } from 'drizzle-orm';

export const guestGiftsRouter = router({
  list: protectedProcedure
    .input(z.object({
      clientId: z.string().optional(),
      eventId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId || !input.clientId) return [];

      // Verify the client belongs to this company (and is not soft-deleted)
      const [client] = await ctx.db
        .select({ id: clients.id })
        .from(clients)
        .where(and(eq(clients.id, input.clientId), eq(clients.companyId, ctx.companyId), isNull(clients.deletedAt)))
        .limit(1);
      if (!client) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Client not found or access denied' });
      }

      return ctx.db
        .select()
        .from(guestGifts)
        .where(eq(guestGifts.clientId, input.clientId))
        .orderBy(desc(guestGifts.createdAt));
    }),
});
