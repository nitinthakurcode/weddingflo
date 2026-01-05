/**
 * Email Logger
 * December 2025 - Drizzle ORM Implementation
 */
import { db, sql, eq, and, desc } from '@/lib/db';
import { emailLogs, emailPreferences } from '@/lib/db/schema';

type EmailType = 'client_invite' | 'wedding_reminder' | 'rsvp_confirmation' | 'payment_reminder' | 'payment_receipt' | 'vendor_communication' | 'general';
type EmailStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';
type Locale = 'en' | 'es' | 'fr' | 'de' | 'ja' | 'zh' | 'hi';

export interface LogEmailParams {
  companyId: string;
  clientId?: string;
  emailType: EmailType;
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  locale?: Locale;
  metadata?: Record<string, unknown>;
}

export interface UpdateEmailStatusParams {
  emailLogId: string;
  status: EmailStatus;
  resendId?: string;
  errorMessage?: string;
  sentAt?: Date;
  deliveredAt?: Date;
}

/**
 * Create an email log entry in the database
 */
export async function logEmail(params: LogEmailParams): Promise<{ id: string } | null> {
  try {
    const result = await db
      .insert(emailLogs)
      .values({
        companyId: params.companyId,
        clientId: params.clientId || null,
        emailType: params.emailType,
        recipientEmail: params.recipientEmail,
        recipientName: params.recipientName || null,
        subject: params.subject,
        locale: params.locale || 'en',
        status: 'pending',
        metadata: params.metadata || null,
      })
      .returning({ id: emailLogs.id });

    return result[0] || null;
  } catch (error) {
    console.error('Error logging email:', error);
    return null;
  }
}

/**
 * Update email log status after sending
 */
export async function updateEmailStatus(params: UpdateEmailStatusParams): Promise<boolean> {
  try {
    await db
      .update(emailLogs)
      .set({
        status: params.status,
        resendId: params.resendId,
        errorMessage: params.errorMessage,
        sentAt: params.sentAt,
        deliveredAt: params.deliveredAt,
        updatedAt: new Date(),
      })
      .where(eq(emailLogs.id, params.emailLogId));

    return true;
  } catch (error) {
    console.error('Error updating email status:', error);
    return false;
  }
}

/**
 * Get email logs for a company with pagination
 */
export async function getEmailLogs(
  companyId: string,
  options: {
    limit?: number;
    offset?: number;
    status?: EmailStatus;
    emailType?: EmailType;
    clientId?: string;
  } = {}
) {
  try {
    const { limit = 50, offset = 0, status, emailType, clientId } = options;

    // Build conditions array
    const conditions = [eq(emailLogs.companyId, companyId)];

    if (status) {
      conditions.push(eq(emailLogs.status, status));
    }
    if (emailType) {
      conditions.push(eq(emailLogs.emailType, emailType));
    }
    if (clientId) {
      conditions.push(eq(emailLogs.clientId, clientId));
    }

    const logs = await db
      .select()
      .from(emailLogs)
      .where(and(...conditions))
      .orderBy(desc(emailLogs.createdAt))
      .limit(limit)
      .offset(offset);

    // Get count
    const countResult = await db.execute(sql`
      SELECT COUNT(*)::integer as count
      FROM email_logs
      WHERE company_id = ${companyId}
      ${status ? sql`AND status = ${status}` : sql``}
      ${emailType ? sql`AND email_type = ${emailType}` : sql``}
      ${clientId ? sql`AND client_id = ${clientId}` : sql``}
    `);

    const count = (countResult.rows[0] as { count: number })?.count || 0;

    return { logs, count };
  } catch (error) {
    console.error('Exception fetching email logs:', error);
    return { logs: [], count: 0 };
  }
}

/**
 * Get email statistics for a company
 */
export async function getEmailStats(companyId: string, days: number = 30) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result = await db.execute(sql`
      SELECT
        COUNT(*)::integer as total_sent,
        COUNT(*) FILTER (WHERE status = 'delivered')::integer as delivered,
        COUNT(*) FILTER (WHERE status = 'failed')::integer as failed,
        COUNT(*) FILTER (WHERE status = 'bounced')::integer as bounced,
        COUNT(*) FILTER (WHERE opened_at IS NOT NULL)::integer as opened,
        COUNT(*) FILTER (WHERE clicked_at IS NOT NULL)::integer as clicked
      FROM email_logs
      WHERE company_id = ${companyId}
        AND created_at >= ${startDate.toISOString()}
    `);

    const stats = result.rows[0] as {
      total_sent: number;
      delivered: number;
      failed: number;
      bounced: number;
      opened: number;
      clicked: number;
    } || { total_sent: 0, delivered: 0, failed: 0, bounced: 0, opened: 0, clicked: 0 };

    return {
      ...stats,
      delivery_rate: stats.total_sent > 0 ? (stats.delivered / stats.total_sent) * 100 : 0,
      open_rate: stats.delivered > 0 ? (stats.opened / stats.delivered) * 100 : 0,
      click_rate: stats.opened > 0 ? (stats.clicked / stats.opened) * 100 : 0,
    };
  } catch (error) {
    console.error('Exception fetching email stats:', error);
    return null;
  }
}

