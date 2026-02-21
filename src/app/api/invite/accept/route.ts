/**
 * Accept Invitation API - February 2026
 *
 * Verifies invitation token and assigns user to company/client.
 * Called after user signs up via BetterAuth.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/server';
import { db, eq, and, isNull } from '@/lib/db';
import { teamInvitations, weddingInvitations, user as userTable, clientUsers } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const { userId, user } = await getServerSession();

    if (!userId || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { token, type = 'team' } = body;

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    if (type === 'team') {
      // Handle team invitation
      const [invitation] = await db
        .select()
        .from(teamInvitations)
        .where(
          and(
            eq(teamInvitations.token, token),
            isNull(teamInvitations.acceptedAt),
            sql`${teamInvitations.expiresAt} > NOW()`
          )
        )
        .limit(1);

      if (!invitation) {
        return NextResponse.json(
          { error: 'Invalid or expired invitation' },
          { status: 400 }
        );
      }

      // Verify email matches
      if (invitation.email.toLowerCase() !== user.email?.toLowerCase()) {
        return NextResponse.json(
          { error: 'This invitation was sent to a different email address' },
          { status: 403 }
        );
      }

      // SECURITY: Use transaction to ensure atomic update of user and invitation
      await db.transaction(async (tx) => {
        // Update user with company and role
        await tx
          .update(userTable)
          .set({
            companyId: invitation.companyId,
            role: invitation.role,
            isActive: true,
            onboardingCompleted: true,
            updatedAt: new Date(),
          })
          .where(eq(userTable.id, userId));

        // Mark invitation as accepted
        await tx
          .update(teamInvitations)
          .set({
            acceptedAt: new Date(),
            acceptedBy: userId,
          })
          .where(eq(teamInvitations.id, invitation.id));
      });

      console.log(`[Accept Invite] User ${userId} joined company ${invitation.companyId} as ${invitation.role}`);

      return NextResponse.json({
        success: true,
        type: 'team',
        companyId: invitation.companyId,
        role: invitation.role,
        redirectTo: '/dashboard',
      });
    } else if (type === 'wedding') {
      // Handle wedding/client invitation
      const [invitation] = await db
        .select()
        .from(weddingInvitations)
        .where(
          and(
            eq(weddingInvitations.token, token),
            isNull(weddingInvitations.acceptedAt),
            sql`${weddingInvitations.expiresAt} > NOW()`
          )
        )
        .limit(1);

      if (!invitation) {
        return NextResponse.json(
          { error: 'Invalid or expired invitation' },
          { status: 400 }
        );
      }

      // Verify email matches
      if (invitation.email.toLowerCase() !== user.email?.toLowerCase()) {
        return NextResponse.json(
          { error: 'This invitation was sent to a different email address' },
          { status: 403 }
        );
      }

      // SECURITY: Use transaction to ensure atomic update of user, client_users, and invitation
      await db.transaction(async (tx) => {
        // Update user with client_user role
        await tx
          .update(userTable)
          .set({
            companyId: invitation.companyId,
            role: 'client_user',
            isActive: true,
            onboardingCompleted: true,
            updatedAt: new Date(),
          })
          .where(eq(userTable.id, userId));

        // Create client_users relationship
        await tx.insert(clientUsers).values({
          id: crypto.randomUUID(),
          clientId: invitation.clientId,
          userId: userId,
          role: 'owner',
          relationship: invitation.relationship,
          isPrimary: true,
        });

        // Mark invitation as accepted
        await tx
          .update(weddingInvitations)
          .set({
            acceptedAt: new Date(),
            acceptedBy: userId,
          })
          .where(eq(weddingInvitations.id, invitation.id));
      });

      console.log(`[Accept Invite] User ${userId} linked to client ${invitation.clientId}`);

      return NextResponse.json({
        success: true,
        type: 'wedding',
        clientId: invitation.clientId,
        companyId: invitation.companyId,
        redirectTo: '/portal/dashboard',
      });
    }

    return NextResponse.json({ error: 'Invalid invitation type' }, { status: 400 });
  } catch (error) {
    console.error('[Accept Invite] Error:', error);
    return NextResponse.json(
      { error: 'Failed to accept invitation' },
      { status: 500 }
    );
  }
}

// GET to verify invitation without accepting
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const type = searchParams.get('type') || 'team';

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    if (type === 'team') {
      const [invitation] = await db
        .select({
          email: teamInvitations.email,
          role: teamInvitations.role,
          companyId: teamInvitations.companyId,
          expiresAt: teamInvitations.expiresAt,
          acceptedAt: teamInvitations.acceptedAt,
        })
        .from(teamInvitations)
        .where(eq(teamInvitations.token, token))
        .limit(1);

      if (!invitation) {
        return NextResponse.json({ valid: false, error: 'Invitation not found' });
      }

      if (invitation.acceptedAt) {
        return NextResponse.json({ valid: false, error: 'Invitation already accepted' });
      }

      if (new Date(invitation.expiresAt) < new Date()) {
        return NextResponse.json({ valid: false, error: 'Invitation expired' });
      }

      return NextResponse.json({
        valid: true,
        email: invitation.email,
        role: invitation.role,
        type: 'team',
      });
    } else if (type === 'wedding') {
      const [invitation] = await db
        .select({
          email: weddingInvitations.email,
          relationship: weddingInvitations.relationship,
          clientId: weddingInvitations.clientId,
          expiresAt: weddingInvitations.expiresAt,
          acceptedAt: weddingInvitations.acceptedAt,
        })
        .from(weddingInvitations)
        .where(eq(weddingInvitations.token, token))
        .limit(1);

      if (!invitation) {
        return NextResponse.json({ valid: false, error: 'Invitation not found' });
      }

      if (invitation.acceptedAt) {
        return NextResponse.json({ valid: false, error: 'Invitation already accepted' });
      }

      if (new Date(invitation.expiresAt) < new Date()) {
        return NextResponse.json({ valid: false, error: 'Invitation expired' });
      }

      return NextResponse.json({
        valid: true,
        email: invitation.email,
        relationship: invitation.relationship,
        type: 'wedding',
      });
    }

    return NextResponse.json({ error: 'Invalid invitation type' }, { status: 400 });
  } catch (error) {
    console.error('[Verify Invite] Error:', error);
    return NextResponse.json(
      { error: 'Failed to verify invitation' },
      { status: 500 }
    );
  }
}
