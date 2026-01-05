import { NextRequest, NextResponse } from 'next/server';
import { GoogleCalendarOAuth } from '@/lib/calendar/google-oauth';
import { getServerSession } from '@/lib/auth/server';

export async function GET(request: NextRequest) {
  const { userId } = await getServerSession();

  if (!userId) {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }

  const oauth = new GoogleCalendarOAuth();
  const authUrl = oauth.getAuthUrl(userId);

  return NextResponse.redirect(authUrl);
}
