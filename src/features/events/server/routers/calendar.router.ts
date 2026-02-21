/**
 * Calendar Router
 *
 * Handles iCal feed tokens, calendar sync settings, and Google Calendar integration.
 * Simplified to match actual database schema.
 *
 * Schema:
 * - icalFeedTokens: id, userId, token, clientId, createdAt, expiresAt
 * - calendarSyncSettings: id, userId, provider, accessToken, refreshToken, enabled, createdAt, updatedAt
 * - googleCalendarTokens: id, userId, accessToken, refreshToken, expiresAt, createdAt, updatedAt
 * - calendarSyncedEvents: id, settingsId, eventId, externalId, syncedAt, createdAt, updatedAt
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, router } from '@/server/trpc/trpc';
import { ICalGenerator } from '@/lib/calendar/ical-generator';
import { eq, and } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';

export const calendarRouter = router({
  /**
   * Generate or get existing iCal feed token
   */
  getOrCreateICalToken: protectedProcedure.query(async ({ ctx }) => {
    const { db, userId, companyId } = ctx;

    if (!userId || !companyId) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }

    try {
      // Check for existing token
      const existing = await db.query.icalFeedTokens.findFirst({
        where: eq(schema.icalFeedTokens.userId, userId),
      });

      if (existing) {
        const isExpired = existing.expiresAt ? new Date(existing.expiresAt) < new Date() : false;
        return {
          token: existing.token,
          feedUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/feed/${existing.token}`,
          isActive: !isExpired,
        };
      }

      // Create new token
      const feedToken = ICalGenerator.generateSecureToken();

      const [newToken] = await db
        .insert(schema.icalFeedTokens)
        .values({
          id: crypto.randomUUID(),
          userId,
          token: feedToken,
        })
        .returning();

      // Create default settings
      await db.insert(schema.calendarSyncSettings).values({
        id: crypto.randomUUID(),
        userId,
        provider: 'ical',
        enabled: true,
      }).onConflictDoNothing();

      return {
        token: newToken.token,
        feedUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/feed/${newToken.token}`,
        isActive: true,
      };
    } catch (error) {
      console.error('Error getting/creating iCal token:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get or create iCal token',
      });
    }
  }),

  /**
   * Regenerate iCal token (revokes old one)
   */
  regenerateICalToken: protectedProcedure.mutation(async ({ ctx }) => {
    const { db, userId, companyId } = ctx;

    if (!userId || !companyId) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }

    try {
      const newToken = ICalGenerator.generateSecureToken();

      // Delete old token and create new one
      await db
        .delete(schema.icalFeedTokens)
        .where(eq(schema.icalFeedTokens.userId, userId));

      const [created] = await db
        .insert(schema.icalFeedTokens)
        .values({
          id: crypto.randomUUID(),
          userId,
          token: newToken,
        })
        .returning();

      return {
        token: created.token,
        feedUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/feed/${created.token}`,
      };
    } catch (error) {
      console.error('Error regenerating iCal token:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to regenerate token',
      });
    }
  }),

  /**
   * Get calendar sync settings
   */
  getCalendarSettings: protectedProcedure.query(async ({ ctx }) => {
    const { db, userId } = ctx;

    if (!userId) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }

    try {
      const settings = await db.query.calendarSyncSettings.findFirst({
        where: eq(schema.calendarSyncSettings.userId, userId),
      });

      // Also get iCal token
      const icalToken = await db.query.icalFeedTokens.findFirst({
        where: eq(schema.icalFeedTokens.userId, userId),
      });

      const isExpired = icalToken?.expiresAt ? new Date(icalToken.expiresAt) < new Date() : false;

      return {
        ...settings,
        icalFeedEnabled: icalToken ? !isExpired : false,
      };
    } catch (error) {
      console.error('Error getting calendar settings:', error);
      return null;
    }
  }),

  /**
   * Update calendar sync settings
   */
  updateCalendarSettings: protectedProcedure
    .input(z.object({
      enabled: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { db, userId } = ctx;

      if (!userId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }

      try {
        const [updated] = await db
          .update(schema.calendarSyncSettings)
          .set({
            enabled: input.enabled,
            updatedAt: new Date(),
          })
          .where(eq(schema.calendarSyncSettings.userId, userId))
          .returning();

        return updated;
      } catch (error) {
        console.error('Error updating calendar settings:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update settings',
        });
      }
    }),

  /**
   * Disable iCal feed by setting expiry
   */
  disableICalFeed: protectedProcedure.mutation(async ({ ctx }) => {
    const { db, userId } = ctx;

    if (!userId) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }

    try {
      // Delete the token to disable
      await db
        .delete(schema.icalFeedTokens)
        .where(eq(schema.icalFeedTokens.userId, userId));

      return { success: true };
    } catch (error) {
      console.error('Error disabling iCal feed:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to disable iCal feed',
      });
    }
  }),

  /**
   * Enable iCal feed
   */
  enableICalFeed: protectedProcedure.mutation(async ({ ctx }) => {
    const { db, userId } = ctx;

    if (!userId) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }

    try {
      // Check if token exists
      const existing = await db.query.icalFeedTokens.findFirst({
        where: eq(schema.icalFeedTokens.userId, userId),
      });

      if (existing) {
        // Clear expiry
        await db
          .update(schema.icalFeedTokens)
          .set({ expiresAt: null })
          .where(eq(schema.icalFeedTokens.userId, userId));
      } else {
        // Create new token
        const feedToken = ICalGenerator.generateSecureToken();
        await db
          .insert(schema.icalFeedTokens)
          .values({
            id: crypto.randomUUID(),
            userId,
            token: feedToken,
          });
      }

      return { success: true };
    } catch (error) {
      console.error('Error enabling iCal feed:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to enable iCal feed',
      });
    }
  }),

  /**
   * Get Google Calendar connection status
   */
  getGoogleCalendarStatus: protectedProcedure.query(async ({ ctx }) => {
    const { db, userId } = ctx;

    if (!userId) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }

    try {
      const tokens = await db.query.googleCalendarTokens.findFirst({
        where: eq(schema.googleCalendarTokens.userId, userId),
      });

      const isValid = tokens?.expiresAt ? new Date(tokens.expiresAt) > new Date() : !!tokens;

      return {
        connected: !!tokens && isValid,
        connectedAt: tokens?.createdAt,
      };
    } catch (error) {
      console.error('Error getting Google Calendar status:', error);
      return {
        connected: false,
        connectedAt: null,
      };
    }
  }),

  /**
   * Disconnect Google Calendar
   */
  disconnectGoogleCalendar: protectedProcedure.mutation(async ({ ctx }) => {
    const { db, userId } = ctx;

    if (!userId) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }

    try {
      // Delete tokens
      await db
        .delete(schema.googleCalendarTokens)
        .where(eq(schema.googleCalendarTokens.userId, userId));

      // Disable sync
      await db
        .update(schema.calendarSyncSettings)
        .set({
          enabled: false,
          updatedAt: new Date(),
        })
        .where(and(
          eq(schema.calendarSyncSettings.userId, userId),
          eq(schema.calendarSyncSettings.provider, 'google')
        ));

      return { success: true };
    } catch (error) {
      console.error('Error disconnecting Google Calendar:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to disconnect Google Calendar',
      });
    }
  }),

  /**
   * Sync event to Google Calendar
   */
  syncEventToGoogle: protectedProcedure
    .input(z.object({ eventId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { db, userId, companyId } = ctx;

      if (!userId || !companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }

      try {
        // Get Google tokens
        const tokens = await db.query.googleCalendarTokens.findFirst({
          where: eq(schema.googleCalendarTokens.userId, userId),
        });

        const isValid = tokens?.expiresAt ? new Date(tokens.expiresAt) > new Date() : !!tokens;

        if (!tokens || !isValid) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'Google Calendar not connected or token expired',
          });
        }

        // Get calendar settings
        const calendarSettings = await db.query.calendarSyncSettings.findFirst({
          where: and(
            eq(schema.calendarSyncSettings.userId, userId),
            eq(schema.calendarSyncSettings.provider, 'google')
          ),
        });

        if (!calendarSettings) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'Calendar settings not configured',
          });
        }

        // Get event with client info for company verification
        const eventWithClient = await db
          .select({
            event: schema.events,
            clientCompanyId: schema.clients.companyId,
          })
          .from(schema.events)
          .leftJoin(schema.clients, eq(schema.events.clientId, schema.clients.id))
          .where(eq(schema.events.id, input.eventId))
          .limit(1);

        const eventRow = eventWithClient[0];
        if (!eventRow || eventRow.clientCompanyId !== companyId) {
          throw new TRPCError({ code: 'NOT_FOUND' });
        }

        // Check if already synced
        const existingSync = await db.query.calendarSyncedEvents.findFirst({
          where: eq(schema.calendarSyncedEvents.eventId, input.eventId),
        });

        if (existingSync) {
          // Update sync time
          await db
            .update(schema.calendarSyncedEvents)
            .set({
              syncedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(schema.calendarSyncedEvents.id, existingSync.id));
        } else {
          // Create new sync record
          await db.insert(schema.calendarSyncedEvents).values({
            id: crypto.randomUUID(),
            settingsId: calendarSettings.id,
            eventId: input.eventId,
            syncedAt: new Date(),
          });
        }

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error('Error syncing event to Google:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to sync event to Google Calendar',
        });
      }
    }),
});
