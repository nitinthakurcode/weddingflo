import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * GET /api/auth/get-session
 *
 * Returns the current session.
 * Used by server-side auth helpers.
 */
export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    return NextResponse.json({
      user: session?.user ?? null,
      session: session?.session ?? null,
    });
  } catch {
    return NextResponse.json({ user: null, session: null });
  }
}
