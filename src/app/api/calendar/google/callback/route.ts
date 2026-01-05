import { NextRequest, NextResponse } from 'next/server';
import { GoogleCalendarOAuth } from '@/lib/calendar/google-oauth';
import { GoogleCalendarSync } from '@/lib/calendar/google-calendar-sync';
import { db, eq, sql } from '@/lib/db';
import { users } from '@/lib/db/schema';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // userId
  const error = searchParams.get('error');

  if (error || !code || !state) {
    return NextResponse.redirect(
      new URL('/dashboard/settings/calendar?error=oauth_failed', request.url)
    );
  }

  try {
    const oauth = new GoogleCalendarOAuth();
    const tokens = await oauth.getTokensFromCode(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error('Missing tokens');
    }

    // Get user's company_id using Drizzle
    const userResult = await db
      .select({ companyId: users.companyId })
      .from(users)
      .where(eq(users.authId, state))
      .limit(1);

    const userData = userResult[0];

    if (!userData?.companyId) {
      throw new Error('User not found');
    }

    // Get primary calendar ID
    const calendarSync = new GoogleCalendarSync();
    const calendarId = await calendarSync.getPrimaryCalendarId(
      tokens.access_token,
      tokens.refresh_token
    );

    // Store tokens in database using raw SQL for upsert
    await db.execute(sql`
      INSERT INTO google_calendar_tokens (user_id, company_id, access_token, refresh_token, token_expiry, scope, calendar_id)
      VALUES (${state}, ${userData.companyId}, ${tokens.access_token}, ${tokens.refresh_token},
              ${new Date(Date.now() + (tokens.expiry_date || 3600) * 1000).toISOString()},
              ${tokens.scope || ''}, ${calendarId})
      ON CONFLICT (user_id)
      DO UPDATE SET
        access_token = EXCLUDED.access_token,
        refresh_token = EXCLUDED.refresh_token,
        token_expiry = EXCLUDED.token_expiry,
        scope = EXCLUDED.scope,
        calendar_id = EXCLUDED.calendar_id,
        updated_at = NOW()
    `);

    // Enable Google sync in settings using raw SQL for upsert
    await db.execute(sql`
      INSERT INTO calendar_sync_settings (user_id, company_id, google_sync_enabled)
      VALUES (${state}, ${userData.companyId}, true)
      ON CONFLICT (user_id)
      DO UPDATE SET google_sync_enabled = true, updated_at = NOW()
    `);

    return NextResponse.redirect(
      new URL('/dashboard/settings/calendar?success=true', request.url)
    );
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/dashboard/settings/calendar?error=oauth_failed', request.url)
    );
  }
}
