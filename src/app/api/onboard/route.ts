// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseAdminClient } from '@/lib/supabase/server';
import { TablesInsert, SubscriptionTier, SubscriptionStatus } from '@/lib/database.types';
import { clerkClient } from '@clerk/nextjs/server';

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
    const validRoles = ['super_admin', 'company_admin', 'staff', 'client_user'];
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
      .select('id, company_id, role')
      .eq('clerk_id', clerkId)
      .maybeSingle()) as { data: { id: string; company_id: string | null; role: string } | null; error: any };

    let userId;
    let companyId: string | null = null;
    let finalRole = userRole;

    if (existingUser) {
      // User already exists (created by webhook), get their data
      console.log('[API] User already exists (webhook created):', existingUser.id);
      userId = existingUser.id;
      companyId = existingUser.company_id;
      finalRole = existingUser.role; // Use the role from DB (webhook may have set it)
    } else {
      // Create a company for this user first (webhook fallback)
      console.log('[API] Creating company for user:', clerkId);
      const companyName = `${firstName || 'User'}'s Company`;
      const subdomain = `company${clerkId.replace(/[^a-z0-9]/gi, '').slice(0, 8).toLowerCase()}`;

      const companyInsert: TablesInsert<'companies'> = {
        name: companyName,
        subdomain,
        subscription_tier: 'free' as SubscriptionTier,
        subscription_status: 'trialing' as SubscriptionStatus,
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
        role: finalRole,
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

    // Update Clerk metadata with role and company_id for fast path lookups
    try {
      const client = await clerkClient();
      await client.users.updateUserMetadata(clerkId, {
        publicMetadata: {
          role: finalRole,
          company_id: companyId,
        },
      });
      console.log('[API] Updated Clerk metadata with role:', finalRole, 'company_id:', companyId);
    } catch (metadataError) {
      console.error('[API] Error updating Clerk metadata:', metadataError);
      // Don't fail the request - metadata can be synced later
    }

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
