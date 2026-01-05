import { NextRequest, NextResponse } from 'next/server';
import { db, eq } from '@/lib/db';
import { users, companies } from '@/lib/db/schema';

type SubscriptionTier = 'free' | 'starter' | 'professional' | 'enterprise';
type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'paused';

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

    // Check if user already exists (webhook may have created them) using Drizzle
    const existingUserResult = await db
      .select({
        id: users.id,
        companyId: users.companyId,
        role: users.role,
      })
      .from(users)
      .where(eq(users.authId, authId))
      .limit(1);

    const existingUser = existingUserResult[0] || null;

    let userId;
    let companyId: string | null = null;
    let finalRole = userRole;

    if (existingUser) {
      // User already exists (created by webhook), get their data
      console.log('[API] User already exists (webhook created):', existingUser.id);
      userId = existingUser.id;
      companyId = existingUser.companyId;
      finalRole = existingUser.role || userRole; // Use the role from DB (webhook may have set it)
    } else {
      // Create a company for this user first (webhook fallback)
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
        }
      } catch (createCompanyError) {
        console.error('[API] Error creating company:', createCompanyError);
        // Continue without company - can be assigned later
      }

      // Create user using Drizzle
      try {
        const newUserResult = await db
          .insert(users)
          .values({
            authId: authId,
            email: email,
            firstName: firstName,
            lastName: lastName,
            avatarUrl: avatarUrl || null,
            role: finalRole,
            companyId: companyId,
            isActive: true,
          })
          .returning({ id: users.id });

        if (!newUserResult[0]) {
          return NextResponse.json(
            { error: 'Failed to create user' },
            { status: 500 }
          );
        }

        userId = newUserResult[0].id;
        console.log('[API] User created via onboard:', userId);
      } catch (userError) {
        console.error('[API] Error creating user:', userError);
        return NextResponse.json(
          { error: userError instanceof Error ? userError.message : 'Failed to create user' },
          { status: 500 }
        );
      }
    }

    console.log('[API] User onboarded successfully:', userId);

    // BetterAuth stores user data directly in the database
    // No external sync needed - role and company_id already stored in users table

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
