/**
 * Staff Invitation API - February 2026
 *
 * Creates invitation tokens for staff members to join a company.
 * Sends invitation email with signup link.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/server';
import { db, eq, and } from '@/lib/db';
import { teamInvitations, user as userTable, companies } from '@/lib/db/schema';
import { nanoid } from 'nanoid';
import { render } from '@react-email/render';
import { TeamInviteEmail } from '@/lib/email/templates/team-invite-email';
import { sendEmail } from '@/lib/email/resend';

// Helper function to send team invitation email
async function sendTeamInviteEmail({
  recipientEmail,
  recipientName,
  inviterName,
  companyName,
  role,
  token,
  expiresAt,
}: {
  recipientEmail: string;
  recipientName?: string;
  inviterName: string;
  companyName: string;
  role: string;
  token: string;
  expiresAt: Date;
}) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.weddingflo.com';
    const inviteUrl = `${baseUrl}/accept-invite/${token}`;

    const html = await render(
      TeamInviteEmail({
        recipientName,
        recipientEmail,
        inviterName,
        companyName,
        role: role === 'company_admin' ? 'Administrator' : 'Staff Member',
        inviteUrl,
        expiresAt: expiresAt.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        }),
      })
    );

    const result = await sendEmail({
      to: recipientEmail,
      subject: `You've been invited to join ${companyName} on WeddingFlo`,
      html,
    });

    return result;
  } catch (error) {
    console.error('[Invite Email] Failed to send:', error);
    return { success: false, error };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, user } = await getServerSession();

    if (!userId || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Only company_admin or super_admin can invite
    if (user.role !== 'company_admin' && user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    if (!user.companyId && user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Company not found' }, { status: 400 });
    }

    const body = await request.json();
    const { email, role = 'staff', firstName, lastName } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    // Validate role
    const validRoles = ['staff', 'company_admin'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Fetch company name for the email
    const [company] = await db
      .select({ name: companies.name })
      .from(companies)
      .where(eq(companies.id, user.companyId!))
      .limit(1);

    const companyName = company?.name || 'WeddingFlo';
    const inviterName = user.name || 'Your team';

    // Check if user already exists in the company
    const [existingUser] = await db
      .select({ id: userTable.id })
      .from(userTable)
      .where(
        and(
          eq(userTable.email, email),
          eq(userTable.companyId, user.companyId!)
        )
      )
      .limit(1);

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists in this company' },
        { status: 409 }
      );
    }

    // Check for existing pending invitation
    const [existingInvite] = await db
      .select({ id: teamInvitations.id })
      .from(teamInvitations)
      .where(
        and(
          eq(teamInvitations.email, email),
          eq(teamInvitations.companyId, user.companyId!)
        )
      )
      .limit(1);

    if (existingInvite) {
      // Update existing invitation
      const token = nanoid(32);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      await db
        .update(teamInvitations)
        .set({
          token,
          role,
          invitedBy: userId,
          expiresAt,
        })
        .where(eq(teamInvitations.id, existingInvite.id));

      // Send invitation email
      const emailResult = await sendTeamInviteEmail({
        recipientEmail: email,
        recipientName: firstName ? `${firstName}${lastName ? ' ' + lastName : ''}` : undefined,
        inviterName,
        companyName,
        role,
        token,
        expiresAt,
      });

      if (!emailResult.success) {
        console.error(`[Invite] Failed to send email to ${email}:`, emailResult.error);
        // Still return success since invitation was created, but include email status
      }

      console.log(`[Invite] Resent invitation to ${email} with token ${token}`);

      return NextResponse.json({
        success: true,
        message: `Invitation resent to ${email}`,
        inviteUrl: `/accept-invite/${token}`,
        emailSent: emailResult.success,
      });
    }

    // Create new invitation
    const token = nanoid(32);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await db.insert(teamInvitations).values({
      companyId: user.companyId!,
      email,
      role,
      token,
      invitedBy: userId,
      expiresAt,
    });

    // Send invitation email
    const emailResult = await sendTeamInviteEmail({
      recipientEmail: email,
      recipientName: firstName ? `${firstName}${lastName ? ' ' + lastName : ''}` : undefined,
      inviterName,
      companyName,
      role,
      token,
      expiresAt,
    });

    if (!emailResult.success) {
      console.error(`[Invite] Failed to send email to ${email}:`, emailResult.error);
      // Still return success since invitation was created, but include email status
    }

    console.log(`[Invite] Created invitation for ${email} with token ${token}`);

    return NextResponse.json({
      success: true,
      message: `Invitation sent to ${email}`,
      inviteUrl: `/accept-invite/${token}`,
      emailSent: emailResult.success,
    });
  } catch (error) {
    console.error('[Invite Staff] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create invitation' },
      { status: 500 }
    );
  }
}