/**
 * Check if user should receive a specific email type based on preferences
 */
export async function shouldSendEmail(userId: string, emailType: EmailType): Promise<boolean> {
  try {
    const result = await db
      .select()
      .from(emailPreferences)
      .where(eq(emailPreferences.userId, userId))
      .limit(1);

    const prefs = result[0];

    if (!prefs) {
      // Default to allowing email if preferences not set
      return true;
    }

    // Map email types to preference columns
    switch (emailType) {
      case 'wedding_reminder':
        return prefs.eventReminders !== false && prefs.reminderEmails !== false;
      case 'payment_reminder':
      case 'payment_receipt':
        return prefs.transactionalEmails !== false;
      case 'rsvp_confirmation':
        return prefs.transactionalEmails !== false;
      case 'vendor_communication':
        return prefs.transactionalEmails !== false;
      case 'client_invite':
      case 'general':
      default:
        return true;
    }
  } catch (error) {
    console.error('Exception checking email preferences:', error);
    return true; // Default to allowing email if check fails
  }
}

/**
 * Get user email preferences
 */
export async function getEmailPreferences(userId: string) {
  try {
    const result = await db
      .select()
      .from(emailPreferences)
      .where(eq(emailPreferences.userId, userId))
      .limit(1);

    const prefs = result[0];

    if (!prefs) {
      // Return defaults
      return {
        marketing_emails: false,
        transactional_emails: true,
        reminder_emails: true,
        weekly_digest: false,
        client_updates: true,
        task_reminders: true,
        event_reminders: true,
      };
    }

    return {
      marketing_emails: prefs.marketingEmails ?? false,
      transactional_emails: prefs.transactionalEmails ?? true,
      reminder_emails: prefs.reminderEmails ?? true,
      weekly_digest: prefs.weeklyDigest ?? false,
      client_updates: prefs.clientUpdates ?? true,
      task_reminders: prefs.taskReminders ?? true,
      event_reminders: prefs.eventReminders ?? true,
    };
  } catch (error) {
    console.error('Exception fetching email preferences:', error);
    return null;
  }
}

/**
 * Update user email preferences
 */
export async function updateEmailPreferences(
  userId: string,
  _companyId: string, // Unused but kept for API compatibility
  preferences: {
    marketing_emails?: boolean;
    transactional_emails?: boolean;
    reminder_emails?: boolean;
    weekly_digest?: boolean;
    client_updates?: boolean;
    task_reminders?: boolean;
    event_reminders?: boolean;
  }
) {
  try {
    // Build update data with only provided fields
    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (preferences.marketing_emails !== undefined) updateData.marketingEmails = preferences.marketing_emails;
    if (preferences.transactional_emails !== undefined) updateData.transactionalEmails = preferences.transactional_emails;
    if (preferences.reminder_emails !== undefined) updateData.reminderEmails = preferences.reminder_emails;
    if (preferences.weekly_digest !== undefined) updateData.weeklyDigest = preferences.weekly_digest;
    if (preferences.client_updates !== undefined) updateData.clientUpdates = preferences.client_updates;
    if (preferences.task_reminders !== undefined) updateData.taskReminders = preferences.task_reminders;
    if (preferences.event_reminders !== undefined) updateData.eventReminders = preferences.event_reminders;

    // Try to update first
    const updateResult = await db
      .update(emailPreferences)
      .set(updateData)
      .where(eq(emailPreferences.userId, userId))
      .returning();

    if (updateResult.length > 0) {
      return updateResult[0];
    }

    // If no rows updated, insert new record
    const insertResult = await db
      .insert(emailPreferences)
      .values({
        userId,
        marketingEmails: preferences.marketing_emails ?? false,
        transactionalEmails: preferences.transactional_emails ?? true,
        reminderEmails: preferences.reminder_emails ?? true,
        weeklyDigest: preferences.weekly_digest ?? false,
        clientUpdates: preferences.client_updates ?? true,
        taskReminders: preferences.task_reminders ?? true,
        eventReminders: preferences.event_reminders ?? true,
      })
      .returning();

    return insertResult[0] || null;
  } catch (error) {
    console.error('Exception updating email preferences:', error);
    return null;
  }
}

/**
 * Helper function to log and send email with automatic status tracking
 */
export async function logAndSendEmail(
  params: LogEmailParams & {
    sendEmailFn: () => Promise<{ success: boolean; data?: unknown; error?: unknown }>;
  }
) {
  // Create email log entry
  const logResult = await logEmail(params);

  if (!logResult) {
    console.error('Failed to create email log entry');
    return { success: false, error: 'Failed to create email log entry' };
  }

  // Send email
  const sendResult = await params.sendEmailFn();

  // Update email status
  if (sendResult.success) {
    await updateEmailStatus({
      emailLogId: logResult.id,
      status: 'sent',
      resendId: (sendResult.data as { id?: string })?.id,
      sentAt: new Date(),
    });
  } else {
    await updateEmailStatus({
      emailLogId: logResult.id,
      status: 'failed',
      errorMessage: JSON.stringify(sendResult.error),
    });
  }

  return sendResult;
}
