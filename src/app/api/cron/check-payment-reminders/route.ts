/**
 * Check Payment Reminders Cron Endpoint
 *
 * February 2026 - Daily cron to check for upcoming payment due dates
 * and enqueue reminder jobs for 3-day and 1-day warnings.
 *
 * Called by Dokploy cron daily: `curl -X POST http://web:3000/api/cron/check-payment-reminders`
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { budget, clients, users } from '@/lib/db/schema';
import { enqueueJob } from '@/lib/jobs/pg-queue';
import { eq, and, isNull, gte, lte } from 'drizzle-orm';

// Cron secret for security (optional, set in env)
const CRON_SECRET = process.env.CRON_SECRET;

/**
 * POST handler for cron
 */
export async function POST(request: Request) {
  try {
    // Verify cron secret if set
    if (CRON_SECRET) {
      const authHeader = request.headers.get('Authorization');
      const providedSecret = authHeader?.replace('Bearer ', '');

      if (providedSecret !== CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const startTime = Date.now();
    let reminderCount = 0;

    // Get dates for 1-day and 3-day reminders
    const now = new Date();
    const oneDayFromNow = new Date(now);
    oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);
    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    // Format as date strings for comparison (YYYY-MM-DD)
    const oneDayStr = oneDayFromNow.toISOString().split('T')[0];
    const threeDaysStr = threeDaysFromNow.toISOString().split('T')[0];

    console.log(`[Payment Reminders] Checking for payments due on ${oneDayStr} (1 day) and ${threeDaysStr} (3 days)`);

    // Find budget items with payment dates coming up (1 day or 3 days)
    // Only items with pending payment status
    const upcomingPayments = await db
      .select({
        id: budget.id,
        clientId: budget.clientId,
        category: budget.category,
        item: budget.item,
        estimatedCost: budget.estimatedCost,
        paymentDate: budget.paymentDate,
        paymentStatus: budget.paymentStatus,
      })
      .from(budget)
      .where(
        and(
          eq(budget.paymentStatus, 'pending'),
          gte(budget.paymentDate, now),
          lte(budget.paymentDate, threeDaysFromNow)
        )
      );

    console.log(`[Payment Reminders] Found ${upcomingPayments.length} upcoming payments`);

    // Group by client to get client admin email
    const clientIds = [...new Set(upcomingPayments.map(p => p.clientId))];

    // Get client info and admin users for notifications
    for (const clientId of clientIds) {
      // Get client info
      const [client] = await db
        .select({
          id: clients.id,
          companyId: clients.companyId,
          partner1FirstName: clients.partner1FirstName,
          partner1Email: clients.partner1Email,
        })
        .from(clients)
        .where(and(eq(clients.id, clientId), isNull(clients.deletedAt)))
        .limit(1);

      if (!client) continue;

      // Get company admin user for this client's company
      const [adminUser] = await db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
        })
        .from(users)
        .where(
          and(
            eq(users.companyId, client.companyId),
            eq(users.role, 'company_admin'),
            eq(users.isActive, true)
          )
        )
        .limit(1);

      if (!adminUser?.email) continue;

      // Get payments for this client
      const clientPayments = upcomingPayments.filter(p => p.clientId === clientId);

      for (const payment of clientPayments) {
        if (!payment.paymentDate) continue;

        const paymentDateStr = payment.paymentDate.toISOString().split('T')[0];

        // Determine days until due
        let daysUntil: number | null = null;
        if (paymentDateStr === oneDayStr) {
          daysUntil = 1;
        } else if (paymentDateStr === threeDaysStr) {
          daysUntil = 3;
        }

        if (daysUntil === null) continue; // Not exactly 1 or 3 days out

        // Format amount
        const amount = `₹${Number(payment.estimatedCost || 0).toLocaleString()}`;

        // Enqueue reminder job
        await enqueueJob(db as any, {
          type: 'send_reminder',
          companyId: client.companyId,
          payload: {
            type: 'payment_due',
            recipientEmail: adminUser.email,
            recipientName: adminUser.firstName || 'Wedding Planner',
            amount,
            dueDate: payment.paymentDate.toLocaleDateString('en-IN', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }),
            daysUntil,
            itemDescription: payment.item || payment.category,
            category: payment.category,
            clientId,
          },
        });

        reminderCount++;
        console.log(`[Payment Reminders] Enqueued ${daysUntil}-day reminder for "${payment.item}" to ${adminUser.email}`);
      }
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      remindersEnqueued: reminderCount,
      paymentsChecked: upcomingPayments.length,
      duration: `${duration}ms`,
    });
  } catch (error) {
    console.error('[Payment Reminders] Error checking payments:', error);
    return NextResponse.json(
      { error: 'Failed to check payment reminders' },
      { status: 500 }
    );
  }
}

/**
 * GET handler for health check
 */
export async function GET() {
  return NextResponse.json({ status: 'ok', endpoint: 'check-payment-reminders' });
}
