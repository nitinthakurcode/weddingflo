/**
 * Email Logger
 * December 2025 - Drizzle ORM Implementation
 * Simplified to match actual database schema
 */
import { db, eq, desc } from '@/lib/db';
import { emailLogs, emailPreferences } from '@/lib/db/schema';
import crypto from 'crypto';

type EmailStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';

export interface LogEmailParams {
  clientId?: string;
  userId?: string;
  to: string;
  subject: string;
  body?: string;
}

/**
 * Create an email log entry in the database
 * Schema: id, clientId, userId, to, subject, body, status, createdAt
 */
export async function logEmail(params: LogEmailParams): Promise<{ id: string } | null> {
  try {
    const id = crypto.randomUUID();
    const result = await db
      .insert(emailLogs)
      .values({
        id,
        clientId: params.clientId || null,
        userId: params.userId || null,
        to: params.to,
        subject: params.subject,
        body: params.body || null,
        status: 'pending',
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
 * Note: Schema only has status field, no sentAt/deliveredAt/errorMessage
 */
export async function updateEmailStatus(emailLogId: string, status: EmailStatus): Promise<boolean> {
  try {
    await db
      .update(emailLogs)
      .set({ status })
      .where(eq(emailLogs.id, emailLogId));

    return true;
  } catch (error) {
    console.error('Error updating email status:', error);
    return false;
  }
}

/**
 * Get email logs for a client
 */
export async function getEmailLogs(
  clientId: string,
  options: {
    limit?: number;
    offset?: number;
    status?: EmailStatus;
  } = {}
) {
  try {
    const { limit = 50, offset = 0, status } = options;

    let query = db
      .select()
      .from(emailLogs)
      .where(eq(emailLogs.clientId, clientId))
      .orderBy(desc(emailLogs.createdAt))
      .limit(limit)
      .offset(offset);

    const logs = await query;

    // Filter by status if provided (done in memory since simple filter)
    const filteredLogs = status ? logs.filter(log => log.status === status) : logs;

    return { logs: filteredLogs, count: filteredLogs.length };
  } catch (error) {
    console.error('Exception fetching email logs:', error);
    return { logs: [], count: 0 };
  }
}

/**
 * Check if user should receive emails based on preferences
 * Schema only has: marketing, updates
 */
export async function shouldSendEmail(userId: string): Promise<boolean> {
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

    // Both marketing and updates must be true to receive emails
    return prefs.marketing !== false || prefs.updates !== false;
  } catch (error) {
    console.error('Exception checking email preferences:', error);
    return true; // Default to allowing email if check fails
  }
}

/**
 * Get user email preferences
 * Schema: id, userId, marketing, updates, createdAt, updatedAt
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
      // Return defaults matching schema
      return {
        marketing: true,
        updates: true,
      };
    }

    return {
      marketing: prefs.marketing ?? true,
      updates: prefs.updates ?? true,
    };
  } catch (error) {
    console.error('Exception fetching email preferences:', error);
    return null;
  }
}

/**
 * Update user email preferences
 * Schema: id, userId, marketing, updates, createdAt, updatedAt
 */
export async function updateEmailPreferences(
  userId: string,
  preferences: {
    marketing?: boolean;
    updates?: boolean;
  }
) {
  try {
    // Build update data with only provided fields
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (preferences.marketing !== undefined) updateData.marketing = preferences.marketing;
    if (preferences.updates !== undefined) updateData.updates = preferences.updates;

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
        id: crypto.randomUUID(),
        userId,
        marketing: preferences.marketing ?? true,
        updates: preferences.updates ?? true,
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
    await updateEmailStatus(logResult.id, 'sent');
  } else {
    await updateEmailStatus(logResult.id, 'failed');
  }

  return sendResult;
}
