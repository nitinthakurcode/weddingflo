import { NextRequest, NextResponse } from 'next/server';
import { GoogleCalendarOAuth } from '@/lib/calendar/google-oauth';
import { GoogleCalendarSync } from '@/lib/calendar/google-calendar-sync';
import { createClient } from '@supabase/supabase-js';

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
    // Create Supabase client inside handler (not at module level)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    );
    const oauth = new GoogleCalendarOAuth();
    const tokens = await oauth.getTokensFromCode(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error('Missing tokens');
    }

    // Get user's company_id
    const { data: userData } = await supabase
      .from('users')
      .select('company_id')
      .eq('clerk_id', state)
      .single();

    if (!userData?.company_id) {
      throw new Error('User not found');
    }

    // Get primary calendar ID
    const calendarSync = new GoogleCalendarSync();
    const calendarId = await calendarSync.getPrimaryCalendarId(
      tokens.access_token,
      tokens.refresh_token
    );

    // Store tokens in database
    await supabase.from('google_calendar_tokens').upsert({
      user_id: state,
      company_id: userData.company_id,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expiry: new Date(Date.now() + (tokens.expiry_date || 3600) * 1000).toISOString(),
      scope: tokens.scope || '',
      calendar_id: calendarId,
    });

    // Enable Google sync in settings
    await supabase.from('calendar_sync_settings').upsert({
      user_id: state,
      company_id: userData.company_id,
      google_sync_enabled: true,
    });

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
