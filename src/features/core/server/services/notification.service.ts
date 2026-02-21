/**
 * Notification Service
 *
 * February 2026 - Helper service for creating notifications from any module
 *
 * Usage:
 * ```ts
 * import { createNotification, notifyTeamMembers } from '@/features/core/server/services/notification.service';
 *
 * // Create notification for a specific user
 * await createNotification(db, {
 *   companyId: ctx.companyId,
 *   userId: targetUserId,
 *   type: 'lead_new',
 *   title: 'New Lead: John Doe',
 *   message: 'A new inquiry was received from your website.',
 *   metadata: { leadId: lead.id, link: `/dashboard/pipeline/${lead.id}` }
 * });
 *
 * // Notify all team members in a company
 * await notifyTeamMembers(db, {
 *   companyId: ctx.companyId,
 *   type: 'payment_received',
 *   title: 'Payment Received',
 *   message: 'Client paid $5,000',
 *   metadata: { clientId, amount: 5000 }
 * });
 * ```
 */

import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { notifications, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// Notification type definitions
export type NotificationType =
  | 'lead_new'
  | 'lead_stage_change'
  | 'proposal_sent'
  | 'proposal_viewed'
  | 'proposal_accepted'
  | 'proposal_declined'
  | 'contract_signed'
  | 'payment_received'
  | 'payment_overdue'
  | 'rsvp_received'
  | 'event_reminder'
  | 'task_assigned'
  | 'task_completed'
  | 'team_invite'
  | 'system';

// Metadata structure for notifications
export interface NotificationMetadata {
  entityType?: string; // 'lead', 'client', 'proposal', 'contract', 'payment'
  entityId?: string;
  link?: string; // Deep link to the relevant page
  [key: string]: unknown; // Allow additional metadata
}

// Input for creating a notification
export interface CreateNotificationInput {
  companyId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message?: string;
  metadata?: NotificationMetadata;
}

// Input for notifying team members
export interface NotifyTeamMembersInput {
  companyId: string;
  type: NotificationType;
  title: string;
  message?: string;
  metadata?: NotificationMetadata;
  excludeUserIds?: string[]; // User IDs to exclude (e.g., the actor)
  onlyAdmins?: boolean; // Only notify company_admin and super_admin
}

/**
 * Create a notification for a specific user
 */
export async function createNotification(
  db: PostgresJsDatabase<Record<string, unknown>>,
  input: CreateNotificationInput
): Promise<{ id: string }> {
  const [notification] = await db
    .insert(notifications)
    .values({
      companyId: input.companyId,
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      metadata: input.metadata,
    })
    .returning({ id: notifications.id });

  return notification;
}

/**
 * Notify all team members in a company
 * Useful for company-wide announcements like payments, new leads, etc.
 */
export async function notifyTeamMembers(
  db: PostgresJsDatabase<Record<string, unknown>>,
  input: NotifyTeamMembersInput
): Promise<{ count: number }> {
  // Get all users in the company
  let teamMembers = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.companyId, input.companyId));

  // Filter by role if onlyAdmins is true
  if (input.onlyAdmins) {
    teamMembers = teamMembers.filter(
      (m) => m.role === 'company_admin' || m.role === 'super_admin'
    );
  }

  // Exclude specified users
  if (input.excludeUserIds && input.excludeUserIds.length > 0) {
    const excludeSet = new Set(input.excludeUserIds);
    teamMembers = teamMembers.filter((m) => !excludeSet.has(m.id));
  }

  if (teamMembers.length === 0) {
    return { count: 0 };
  }

  // Create notifications for all team members
  const notificationValues = teamMembers.map((member) => ({
    companyId: input.companyId,
    userId: member.id,
    type: input.type,
    title: input.title,
    message: input.message,
    metadata: input.metadata,
  }));

  await db.insert(notifications).values(notificationValues);

  return { count: notificationValues.length };
}

/**
 * Notify a specific user by their auth ID (for use when you have ctx.userId)
 * Returns the db user ID for convenience
 */
export async function notifyUserByAuthId(
  db: PostgresJsDatabase<Record<string, unknown>>,
  authId: string,
  input: Omit<CreateNotificationInput, 'userId'>
): Promise<{ id: string; dbUserId: string } | null> {
  // Get db user ID from auth ID
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.authId, authId))
    .limit(1);

  if (!user) {
    console.warn(`[Notification Service] User not found for auth ID: ${authId}`);
    return null;
  }

  const [notification] = await db
    .insert(notifications)
    .values({
      companyId: input.companyId,
      userId: user.id,
      type: input.type,
      title: input.title,
      message: input.message,
      metadata: input.metadata,
    })
    .returning({ id: notifications.id });

  return { id: notification.id, dbUserId: user.id };
}

/**
 * Notification type to icon mapping (for UI)
 */
export const NOTIFICATION_ICONS: Record<NotificationType, string> = {
  lead_new: 'user-plus',
  lead_stage_change: 'arrow-right',
  proposal_sent: 'send',
  proposal_viewed: 'eye',
  proposal_accepted: 'check-circle',
  proposal_declined: 'x-circle',
  contract_signed: 'file-signature',
  payment_received: 'dollar-sign',
  payment_overdue: 'alert-circle',
  rsvp_received: 'check',
  event_reminder: 'calendar',
  task_assigned: 'clipboard',
  task_completed: 'check-square',
  team_invite: 'user-plus',
  system: 'info',
};

/**
 * Notification type to color mapping (for UI)
 */
export const NOTIFICATION_COLORS: Record<NotificationType, string> = {
  lead_new: 'blue',
  lead_stage_change: 'purple',
  proposal_sent: 'indigo',
  proposal_viewed: 'gray',
  proposal_accepted: 'green',
  proposal_declined: 'red',
  contract_signed: 'green',
  payment_received: 'green',
  payment_overdue: 'red',
  rsvp_received: 'blue',
  event_reminder: 'yellow',
  task_assigned: 'orange',
  task_completed: 'green',
  team_invite: 'blue',
  system: 'gray',
};
