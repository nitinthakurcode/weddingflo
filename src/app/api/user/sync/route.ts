/**
 * API Route: Sync User Data
 *
 * Ensures user has role and companyId set.
 * Creates company for new users who don't have one.
 * Updates BetterAuth user record with company assignment.
 */

import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/server';
import { db, eq } from '@/lib/db';
import { user as userTable } from '@/lib/db/schema/auth';
import { companies, users } from '@/lib/db/schema/core';
import { randomUUID } from 'crypto';

export async function POST() {
  try {
    const { userId, user } = await getServerSession();

    if (!userId || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Check if user already has company assigned
    if (user.companyId && user.role) {
      return NextResponse.json({
        success: true,
        userId: user.id,
        role: user.role,
        company_id: user.companyId,
        email: user.email,
        name: user.name,
      });
    }

    console.log('[User Sync] User needs company setup:', {
      userId: user.id,
      email: user.email,
      currentRole: user.role,
      currentCompanyId: user.companyId,
    });

    // Create a new company for this user
    const companyId = randomUUID();
    const companyName = user.name
      ? `${user.name}'s Company`
      : `Company ${user.email?.split('@')[0] || 'New'}`;

    try {
      // Insert new company
      await db.insert(companies).values({
        id: companyId,
        name: companyName,
        subscriptionTier: 'free',
        subscriptionStatus: 'trialing',
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days trial
        onboardingCompleted: false,
        onboardingStep: 0,
      });

      console.log('[User Sync] Created company:', { companyId, companyName });
    } catch (companyError) {
      // Company might already exist if there's a race condition
      console.warn('[User Sync] Company creation warning:', companyError);
    }

    // Update BetterAuth user record with role and companyId
    // New users creating their own company should be company_admin
    // Only preserve role if it's already a valid app role
    const validAppRoles = ['super_admin', 'company_admin', 'staff', 'client_user'];
    const role = validAppRoles.includes(user.role || '') ? user.role : 'company_admin';

    await db
      .update(userTable)
      .set({
        role: role,
        companyId: companyId,
        updatedAt: new Date(),
      })
      .where(eq(userTable.id, user.id));

    console.log('[User Sync] Updated BetterAuth user with company:', {
      userId: user.id,
      role,
      companyId,
    });

    // Also create/update record in app's users table
    // This table is used by tRPC procedures (getCurrentUser, etc.)
    try {
      const nameParts = user.name?.split(' ') || [];
      const firstName = nameParts[0] || null;
      const lastName = nameParts.slice(1).join(' ') || null;

      await db.insert(users).values({
        authId: user.id,
        email: user.email || '',
        firstName,
        lastName,
        avatarUrl: user.image || null,
        role: role as 'super_admin' | 'company_admin' | 'staff' | 'client_user',
        companyId: companyId,
        isActive: true,
      }).onConflictDoUpdate({
        target: users.authId,
        set: {
          role: role as 'super_admin' | 'company_admin' | 'staff' | 'client_user',
          companyId: companyId,
          updatedAt: new Date(),
        },
      });

      console.log('[User Sync] Created/updated app users record:', {
        authId: user.id,
        email: user.email,
        role,
        companyId,
      });
    } catch (usersError) {
      console.warn('[User Sync] App users table warning:', usersError);
      // Continue even if this fails - BetterAuth user is the source of truth
    }

    return NextResponse.json({
      success: true,
      userId: user.id,
      role: role,
      company_id: companyId,
      email: user.email,
      name: user.name,
      message: 'Account setup complete. Please refresh to continue.',
    });
  } catch (error) {
    console.error('[User Sync] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Failed to set up account',
        message: 'Please try again or contact support.',
        retry: true,
      },
      { status: 500 }
    );
  }
}
