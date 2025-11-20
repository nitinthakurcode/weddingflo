/**
 * API Route: Sync User Metadata
 *
 * This endpoint syncs user data from Supabase to Clerk publicMetadata.
 * Used when a user is authenticated but their JWT is missing role/company_id.
 *
 * November 2025 Pattern: This is the only place we query DB for auth info.
 * After sync, all auth reads come from JWT publicMetadata.
 */

import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { createServerSupabaseAdminClient } from '@/lib/supabase/server';
import { Database } from '@/lib/database.types';

type UserRole = Database['public']['Enums']['user_role'];
type SubscriptionTier = Database['public']['Enums']['subscription_tier'];
type SubscriptionStatus = Database['public']['Enums']['subscription_status'];

export async function POST() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get user from Supabase
    const supabase = createServerSupabaseAdminClient();

    let { data: user, error: userError } = await supabase
      .from('users')
      .select('role, company_id, is_active')
      .eq('clerk_id', userId)
      .single();

    // If user doesn't exist, create them (fallback for when webhook fails)
    if (userError || !user) {
      console.log('[Sync] User not found in database, creating:', userId);

      // Get user details from Clerk
      const client = await clerkClient();
      const clerkUser = await client.users.getUser(userId);

      const email = clerkUser.emailAddresses[0]?.emailAddress || '';
      const firstName = clerkUser.firstName || 'User';

      // Determine role
      const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
      const isSuperAdmin = email === superAdminEmail;
      const role: UserRole = isSuperAdmin ? 'super_admin' : 'company_admin';

      // Create company for user
      const companyName = `${firstName}'s Company`;
      const subdomain = `company${userId.replace(/[^a-z0-9]/gi, '').slice(0, 8).toLowerCase()}`;

      const { data: newCompany, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: companyName,
          subdomain,
          subscription_tier: 'free' as SubscriptionTier,
          subscription_status: 'trialing' as SubscriptionStatus,
          trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select('id')
        .single();

      if (companyError || !newCompany) {
        console.error('[Sync] Error creating company:', companyError);
        return NextResponse.json(
          { error: 'Failed to create company' },
          { status: 500 }
        );
      }

      // Create user in Supabase
      const { error: createUserError } = await supabase
        .from('users')
        .insert({
          clerk_id: userId,
          email,
          first_name: clerkUser.firstName || null,
          last_name: clerkUser.lastName || null,
          avatar_url: clerkUser.imageUrl || null,
          role,
          company_id: newCompany.id,
          is_active: true,
        });

      if (createUserError) {
        console.error('[Sync] Error creating user:', createUserError);
        return NextResponse.json(
          { error: 'Failed to create user' },
          { status: 500 }
        );
      }

      // Set user data for the rest of the function
      user = {
        role,
        company_id: newCompany.id,
        is_active: true,
      };

      console.log('[Sync] Created user and company:', { userId, role, company_id: newCompany.id });
    }

    if (!user.is_active) {
      return NextResponse.json(
        { error: 'Account is deactivated' },
        { status: 403 }
      );
    }

    if (!user.company_id) {
      return NextResponse.json(
        {
          error: 'No company associated with user',
          message: 'Your account setup is incomplete. Please contact support.',
          retry: false
        },
        { status: 400 }
      );
    }

    // Update Clerk publicMetadata
    try {
      const client = await clerkClient();
      await client.users.updateUserMetadata(userId, {
        publicMetadata: {
          role: user.role,
          company_id: user.company_id,
          // Keep onboarding_completed from existing metadata or default to true for legacy users
          onboarding_completed: true,
        },
      });

      console.log('[Sync] Successfully synced user metadata:', {
        userId,
        role: user.role,
        company_id: user.company_id,
      });

      return NextResponse.json({
        success: true,
        role: user.role,
        company_id: user.company_id,
      });
    } catch (clerkError) {
      console.error('[Sync] Error updating Clerk metadata:', clerkError);
      return NextResponse.json(
        { error: 'Failed to update user metadata' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[Sync] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
