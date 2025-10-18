// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseAdminClient } from '@/lib/supabase/server';
import { TablesInsert, SubscriptionTier, SubscriptionStatus } from '@/lib/supabase/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clerkId, email, name, avatarUrl, role } = body;

    if (!clerkId || !email || !name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ['super_admin', 'company_admin', 'staff', 'client_viewer'];
    const userRole = validRoles.includes(role) ? role : 'company_admin';

    console.log('[API] Onboarding user:', clerkId, 'with role:', userRole);

    const supabase = createServerSupabaseAdminClient();

    // Parse first and last name from full name
    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0] || null;
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null;

    // Check if user already exists (webhook may have created them)
    const { data: existingUser } = (await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', clerkId)
      .maybeSingle()) as { data: { id: string } | null; error: any };

    let userId;
    let companyId: string | null = null;

    if (existingUser) {
      // User already exists (created by webhook), just return success
      console.log('[API] User already exists (webhook created), skipping:', existingUser.id);
      userId = existingUser.id;
    } else {
      // Create a company for this user first (webhook fallback)
      console.log('[API] Creating company for user:', clerkId);
      const companyName = `${firstName || 'User'}'s Company`;
      const subdomain = `company${clerkId.replace(/[^a-z0-9]/gi, '').slice(0, 8).toLowerCase()}`;

      const companyInsert: TablesInsert<'companies'> = {
        name: companyName,
        subdomain,
        subscription_tier: SubscriptionTier.FREE,
        subscription_status: SubscriptionStatus.TRIALING,
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        logo_url: null,
        branding: null,
        settings: null,
        stripe_customer_id: null,
        stripe_subscription_id: null,
        subscription_ends_at: null,
      };

      const { data: newCompany, error: createCompanyError } = await supabase
        .from('companies')
        .insert(companyInsert as any)
        .select('id')
        .single();

      if (createCompanyError) {
        console.error('[API] Error creating company:', createCompanyError);
        // Continue without company - can be assigned later
      } else if (newCompany) {
        companyId = (newCompany as any).id;
        console.log('[API] Created company:', companyId);
      }

      // Create user in Supabase (fallback if webhook didn't create)
      const userInsert: TablesInsert<'users'> = {
        clerk_id: clerkId,
        email: email,
        first_name: firstName,
        last_name: lastName,
        avatar_url: avatarUrl || null,
        role: userRole,
        company_id: companyId, // Assign the company we just created
        is_active: true,
      };

      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert(userInsert as any)
        .select()
        .maybeSingle();

      if (userError) {
        console.error('[API] Error creating user:', userError);
        return NextResponse.json(
          { error: userError.message || 'Failed to create user' },
          { status: 500 }
        );
      }

      userId = (userData as any).id;
      console.log('[API] User created via onboard:', userId);
    }

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
