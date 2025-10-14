import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get Convex user
    const convexUser = await convex.query(api.users.getByClerkId, { clerkId: userId });

    if (!convexUser) {
      return NextResponse.json({ error: 'User not found in Convex' }, { status: 404 });
    }

    if (!convexUser.company_id) {
      return NextResponse.json({ error: 'No company ID found in Convex user' }, { status: 400 });
    }

    // Update Clerk user metadata
    const client = await clerkClient();
    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        companyId: convexUser.company_id,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'User metadata synced successfully',
      companyId: convexUser.company_id,
    });
  } catch (error: any) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync user metadata' },
      { status: 500 }
    );
  }
}
