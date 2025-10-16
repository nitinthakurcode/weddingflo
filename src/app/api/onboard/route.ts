import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseAdminClient } from '@/lib/supabase/server';

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

    const supabase = createServerSupabaseAdminClient();

    // Parse first and last name from full name
    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0] || null;
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null;

    // Create user in Supabase
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        clerk_id: clerkId,
        email: email,
        first_name: firstName,
        last_name: lastName,
        avatar_url: avatarUrl || null,
        role: 'planner',
      })
      .select()
      .single();

    if (userError) {
      console.error('[API] Error creating user:', userError);
      return NextResponse.json(
        { error: userError.message || 'Failed to create user' },
        { status: 500 }
      );
    }

    console.log('[API] User onboarded successfully:', userData.id);

    return NextResponse.json({ success: true, userId: userData.id });
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
