import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get Supabase user
    const supabase = await createServerSupabaseClient();
    // @ts-ignore - TODO: Regenerate Supabase types from database schema
    const { data: supabaseUser, error } = await supabase
      .from('users')
      .select('*')
      .eq('clerk_id', userId)
      .maybeSingle();

    if (error || !supabaseUser) {
      return NextResponse.json({ error: 'User not found in Supabase' }, { status: 404 });
    }

    if (!(supabaseUser as any).company_id) {
      return NextResponse.json({ error: 'No company ID found in Supabase user' }, { status: 400 });
    }

    // Update Clerk user metadata
    const client = await clerkClient();
    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        companyId: (supabaseUser as any).company_id,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'User metadata synced successfully',
      companyId: (supabaseUser as any).company_id,
    });
  } catch (error: any) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync user metadata' },
      { status: 500 }
    );
  }
}
