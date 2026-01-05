/**
 * Calendar Router
 *
 * Handles iCal feed tokens, calendar sync settings, and Google Calendar integration.
 *
 * December 2025 Standards:
 * - Drizzle ORM for database access
 * - BetterAuth session for authentication
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, router } from '@/server/trpc/trpc';
import { ICalGenerator } from '@/lib/calendar/ical-generator';
import { updateICalSettingsSchema } from '@/lib/calendar/validation';
import { GoogleCalendarSync } from '@/lib/calendar/google-calendar-sync';
import { GoogleCalendarOAuth } from '@/lib/calendar/google-oauth';
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
        return {
          token: existing.token,
          feedUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/feed/${existing.token}`,
          isActive: existing.isActive,
        };
      }

      // Create new token
      const feedToken = ICalGenerator.generateSecureToken();

      const [newToken] = await db
        .insert(schema.icalFeedTokens)
        .values({
          userId,
          token: feedToken,
          isActive: true,
          includeEvents: true,
          includeTimeline: true,
          includeTasks: false,
        })
        .returning();

      // Create default settings
      await db.insert(schema.calendarSyncSettings).values({
        userId,
        provider: 'ical',
        isEnabled: true,
        syncEvents: true,
        syncTimeline: true,
        syncTasks: false,
      }).onConflictDoNothing();

      return {
        token: newToken.token,
        feedUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/feed/${newToken.token}`,
        isActive: newToken.isActive,
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

      const [updated] = await db
        .update(schema.icalFeedTokens)
        .set({
          token: newToken,
          lastAccessedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(schema.icalFeedTokens.userId, userId))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No existing token found',
        });
      }

      return {
        token: updated.token,
        feedUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/feed/${updated.token}`,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
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

      // Also get iCal token settings
      const icalToken = await db.query.icalFeedTokens.findFirst({
        where: eq(schema.icalFeedTokens.userId, userId),
      });

      return {
        ...settings,
        icalFeedEnabled: icalToken?.isActive ?? false,
        icalIncludeEvents: icalToken?.includeEvents ?? true,
        icalIncludeTimeline: icalToken?.includeTimeline ?? true,
        icalIncludeTasks: icalToken?.includeTasks ?? false,
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
    .input(updateICalSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      const { db, userId } = ctx;

      if (!userId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }

      try {
        // Update iCal token settings
        if (input.icalFeedEnabled !== undefined ||
            input.icalIncludeEvents !== undefined ||
            input.icalIncludeTimeline !== undefined ||
            input.icalIncludeTasks !== undefined) {

          const icalUpdates: Partial<{
            isActive: boolean;
            includeEvents: boolean;
            includeTimeline: boolean;
            includeTasks: boolean;
            updatedAt: Date;
          }> = { updatedAt: new Date() };

          if (input.icalFeedEnabled !== undefined) icalUpdates.isActive = input.icalFeedEnabled;
          if (input.icalIncludeEvents !== undefined) icalUpdates.includeEvents = input.icalIncludeEvents;
          if (input.icalIncludeTimeline !== undefined) icalUpdates.includeTimeline = input.icalIncludeTimeline;
          if (input.icalIncludeTasks !== undefined) icalUpdates.includeTasks = input.icalIncludeTasks;

          await db
            .update(schema.icalFeedTokens)
            .set(icalUpdates)
            .where(eq(schema.icalFeedTokens.userId, userId));
        }

        // Update main calendar settings
        const syncUpdates: Partial<{
          syncEvents: boolean;
          syncTimeline: boolean;
          syncTasks: boolean;
          updatedAt: Date;
        }> = { updatedAt: new Date() };

        if (input.icalIncludeEvents !== undefined) syncUpdates.syncEvents = input.icalIncludeEvents;
        if (input.icalIncludeTimeline !== undefined) syncUpdates.syncTimeline = input.icalIncludeTimeline;
        if (input.icalIncludeTasks !== undefined) syncUpdates.syncTasks = input.icalIncludeTasks;

        const [updated] = await db
          .update(schema.calendarSyncSettings)
          .set(syncUpdates)
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
   * Disable iCal feed
   */
  disableICalFeed: protectedProcedure.mutation(async ({ ctx }) => {
    const { db, userId } = ctx;

    if (!userId) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }

    try {
      await db
        .update(schema.icalFeedTokens)
        .set({ isActive: false, updatedAt: new Date() })
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
      await db
        .update(schema.icalFeedTokens)
        .set({ isActive: true, updatedAt: new Date() })
        .where(eq(schema.icalFeedTokens.userId, userId));

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

      // Get calendar settings for calendar ID
      const settings = await db.query.calendarSyncSettings.findFirst({
        where: and(
          eq(schema.calendarSyncSettings.userId, userId),
          eq(schema.calendarSyncSettings.provider, 'google')
        ),
      });

      return {
        connected: !!tokens && tokens.isValid,
        calendarId: settings?.calendarId,
        connectedAt: tokens?.createdAt,
        email: tokens?.email,
      };
    } catch (error) {
      console.error('Error getting Google Calendar status:', error);
      return {
        connected: false,
        calendarId: null,
        connectedAt: null,
        email: null,
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
          isEnabled: false,
          calendarId: null,
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

        if (!tokens || !tokens.isValid) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'Google Calendar not connected',
          });
        }

        // Get calendar settings for calendar ID
        const calendarSettings = await db.query.calendarSyncSettings.findFirst({
          where: and(
            eq(schema.calendarSyncSettings.userId, userId),
            eq(schema.calendarSyncSettings.provider, 'google')
          ),
        });

        if (!calendarSettings?.calendarId) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'Calendar ID not configured',
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

        const event = eventRow.event;

        // Check if already synced
        const existingSync = await db.query.calendarSyncedEvents.findFirst({
          where: and(
            eq(schema.calendarSyncedEvents.eventId, input.eventId),
            eq(schema.calendarSyncedEvents.provider, 'google')
          ),
        });

        const googleSync = new GoogleCalendarSync();
        const oauth = new GoogleCalendarOAuth();

        // Refresh token if needed
        let accessToken = tokens.accessToken;
        if (tokens.expiresAt && new Date(tokens.expiresAt) < new Date()) {
          if (!tokens.refreshToken) {
            throw new TRPCError({
              code: 'PRECONDITION_FAILED',
              message: 'Token expired and no refresh token available',
            });
          }
          const newTokens = await oauth.refreshAccessToken(tokens.refreshToken);
          accessToken = newTokens.access_token!;
          await db
            .update(schema.googleCalendarTokens)
            .set({
              accessToken,
              expiresAt: new Date(Date.now() + 3600000),
              lastRefreshedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(schema.googleCalendarTokens.userId, userId));
        }

        const googleEvent = {
          summary: event.title,
          description: event.description || event.notes || undefined,
          location: event.location || event.venueName || undefined,
          start: {
            dateTime: new Date(`${event.eventDate}T${event.startTime || '09:00:00'}`).toISOString(),
            timeZone: 'UTC',
          },
          end: {
            dateTime: new Date(`${event.eventDate}T${event.endTime || '17:00:00'}`).toISOString(),
            timeZone: 'UTC',
          },
          status: event.status === 'confirmed' ? 'confirmed' : 'tentative',
          reminders: { useDefault: true },
        };

        if (existingSync?.externalEventId) {
          // Update existing
          await googleSync.updateEvent(
            accessToken,
            tokens.refreshToken || '',
            calendarSettings.calendarId,
            existingSync.externalEventId,
            googleEvent
          );

          // Update sync record
          await db
            .update(schema.calendarSyncedEvents)
            .set({
              lastSyncAt: new Date(),
              syncStatus: 'synced',
              updatedAt: new Date(),
            })
            .where(eq(schema.calendarSyncedEvents.id, existingSync.id));
        } else {
          // Create new
          const result = await googleSync.createEvent(
            accessToken,
            tokens.refreshToken || '',
            calendarSettings.calendarId,
            googleEvent
          );

          // Save sync record
          await db.insert(schema.calendarSyncedEvents).values({
            userId,
            eventId: input.eventId,
            provider: 'google',
            externalEventId: result.id!,
            syncDirection: 'outbound',
            lastSyncAt: new Date(),
            syncStatus: 'synced',
            metadata: {
              calendarId: calendarSettings.calendarId,
            },
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
