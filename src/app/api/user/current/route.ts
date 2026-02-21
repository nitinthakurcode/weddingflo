import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/server';

/**
 * GET /api/user/current
 *
 * Returns the current user from BetterAuth session.
 */
export async function GET() {
  try {
    const { userId, user } = await getServerSession();

    if (!userId || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Return user data directly from session
    // Note: firstName/lastName may not be in session - derive from name if needed
    const nameParts = user.name?.split(' ') || [];
    const userData = {
      id: user.id,
      email: user.email,
      name: user.name,
      first_name: nameParts[0] || null,
      last_name: nameParts.slice(1).join(' ') || null,
      avatar_url: user.image,
      role: user.role,
      company_id: user.companyId,
    };

    return NextResponse.json(userData);
  } catch (error) {
    console.error('[API /user/current] Unexpected error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
