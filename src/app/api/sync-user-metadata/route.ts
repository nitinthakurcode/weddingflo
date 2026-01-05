/**
 * API Route: Get User Metadata
 *
 * Returns current user metadata from BetterAuth session.
 * With BetterAuth, no external sync is needed - data is in the database.
 */

import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/server';

export async function POST() {
  try {
    const { userId, user } = await getServerSession();

    if (!userId || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Return user metadata directly from session
    return NextResponse.json({
      success: true,
      message: 'User metadata retrieved successfully',
      userId: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    });
  } catch (error: any) {
    console.error('Get metadata error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get user metadata' },
      { status: 500 }
    );
  }
}
