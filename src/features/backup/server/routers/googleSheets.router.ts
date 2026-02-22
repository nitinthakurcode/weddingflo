import { z } from 'zod';
import { router, protectedProcedure } from '../../../../server/trpc/trpc';
import { TRPCError } from '@trpc/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { googleSheetsSyncSettings, clients } from '@/lib/db/schema';
import {
  GoogleSheetsOAuth,
  createSpreadsheet,
} from '@/lib/google/sheets-client';
import {
  syncAllToSheets,
  importGuestsFromSheet,
  importBudgetFromSheet,
  importVendorsFromSheet,
  importHotelsFromSheet,
  importTransportFromSheet,
  importTimelineFromSheet,
  importGiftsFromSheet,
  importAllFromSheets,
} from '@/lib/google/sheets-sync';

/**
 * Google Sheets Router
 *
 * Handles bi-directional sync between WeddingFlo and Google Sheets.
 *
 * February 2026 - Full implementation with OAuth and bi-directional sync
 */
export const googleSheetsRouter = router({
  /**
   * Get OAuth authorization URL for Google Sheets
   */
  getAuthUrl: protectedProcedure
    .query(async ({ ctx }) => {
      const oauth = new GoogleSheetsOAuth();
      const authUrl = oauth.getAuthUrl(ctx.userId);
      return { authUrl };
    }),

  /**
   * Handle OAuth callback - exchange code for tokens
   */
  handleOAuthCallback: protectedProcedure
    .input(z.object({
      code: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const oauth = new GoogleSheetsOAuth();

      try {
        const tokens = await oauth.getTokensFromCode(input.code);

        // Store tokens in database
        // Check if settings exist for this user
        const existing = await db.query.googleSheetsSyncSettings.findFirst({
          where: eq(googleSheetsSyncSettings.userId, ctx.userId),
        });

        if (existing) {
          await db
            .update(googleSheetsSyncSettings)
            .set({
              accessToken: tokens.access_token,
              refreshToken: tokens.refresh_token,
              tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
              isConnected: true,
              updatedAt: new Date(),
            })
            .where(eq(googleSheetsSyncSettings.id, existing.id));
        } else {
          await db.insert(googleSheetsSyncSettings).values({
            userId: ctx.userId,
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
            isConnected: true,
          });
        }

        return { success: true };
      } catch (error: any) {
        console.error('[Google Sheets] OAuth callback error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to connect Google Sheets: ${error.message}`,
        });
      }
    }),

  /**
   * Check if Google Sheets is connected
   */
  isConnected: protectedProcedure
    .query(async ({ ctx }) => {
      const settings = await db.query.googleSheetsSyncSettings.findFirst({
        where: eq(googleSheetsSyncSettings.userId, ctx.userId),
      });

      return {
        connected: settings?.isConnected ?? false,
        hasTokens: !!(settings?.accessToken && settings?.refreshToken),
      };
    }),

  /**
   * Disconnect Google Sheets
   */
  disconnect: protectedProcedure
    .mutation(async ({ ctx }) => {
      await db
        .update(googleSheetsSyncSettings)
        .set({
          isConnected: false,
          accessToken: null,
          refreshToken: null,
          tokenExpiresAt: null,
          updatedAt: new Date(),
        })
        .where(eq(googleSheetsSyncSettings.userId, ctx.userId));

      return { success: true };
    }),

  /**
   * Sync client data to Google Sheets
   */
  syncNow: protectedProcedure
    .input(z.object({
      clientId: z.string(),
    }))
    .mutation(async ({ input, ctx }): Promise<{
      success: boolean;
      spreadsheetUrl?: string;
      totalExported?: number;
      errors?: string[];
    }> => {
      // Get user's Google Sheets settings
      const settings = await db.query.googleSheetsSyncSettings.findFirst({
        where: eq(googleSheetsSyncSettings.userId, ctx.userId),
      });

      if (!settings?.accessToken || !settings?.refreshToken) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Google Sheets not connected. Please connect your Google account first.',
        });
      }

      // Get client info for spreadsheet name
      const client = await db.query.clients.findFirst({
        where: and(
          eq(clients.id, input.clientId),
          eq(clients.companyId, ctx.companyId!)
        ),
      });

      if (!client) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Client not found' });
      }

      const oauth = new GoogleSheetsOAuth();
      let accessToken = settings.accessToken;

      // Refresh token if expired
      if (settings.tokenExpiresAt && new Date(settings.tokenExpiresAt) < new Date()) {
        try {
          const newTokens = await oauth.refreshAccessToken(settings.refreshToken);
          accessToken = newTokens.access_token;

          // Update stored tokens
          await db
            .update(googleSheetsSyncSettings)
            .set({
              accessToken: newTokens.access_token,
              refreshToken: newTokens.refresh_token,
              tokenExpiresAt: newTokens.expiry_date ? new Date(newTokens.expiry_date) : null,
              updatedAt: new Date(),
            })
            .where(eq(googleSheetsSyncSettings.id, settings.id));
        } catch (error: any) {
          console.error('[Google Sheets] Token refresh failed:', error);
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Google Sheets session expired. Please reconnect.',
          });
        }
      }

      const sheetsClient = oauth.getSheetsClient(accessToken, settings.refreshToken);

      // Get or create spreadsheet for this client
      let spreadsheetId = settings.spreadsheetId;
      let spreadsheetUrl = settings.spreadsheetUrl;

      if (!spreadsheetId) {
        try {
          const clientName = `${client.partner1FirstName || ''} ${client.partner1LastName || ''}`.trim() || 'Wedding';
          const result = await createSpreadsheet(sheetsClient, clientName);
          spreadsheetId = result.spreadsheetId;
          spreadsheetUrl = result.spreadsheetUrl;

          // Save spreadsheet info
          await db
            .update(googleSheetsSyncSettings)
            .set({
              spreadsheetId,
              spreadsheetUrl,
              updatedAt: new Date(),
            })
            .where(eq(googleSheetsSyncSettings.id, settings.id));
        } catch (error: any) {
          console.error('[Google Sheets] Failed to create spreadsheet:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Failed to create Google Spreadsheet: ${error.message}`,
          });
        }
      }

      // Sync all modules
      const syncResult = await syncAllToSheets(
        sheetsClient,
        spreadsheetId,
        input.clientId,
        ctx.companyId!
      );

      // Update last synced timestamp
      await db
        .update(googleSheetsSyncSettings)
        .set({
          lastSyncedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(googleSheetsSyncSettings.id, settings.id));

      return {
        success: syncResult.success,
        spreadsheetUrl: spreadsheetUrl || undefined,
        totalExported: syncResult.totalExported,
        errors: syncResult.errors.length > 0 ? syncResult.errors : undefined,
      };
    }),

  /**
   * Get sync status for a client
   */
  getSyncStatus: protectedProcedure
    .input(z.object({
      clientId: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      const settings = await db.query.googleSheetsSyncSettings.findFirst({
        where: eq(googleSheetsSyncSettings.userId, ctx.userId),
      });

      if (!settings) {
        return {
          lastSynced: null,
          spreadsheetUrl: null,
          status: 'not_configured' as const,
          isConnected: false,
        };
      }

      return {
        lastSynced: settings.lastSyncedAt,
        spreadsheetUrl: settings.spreadsheetUrl,
        status: settings.isConnected
          ? (settings.spreadsheetId ? 'configured' as const : 'connected' as const)
          : 'not_configured' as const,
        isConnected: settings.isConnected,
      };
    }),

  /**
   * Configure Google Sheets connection (set existing spreadsheet)
   */
  configure: protectedProcedure
    .input(z.object({
      spreadsheetId: z.string().optional(),
      createNew: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      const settings = await db.query.googleSheetsSyncSettings.findFirst({
        where: eq(googleSheetsSyncSettings.userId, ctx.userId),
      });

      if (!settings?.accessToken || !settings?.refreshToken) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Google Sheets not connected. Please connect your Google account first.',
        });
      }

      if (input.spreadsheetId) {
        // Use existing spreadsheet
        const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${input.spreadsheetId}`;

        await db
          .update(googleSheetsSyncSettings)
          .set({
            spreadsheetId: input.spreadsheetId,
            spreadsheetUrl,
            updatedAt: new Date(),
          })
          .where(eq(googleSheetsSyncSettings.id, settings.id));

        return {
          success: true,
          spreadsheetUrl,
        };
      }

      // createNew will be handled on first sync
      return { success: true };
    }),

  /**
   * Import changes from Google Sheets (bi-directional sync)
   */
  importFromSheet: protectedProcedure
    .input(z.object({
      clientId: z.string(),
      module: z.enum(['guests', 'budget', 'vendors', 'hotels', 'transport', 'timeline', 'gifts', 'all']).default('guests'),
    }))
    .mutation(async ({ input, ctx }) => {
      const settings = await db.query.googleSheetsSyncSettings.findFirst({
        where: eq(googleSheetsSyncSettings.userId, ctx.userId),
      });

      if (!settings?.accessToken || !settings?.refreshToken || !settings?.spreadsheetId) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Google Sheets not configured. Please sync first to create a spreadsheet.',
        });
      }

      const oauth = new GoogleSheetsOAuth();
      let accessToken = settings.accessToken;

      // Refresh token if expired
      if (settings.tokenExpiresAt && new Date(settings.tokenExpiresAt) < new Date()) {
        const newTokens = await oauth.refreshAccessToken(settings.refreshToken);
        accessToken = newTokens.access_token;

        await db
          .update(googleSheetsSyncSettings)
          .set({
            accessToken: newTokens.access_token,
            refreshToken: newTokens.refresh_token,
            tokenExpiresAt: newTokens.expiry_date ? new Date(newTokens.expiry_date) : null,
            updatedAt: new Date(),
          })
          .where(eq(googleSheetsSyncSettings.id, settings.id));
      }

      const sheetsClient = oauth.getSheetsClient(accessToken, settings.refreshToken);

      // Handle all modules import
      if (input.module === 'all') {
        const allResult = await importAllFromSheets(
          sheetsClient,
          settings.spreadsheetId,
          input.clientId,
          ctx.companyId!
        );

        return {
          success: allResult.success,
          imported: allResult.totalImported,
          byModule: allResult.byModule,
          errors: allResult.errors.length > 0 ? allResult.errors : undefined,
        };
      }

      // Handle individual module import
      let result;
      switch (input.module) {
        case 'guests':
          result = await importGuestsFromSheet(sheetsClient, settings.spreadsheetId, input.clientId);
          break;
        case 'budget':
          result = await importBudgetFromSheet(sheetsClient, settings.spreadsheetId, input.clientId);
          break;
        case 'vendors':
          result = await importVendorsFromSheet(sheetsClient, settings.spreadsheetId, input.clientId, ctx.companyId!);
          break;
        case 'hotels':
          result = await importHotelsFromSheet(sheetsClient, settings.spreadsheetId, input.clientId);
          break;
        case 'transport':
          result = await importTransportFromSheet(sheetsClient, settings.spreadsheetId, input.clientId);
          break;
        case 'timeline':
          result = await importTimelineFromSheet(sheetsClient, settings.spreadsheetId, input.clientId);
          break;
        case 'gifts':
          result = await importGiftsFromSheet(sheetsClient, settings.spreadsheetId, input.clientId);
          break;
        default:
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Import for module '${input.module}' not supported`,
          });
      }

      return {
        success: result.errors.length === 0,
        imported: result.imported,
        errors: result.errors.length > 0 ? result.errors : undefined,
      };
    }),
});
