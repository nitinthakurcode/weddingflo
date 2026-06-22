/**
 * Client/Wedding Invitation API - February 2026
 *
 * Creates invitation tokens for wedding clients (couples/families) to access their portal.
 * Sends invitation email with portal signup link.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/server';
import { db, eq, and, isNull } from '@/lib/db';
import { weddingInvitations, user as userTable, clients } from '@/lib/db/schema';
import { nanoid } from 'nanoid';
import { render } from '@react-email/render';
import { sendEmail } from '@/lib/email/resend-client';
import { ClientInviteEmail } from '@/lib/email/templates/client-invite-email';

/**
 * Render + send a wedding portal invitation email.
 * Never throws — the invitation is already persisted, so a send failure is
 * logged but does not break the response (caller still returns the invite URL).
 */
async function sendWeddingInviteEmail(opts: {
  email: string;
  token: string;
  plannerName: string;
}): Promise<void> {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.weddingflo.com';
    const inviteLink = `${appUrl}/portal/sign-up/${opts.token}`;
    const clientName = opts.email.split('@')[0] || 'there';

    const html = await render(
      ClientInviteEmail({
        clientName,
        plannerName: opts.plannerName,
        inviteLink,
        locale: 'en',
      })
    );

    const result = await sendEmail({
      to: opts.email,
      subject: "You're invited to your WeddingFlo portal",
      html,
    });

    if (!result.success) {
      console.error(`[Invite Client] Email send failed to ${opts.email}: ${result.error}`);
    }
  } catch (error) {
    console.error('[Invite Client] Failed to render/send invitation email:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, user } = await getServerSession();

    if (!userId || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Only company_admin, staff, or super_admin can invite clients
    if (!['company_admin', 'staff', 'super_admin'].includes(user.role || '')) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    if (!user.companyId && user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Company not found' }, { status: 400 });
    }

    const body = await request.json();
    const { email, clientId, relationship } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    if (!clientId) {
      return NextResponse.json({ error: 'Client ID is required' }, { status: 400 });
    }

    // Verify client belongs to company
    const [client] = await db
      .select({ id: clients.id, companyId: clients.companyId })
      .from(clients)
      .where(
        and(
          eq(clients.id, clientId),
          eq(clients.companyId, user.companyId!),
          isNull(clients.deletedAt)
        )
      )
      .limit(1);

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Check for existing pending invitation
    const [existingInvite] = await db
      .select({ id: weddingInvitations.id })
      .from(weddingInvitations)
      .where(
        and(
          eq(weddingInvitations.email, email),
          eq(weddingInvitations.clientId, clientId)
        )
      )
      .limit(1);

    if (existingInvite) {
      // Update existing invitation
      const token = nanoid(32);
      await db
        .update(weddingInvitations)
        .set({
          token,
          relationship,
          invitedBy: userId,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        })
        .where(eq(weddingInvitations.id, existingInvite.id));

      await sendWeddingInviteEmail({
        email,
        token,
        plannerName: user.name || 'Your wedding planner',
      });

      return NextResponse.json({
        success: true,
        message: `Invitation resent to ${email}`,
        inviteUrl: `/portal/sign-up/${token}`,
      });
    }

    // Create new invitation
    const token = nanoid(32);
    await db.insert(weddingInvitations).values({
      clientId,
      companyId: user.companyId!,
      email,
      relationship,
      token,
      invitedBy: userId,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });

    await sendWeddingInviteEmail({
      email,
      token,
      plannerName: user.name || 'Your wedding planner',
    });

    return NextResponse.json({
      success: true,
      message: `Invitation sent to ${email}`,
      inviteUrl: `/portal/sign-up/${token}`,
    });
  } catch (error) {
    console.error('[Invite Client] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create invitation' },
      { status: 500 }
    );
  }
}
