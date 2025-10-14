import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET() {
  try {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get Convex user
    let convexUser = null;
    try {
      convexUser = await convex.query(api.users.getByClerkId, { clerkId: userId });
    } catch (error: any) {
      console.error('Error fetching Convex user:', error);
    }

    return NextResponse.json({
      clerk: {
        id: user.id,
        email: user.emailAddresses[0]?.emailAddress,
        name: user.fullName,
        publicMetadata: user.publicMetadata,
      },
      convex: convexUser,
      status: {
        hasClerkUser: !!user,
        hasConvexUser: !!convexUser,
        hasCompanyInClerk: !!user.publicMetadata?.companyId,
        hasCompanyInConvex: !!convexUser?.company_id,
        companyIdMatch:
          user.publicMetadata?.companyId === convexUser?.company_id,
      },
    });
  } catch (error: any) {
    console.error('Debug error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch debug info' },
      { status: 500 }
    );
  }
}
