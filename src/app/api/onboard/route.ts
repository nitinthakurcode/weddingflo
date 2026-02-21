import { NextRequest, NextResponse } from 'next/server';
import { db, eq } from '@/lib/db';
import { companies, user as userTable } from '@/lib/db/schema';

type SubscriptionTier = 'free' | 'starter' | 'professional' | 'enterprise';
type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'paused';

/**
 * Onboard API Route - February 2026
 *
 * Single Source of Truth: BetterAuth user table
 * This route updates ONLY the BetterAuth user table.
 * The app `users` table is deprecated and will be removed.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { authId, email, name, avatarUrl, role } = body;

    if (!authId || !email || !name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ['super_admin', 'company_admin', 'staff', 'client_user'];
    const userRole = validRoles.includes(role) ? role : 'company_admin';

    console.log('[API] Onboarding user:', authId, 'with role:', userRole);

    // Parse first and last name from full name
    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0] || null;
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null;

    // Check if BetterAuth user already has company assigned
    const [existingUser] = await db
      .select({
        id: userTable.id,
        companyId: userTable.companyId,
        role: userTable.role,
      })
      .from(userTable)
      .where(eq(userTable.id, authId))
      .limit(1);

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found. Please sign up first.' },
        { status: 404 }
      );
    }

    let companyId = existingUser.companyId;
    let finalRole = existingUser.role || userRole;

    // If user doesn't have a company, create one (for company_admin role)
    if (!companyId && userRole === 'company_admin') {
      console.log('[API] Creating company for user:', authId);
      const companyName = `${firstName || 'User'}'s Company`;
      const subdomain = `company${authId.replace(/[^a-z0-9]/gi, '').slice(0, 8).toLowerCase()}`;

      try {
        const newCompanyResult = await db
          .insert(companies)
          .values({
            name: companyName,
            subdomain,
            subscriptionTier: 'free' as SubscriptionTier,
            subscriptionStatus: 'trialing' as SubscriptionStatus,
            trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            logoUrl: null,
            branding: null,
            settings: null,
            stripeCustomerId: null,
            stripeSubscriptionId: null,
            subscriptionEndsAt: null,
          })
          .returning({ id: companies.id });

        if (newCompanyResult[0]) {
          companyId = newCompanyResult[0].id;
          console.log('[API] Created company:', companyId);

          // Mark company onboarding as complete to prevent redirect loop
          await db
            .update(companies)
            .set({ onboardingCompleted: true })
            .where(eq(companies.id, companyId));
        }
      } catch (createCompanyError) {
        console.error('[API] Error creating company:', createCompanyError);
        // Continue without company - can be assigned later
      }
    }

    // Update BetterAuth user table (SINGLE SOURCE OF TRUTH)
    try {
      await db
        .update(userTable)
        .set({
          companyId: companyId,
          role: finalRole,
          firstName: firstName,
          lastName: lastName,
          avatarUrl: avatarUrl || null,
          isActive: true,
          onboardingCompleted: true,
          updatedAt: new Date(),
        })
        .where(eq(userTable.id, authId));
      console.log('[API] BetterAuth user table updated for session data');
    } catch (updateError) {
      console.error('[API] Error updating BetterAuth user table:', updateError);
      return NextResponse.json(
        { error: 'Failed to update user profile' },
        { status: 500 }
      );
    }

    console.log('[API] User onboarded successfully:', authId);
    return NextResponse.json({ success: true, userId: authId });
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
