import { z } from 'zod';
import { router, protectedProcedure } from '../../../../server/trpc/trpc';
import { TRPCError } from '@trpc/server';

/**
 * Google Sheets Router
 *
 * Handles syncing wedding data to Google Sheets for backup and sharing.
 *
 * Status: Stub implementation - Full feature coming soon
 */
export const googleSheetsRouter = router({
  /**
   * Sync client data to Google Sheets
   *
   * Currently returns a "coming soon" message.
   * Full implementation will:
   * - Connect to Google Sheets API
   * - Create/update spreadsheet with client data
   * - Return spreadsheet URL
   */
  syncNow: protectedProcedure
    .input(z.object({
      clientId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      // TODO: Implement full Google Sheets sync
      // For now, return a helpful message
      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'Google Sheets sync is coming soon! Use "Export Master Sheet" for now.',
      });
    }),

  /**
   * Get sync status for a client
   */
  getSyncStatus: protectedProcedure
    .input(z.object({
      clientId: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      return {
        lastSynced: null,
        spreadsheetUrl: null,
        status: 'not_configured' as const,
      };
    }),

  /**
   * Configure Google Sheets connection
   */
  configure: protectedProcedure
    .input(z.object({
      spreadsheetId: z.string().optional(),
      createNew: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'Google Sheets configuration is coming soon!',
      });
    }),
});
