import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clerkId, email, name, avatarUrl } = body;

    if (!clerkId || !email || !name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log('[API] Onboarding user:', clerkId);

    // Call the onboardUser mutation (requires auth, but we'll use admin token)
    // For now, let's use a workaround: store in a temporary table and have a Convex cron job process it
    // OR use the internal mutation via an action

    // Actually, we can't call internal mutations from the client
    // Let's use the regular mutation with Clerk token
    const userId = await convex.mutation(api.users.onboardUser, {
      clerkId,
      email,
      name,
      avatarUrl,
    });

    console.log('[API] User onboarded successfully:', userId);

    return NextResponse.json({ success: true, userId });
  } catch (error) {
    console.error('[API] Onboarding error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to onboard user',
      },
      { status: 500 }
    );
  }
}
