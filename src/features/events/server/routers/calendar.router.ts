import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, router } from '@/server/trpc/trpc';
import { ICalGenerator } from '@/lib/calendar/ical-generator';
import {
  generateICalTokenSchema,
  updateICalSettingsSchema,
} from '@/lib/calendar/validation';
import { GoogleCalendarSync } from '@/lib/calendar/google-calendar-sync';
import { GoogleCalendarOAuth } from '@/lib/calendar/google-oauth';

export const calendarRouter = router({
  // Generate or get existing iCal feed token
  getOrCreateICalToken: protectedProcedure.query(async ({ ctx }) => {
    const { supabase, userId, companyId } = ctx;

    if (!userId || !companyId) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }

    // Check for existing token
    const { data: existing } = await supabase
      .from('ical_feed_tokens')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (existing) {
      return {
        token: existing.feed_token,
        feedUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/feed/${existing.feed_token}`,
        isActive: existing.is_active,
      };
    }

    // Create new token
    const feedToken = ICalGenerator.generateSecureToken();

    const { data, error } = await supabase
      .from('ical_feed_tokens')
      .insert({
        user_id: userId,
        company_id: companyId,
        feed_token: feedToken,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create iCal token',
      });
    }

    // Create default settings
    await supabase.from('calendar_sync_settings').insert({
      user_id: userId,
      company_id: companyId,
      ical_feed_enabled: true,
    });

    return {
      token: data.feed_token,
      feedUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/feed/${data.feed_token}`,
      isActive: data.is_active,
    };
  }),

  // Regenerate iCal token (revokes old one)
  regenerateICalToken: protectedProcedure.mutation(async ({ ctx }) => {
    const { supabase, userId, companyId } = ctx;

    if (!userId || !companyId) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }

    const newToken = ICalGenerator.generateSecureToken();

    const { data, error } = await supabase
      .from('ical_feed_tokens')
      .update({
        feed_token: newToken,
        access_count: 0,
        last_accessed: null,
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to regenerate token',
      });
    }

    return {
      token: data.feed_token,
      feedUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/feed/${data.feed_token}`,
    };
  }),

  // Get calendar sync settings
  getCalendarSettings: protectedProcedure.query(async ({ ctx }) => {
    const { supabase, userId } = ctx;

    if (!userId) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }

    const { data } = await supabase
      .from('calendar_sync_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    return data;
  }),

  // Update calendar sync settings
  updateCalendarSettings: protectedProcedure
    .input(updateICalSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      const { supabase, userId } = ctx;

      if (!userId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }

      // Transform camelCase to snake_case for database
      const dbInput: Record<string, boolean> = {};
      if (input.icalFeedEnabled !== undefined) dbInput.ical_feed_enabled = input.icalFeedEnabled;
      if (input.icalIncludeEvents !== undefined) dbInput.ical_include_events = input.icalIncludeEvents;
      if (input.icalIncludeTimeline !== undefined) dbInput.ical_include_timeline = input.icalIncludeTimeline;
      if (input.icalIncludeTasks !== undefined) dbInput.ical_include_tasks = input.icalIncludeTasks;

      const { data, error } = await supabase
        .from('calendar_sync_settings')
        .update(dbInput)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update settings',
        });
      }

      return data;
    }),

  // Disable iCal feed
  disableICalFeed: protectedProcedure.mutation(async ({ ctx }) => {
    const { supabase, userId } = ctx;

    if (!userId) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }

    await supabase
      .from('ical_feed_tokens')
      .update({ is_active: false })
      .eq('user_id', userId);

    return { success: true };
  }),

  // Enable iCal feed
  enableICalFeed: protectedProcedure.mutation(async ({ ctx }) => {
    const { supabase, userId } = ctx;

    if (!userId) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }

    await supabase
      .from('ical_feed_tokens')
      .update({ is_active: true })
      .eq('user_id', userId);

    return { success: true };
  }),

  // Get Google Calendar connection status
  getGoogleCalendarStatus: protectedProcedure.query(async ({ ctx }) => {
    const { supabase, userId } = ctx;

    if (!userId) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }

    const { data } = await supabase
      .from('google_calendar_tokens')
      .select('calendar_id, token_expiry, created_at')
      .eq('user_id', userId)
      .single();

    return {
      connected: !!data,
      calendarId: data?.calendar_id,
      connectedAt: data?.created_at,
    };
  }),

  // Disconnect Google Calendar
  disconnectGoogleCalendar: protectedProcedure.mutation(async ({ ctx }) => {
    const { supabase, userId } = ctx;

    if (!userId) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }

    // Delete tokens
    await supabase
      .from('google_calendar_tokens')
      .delete()
      .eq('user_id', userId);

    // Disable sync
    await supabase
      .from('calendar_sync_settings')
      .update({ google_sync_enabled: false })
      .eq('user_id', userId);

    return { success: true };
  }),

  // Sync event to Google Calendar
  syncEventToGoogle: protectedProcedure
    .input(z.object({ eventId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { supabase, userId, companyId } = ctx;

      if (!userId || !companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }

      // Get Google tokens
      const { data: tokens } = await supabase
        .from('google_calendar_tokens')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!tokens) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Google Calendar not connected',
        });
      }

      if (!tokens.calendar_id) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Calendar ID not configured',
        });
      }

      // Get event
      const { data: event } = await supabase
        .from('events')
        .select('*, clients!inner(company_id)')
        .eq('id', input.eventId)
        .eq('clients.company_id', companyId)
        .single();

      if (!event) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      // Check if already synced
      const { data: existingSync } = await supabase
        .from('calendar_synced_events')
        .select('google_event_id')
        .eq('event_id', input.eventId)
        .single();

      const googleSync = new GoogleCalendarSync();
      const oauth = new GoogleCalendarOAuth();

      // Refresh token if needed
      let accessToken = tokens.access_token;
      if (new Date(tokens.token_expiry) < new Date()) {
        const newTokens = await oauth.refreshAccessToken(tokens.refresh_token);
        accessToken = newTokens.access_token!;
        await supabase
          .from('google_calendar_tokens')
          .update({
            access_token: accessToken,
            token_expiry: new Date(Date.now() + 3600000).toISOString(),
          })
          .eq('user_id', userId);
      }

      const googleEvent = {
        summary: event.title,
        description: (event.description || event.notes) || undefined,
        location: (event.location || event.venue_name) || undefined,
        start: {
          dateTime: new Date(`${event.event_date}T${event.start_time || '09:00:00'}`).toISOString(),
          timeZone: 'UTC',
        },
        end: {
          dateTime: new Date(`${event.event_date}T${event.end_time || '17:00:00'}`).toISOString(),
          timeZone: 'UTC',
        },
        status: event.status === 'confirmed' ? 'confirmed' : 'tentative',
        reminders: { useDefault: true },
      };

      if (existingSync?.google_event_id) {
        // Update existing
        await googleSync.updateEvent(
          accessToken,
          tokens.refresh_token,
          tokens.calendar_id,
          existingSync.google_event_id,
          googleEvent
        );
      } else {
        // Create new
        const result = await googleSync.createEvent(
          accessToken,
          tokens.refresh_token,
          tokens.calendar_id,
          googleEvent
        );

        // Save sync record
        await supabase.from('calendar_synced_events').insert({
          company_id: companyId,
          user_id: userId,
          event_id: input.eventId,
          google_event_id: result.id!,
          google_calendar_id: tokens.calendar_id,
          sync_status: 'synced',
        });
      }

      return { success: true };
    }),
});
