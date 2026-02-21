import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '@/server/trpc/trpc';
import { render } from '@react-email/render';
import { resend, getEmailSubject, type EmailType, type Locale } from '@/lib/email/resend';
import { ClientInviteEmail } from '@/lib/email/templates/client-invite-email';
import { WeddingReminderEmail } from '@/lib/email/templates/wedding-reminder-email';
import { PaymentReminderEmail } from '@/lib/email/templates/payment-reminder-email';
import { RsvpConfirmationEmail } from '@/lib/email/templates/rsvp-confirmation-email';
import { PaymentReceiptEmail } from '@/lib/email/templates/payment-receipt-email';
import { VendorCommunicationEmail } from '@/lib/email/templates/vendor-communication-email';
import { eq, and, desc, sql, count } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';

// Database email types use snake_case
type DatabaseEmailType = 'client_invite' | 'wedding_reminder' | 'rsvp_confirmation' | 'payment_reminder' | 'payment_receipt' | 'vendor_communication' | 'general';

// Map database email types (snake_case) to EmailType (camelCase)
const emailTypeMap: Record<DatabaseEmailType, EmailType> = {
  client_invite: 'clientInvite',
  wedding_reminder: 'weddingReminder',
  rsvp_confirmation: 'rsvpConfirmation',
  payment_reminder: 'paymentReminder',
  payment_receipt: 'paymentReceipt',
  vendor_communication: 'vendorCommunication',
  general: 'clientInvite', // Default fallback
};

// Helper function to log email to database
async function logEmail({
  db,
  companyId,
  clientId,
  templateType,
  toEmail,
  recipientName,
  subject,
  resendId,
  status,
  errorMessage,
  metadata,
  locale = 'en',
}: {
  db: any; // Drizzle database instance
  companyId: string;
  clientId?: string;
  templateType: DatabaseEmailType;
  toEmail: string;
  recipientName?: string;
  subject: string;
  resendId?: string;
  status: 'pending' | 'sent' | 'failed';
  errorMessage?: string;
  metadata?: Record<string, any>;
  locale?: string;
}) {
  try {
    const { nanoid } = await import('nanoid');
    // Schema has: id, clientId, userId, to, subject, body, status, createdAt
    // Store extra info in body as JSON for now
    const [log] = await db.insert(schema.emailLogs).values({
      id: nanoid(),
      clientId: clientId || undefined,
      to: toEmail,
      subject,
      body: JSON.stringify({
        templateType,
        recipientName,
        locale,
        resendId,
        errorMessage,
        metadata,
      }),
      status,
    }).returning();

    return log;
  } catch (error) {
    console.error('Failed to log email:', error);
    return null;
  }
}

export const emailRouter = router({
  // Send client invitation email
  sendClientInvite: protectedProcedure
    .input(
      z.object({
        clientId: z.string().uuid(),
        clientName: z.string(),
        clientEmail: z.string().email(),
        plannerName: z.string(),
        inviteLink: z.string().url(),
        locale: z.enum(['en', 'es', 'fr', 'de', 'ja', 'zh', 'hi']).default('en'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, companyId } = ctx;
      const { clientId, clientName, clientEmail, plannerName, inviteLink, locale } = input;

      // Guard: Ensure companyId exists in session claims
      if (!companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      // SECURITY: Verify clientId belongs to company
      const [client] = await db
        .select({ id: schema.clients.id })
        .from(schema.clients)
        .where(and(
          eq(schema.clients.id, clientId),
          eq(schema.clients.companyId, companyId)
        ))
        .limit(1);

      if (!client) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Client not found or access denied',
        });
      }

      try {
        // Get email subject
        const subject = getEmailSubject('clientInvite', locale);

        // Render email template
        const html = await render(
          ClientInviteEmail({
            clientName,
            plannerName,
            inviteLink,
            locale,
          })
        );

        // Send email via Resend
        const result = await resend.emails.send({
          from: 'WeddingFlo <noreply@weddingflow.com>',
          to: clientEmail,
          subject,
          html,
        });

        if (result.error) {
          // Log failed email
          await logEmail({
            db,
            companyId,
            clientId,
            templateType: 'client_invite',
            toEmail: clientEmail,
            subject,
            status: 'failed',
            errorMessage: result.error.message,
            metadata: { clientName, locale },
          });

          throw new Error(`Failed to send email: ${result.error.message}`);
        }

        // Log successful email
        await logEmail({
          db,
          companyId,
          clientId,
          templateType: 'client_invite',
          toEmail: clientEmail,
          subject,
          resendId: result.data?.id,
          status: 'sent',
          metadata: { clientName, locale, plannerName, inviteLink },
        });

        return {
          success: true,
          emailId: result.data?.id,
          message: 'Client invitation sent successfully',
        };
      } catch (error) {
        console.error('Error sending client invite:', error);
        throw new Error(error instanceof Error ? error.message : 'Failed to send email');
      }
    }),

  // Send wedding reminder email
  sendWeddingReminder: protectedProcedure
    .input(
      z.object({
        clientId: z.string().uuid(),
        clientName: z.string(),
        clientEmail: z.string().email(),
        weddingDate: z.string(),
        daysUntilWedding: z.number().int().positive(),
        dashboardLink: z.string().url(),
        locale: z.enum(['en', 'es', 'fr', 'de', 'ja', 'zh', 'hi']).default('en'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, companyId } = ctx;
      const { clientId, clientName, clientEmail, weddingDate, daysUntilWedding, dashboardLink, locale } = input;

      if (!companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      // SECURITY: Verify clientId belongs to company
      const [client] = await db
        .select({ id: schema.clients.id })
        .from(schema.clients)
        .where(and(
          eq(schema.clients.id, clientId),
          eq(schema.clients.companyId, companyId)
        ))
        .limit(1);

      if (!client) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Client not found or access denied',
        });
      }

      try {
        // TODO: Implement email preference checking when user_id columns are added to clients table
        // Currently clients table doesn't have partner1_user_id/partner2_user_id columns

        // Get email subject with variables
        const subject = getEmailSubject('weddingReminder', locale, {
          days: daysUntilWedding.toString(),
        });

        // Render email template
        const html = await render(
          WeddingReminderEmail({
            clientName,
            weddingDate,
            daysUntilWedding,
            dashboardLink,
            locale,
          })
        );

        // Send email via Resend
        const result = await resend.emails.send({
          from: 'WeddingFlo <noreply@weddingflow.com>',
          to: clientEmail,
          subject,
          html,
        });

        if (result.error) {
          await logEmail({
            db,
            companyId,
            clientId,
            templateType: 'wedding_reminder',
            toEmail: clientEmail,
            subject,
            status: 'failed',
            errorMessage: result.error.message,
            metadata: { clientName, locale },
          });

          throw new Error(`Failed to send email: ${result.error.message}`);
        }

        // Log successful email
        await logEmail({
          db,
          companyId,
          clientId,
          templateType: 'wedding_reminder',
          toEmail: clientEmail,
          subject,
          resendId: result.data?.id,
          status: 'sent',
          metadata: { clientName, locale, weddingDate, daysUntilWedding, dashboardLink },
        });

        return {
          success: true,
          emailId: result.data?.id,
          message: 'Wedding reminder sent successfully',
        };
      } catch (error) {
        console.error('Error sending wedding reminder:', error);
        throw new Error(error instanceof Error ? error.message : 'Failed to send email');
      }
    }),

  // Send payment reminder email
  sendPaymentReminder: protectedProcedure
    .input(
      z.object({
        clientId: z.string().uuid(),
        clientName: z.string(),
        clientEmail: z.string().email(),
        amount: z.string(),
        dueDate: z.string(),
        description: z.string(),
        paymentLink: z.string().url(),
        locale: z.enum(['en', 'es', 'fr', 'de', 'ja', 'zh', 'hi']).default('en'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, companyId } = ctx;
      const { clientId, clientName, clientEmail, amount, dueDate, description, paymentLink, locale } = input;

      if (!companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      // SECURITY: Verify clientId belongs to company
      const [client] = await db
        .select({ id: schema.clients.id })
        .from(schema.clients)
        .where(and(
          eq(schema.clients.id, clientId),
          eq(schema.clients.companyId, companyId)
        ))
        .limit(1);

      if (!client) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Client not found or access denied',
        });
      }

      try {
        // TODO: Implement email preference checking when user_id columns are added to clients table
        // Currently clients table doesn't have partner1_user_id/partner2_user_id columns

        // Get email subject with variables
        const subject = getEmailSubject('paymentReminder', locale, { amount });

        // Render email template
        const html = await render(
          PaymentReminderEmail({
            clientName,
            amount,
            dueDate,
            description,
            paymentLink,
            locale,
          })
        );

        // Send email via Resend
        const result = await resend.emails.send({
          from: 'WeddingFlo <noreply@weddingflow.com>',
          to: clientEmail,
          subject,
          html,
        });

        if (result.error) {
          await logEmail({
            db,
            companyId,
            clientId,
            templateType: 'payment_reminder',
            toEmail: clientEmail,
            subject,
            status: 'failed',
            errorMessage: result.error.message,
            metadata: { clientName, locale },
          });

          throw new Error(`Failed to send email: ${result.error.message}`);
        }

        // Log successful email
        await logEmail({
          db,
          companyId,
          clientId,
          templateType: 'payment_reminder',
          toEmail: clientEmail,
          subject,
          resendId: result.data?.id,
          status: 'sent',
          metadata: { clientName, locale, amount, dueDate, description, paymentLink },
        });

        return {
          success: true,
          emailId: result.data?.id,
          message: 'Payment reminder sent successfully',
        };
      } catch (error) {
        console.error('Error sending payment reminder:', error);
        throw new Error(error instanceof Error ? error.message : 'Failed to send email');
      }
    }),

  // Send RSVP confirmation email
  sendRsvpConfirmation: protectedProcedure
    .input(
      z.object({
        guestName: z.string(),
        guestEmail: z.string().email(),
        eventName: z.string(),
        eventDate: z.string(),
        eventLocation: z.string(),
        attending: z.boolean(),
        guestCount: z.number().int().min(1).optional(),
        dietaryRestrictions: z.string().optional(),
        specialRequests: z.string().optional(),
        locale: z.enum(['en', 'es', 'fr', 'de', 'ja', 'zh', 'hi']).default('en'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, companyId } = ctx;
      const {
        guestName,
        guestEmail,
        eventName,
        eventDate,
        eventLocation,
        attending,
        guestCount,
        dietaryRestrictions,
        specialRequests,
        locale
      } = input;

      if (!companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      try {
        // Get email subject
        const subject = getEmailSubject('rsvpConfirmation', locale);

        // Render email template
        const html = await render(
          RsvpConfirmationEmail({
            guestName,
            eventName,
            eventDate,
            eventLocation,
            attending,
            guestCount,
            dietaryRestrictions,
            specialRequests,
            locale,
          })
        );

        // Send email via Resend
        const result = await resend.emails.send({
          from: 'WeddingFlo <noreply@weddingflow.com>',
          to: guestEmail,
          subject,
          html,
        });

        if (result.error) {
          await logEmail({
            db,
            companyId,
            templateType: 'rsvp_confirmation',
            toEmail: guestEmail,
            subject,
            status: 'failed',
            errorMessage: result.error.message,
            metadata: { guestName, locale },
          });

          throw new Error(`Failed to send email: ${result.error.message}`);
        }

        // Log successful email
        await logEmail({
          db,
          companyId,
          templateType: 'rsvp_confirmation',
          toEmail: guestEmail,
          subject,
          resendId: result.data?.id,
          status: 'sent',
          metadata: {
            guestName,
            locale,
            eventName,
            eventDate,
            eventLocation,
            attending,
            guestCount,
            dietaryRestrictions,
            specialRequests,
          },
        });

        return {
          success: true,
          emailId: result.data?.id,
          message: 'RSVP confirmation sent successfully',
        };
      } catch (error) {
        console.error('Error sending RSVP confirmation:', error);
        throw new Error(error instanceof Error ? error.message : 'Failed to send email');
      }
    }),

  // Send payment receipt email
  sendPaymentReceipt: protectedProcedure
    .input(
      z.object({
        clientId: z.string().uuid(),
        clientName: z.string(),
        clientEmail: z.string().email(),
        amount: z.string(),
        paymentDate: z.string(),
        paymentMethod: z.string(),
        transactionId: z.string(),
        description: z.string(),
        remainingBalance: z.string().optional(),
        receiptLink: z.string().url(),
        locale: z.enum(['en', 'es', 'fr', 'de', 'ja', 'zh', 'hi']).default('en'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, companyId } = ctx;
      const {
        clientId,
        clientName,
        clientEmail,
        amount,
        paymentDate,
        paymentMethod,
        transactionId,
        description,
        remainingBalance,
        receiptLink,
        locale,
      } = input;

      if (!companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      // SECURITY: Verify clientId belongs to company
      const [client] = await db
        .select({ id: schema.clients.id })
        .from(schema.clients)
        .where(and(
          eq(schema.clients.id, clientId),
          eq(schema.clients.companyId, companyId)
        ))
        .limit(1);

      if (!client) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Client not found or access denied',
        });
      }

      try {
        // Get email subject with variables
        const subject = getEmailSubject('paymentReceipt', locale, { amount });

        // Render email template
        const html = await render(
          PaymentReceiptEmail({
            clientName,
            amount,
            paymentDate,
            paymentMethod,
            transactionId,
            description,
            remainingBalance,
            receiptLink,
            locale,
          })
        );

        // Send email via Resend
        const result = await resend.emails.send({
          from: 'WeddingFlo <noreply@weddingflow.com>',
          to: clientEmail,
          subject,
          html,
        });

        if (result.error) {
          await logEmail({
            db,
            companyId,
            clientId,
            templateType: 'payment_receipt',
            toEmail: clientEmail,
            subject,
            status: 'failed',
            errorMessage: result.error.message,
            metadata: { clientName, locale },
          });

          throw new Error(`Failed to send email: ${result.error.message}`);
        }

        // Log successful email
        await logEmail({
          db,
          companyId,
          clientId,
          templateType: 'payment_receipt',
          toEmail: clientEmail,
          subject,
          resendId: result.data?.id,
          status: 'sent',
          metadata: { clientName, locale, amount, paymentDate, paymentMethod, transactionId, description },
        });

        return {
          success: true,
          emailId: result.data?.id,
          message: 'Payment receipt sent successfully',
        };
      } catch (error) {
        console.error('Error sending payment receipt:', error);
        throw new Error(error instanceof Error ? error.message : 'Failed to send email');
      }
    }),

  // Send vendor communication email
  sendVendorCommunication: protectedProcedure
    .input(
      z.object({
        recipientName: z.string(),
        recipientEmail: z.string().email(),
        senderName: z.string(),
        senderRole: z.string(),
        subject: z.string(),
        message: z.string(),
        eventName: z.string().optional(),
        eventDate: z.string().optional(),
        priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
        locale: z.enum(['en', 'es', 'fr', 'de', 'ja', 'zh', 'hi']).default('en'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, companyId } = ctx;
      const {
        recipientName,
        recipientEmail,
        senderName,
        senderRole,
        subject: messageSubject,
        message,
        eventName,
        eventDate,
        priority,
        locale
      } = input;

      if (!companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      try {
        // Get email subject
        const subject = getEmailSubject('vendorCommunication', locale);

        // Render email template
        const html = await render(
          VendorCommunicationEmail({
            recipientName,
            senderName,
            senderRole,
            subject: messageSubject,
            message,
            eventName,
            eventDate,
            priority,
            locale,
          })
        );

        // Send email via Resend
        const result = await resend.emails.send({
          from: 'WeddingFlo <noreply@weddingflow.com>',
          to: recipientEmail,
          subject,
          html,
        });

        if (result.error) {
          await logEmail({
            db,
            companyId,
            templateType: 'vendor_communication',
            toEmail: recipientEmail,
            subject,
            status: 'failed',
            errorMessage: result.error.message,
            metadata: { recipientName, locale },
          });

          throw new Error(`Failed to send email: ${result.error.message}`);
        }

        // Log successful email
        await logEmail({
          db,
          companyId,
          templateType: 'vendor_communication',
          toEmail: recipientEmail,
          subject,
          resendId: result.data?.id,
          status: 'sent',
          metadata: {
            recipientName,
            locale,
            senderName,
            senderRole,
            messageSubject,
            message,
            eventName,
            eventDate,
            priority,
          },
        });

        return {
          success: true,
          emailId: result.data?.id,
          message: 'Vendor communication sent successfully',
        };
      } catch (error) {
        console.error('Error sending vendor communication:', error);
        throw new Error(error instanceof Error ? error.message : 'Failed to send email');
      }
    }),

  // Get email logs for company
  getEmailLogs: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(50),
        offset: z.number().int().min(0).default(0),
        templateType: z
          .enum([
            'client_invite',
            'wedding_reminder',
            'rsvp_confirmation',
            'payment_reminder',
            'payment_receipt',
            'vendor_communication',
            'general',
          ])
          .optional(),
        status: z.enum(['pending', 'sent', 'delivered', 'failed', 'bounced']).optional(),
        clientId: z.string().uuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { db, companyId } = ctx;
      const { limit, offset, templateType, status, clientId } = input;

      if (!companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      // SECURITY: Filter by company via client join
      // Build base query with company filtering
      const conditions: any[] = [];

      if (status) {
        conditions.push(eq(schema.emailLogs.status, status));
      }

      if (clientId) {
        // If specific clientId provided, verify it belongs to company first
        const [client] = await db
          .select({ id: schema.clients.id })
          .from(schema.clients)
          .where(and(
            eq(schema.clients.id, clientId),
            eq(schema.clients.companyId, companyId)
          ))
          .limit(1);

        if (!client) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Client not found or access denied',
          });
        }
        conditions.push(eq(schema.emailLogs.clientId, clientId));

        // Fetch logs for specific client
        const logs = await db.query.emailLogs.findMany({
          where: and(...conditions),
          orderBy: [desc(schema.emailLogs.createdAt)],
          limit,
          offset,
        });

        const [countResult] = await db.select({ count: count() })
          .from(schema.emailLogs)
          .where(and(...conditions));

        const total = countResult?.count || 0;

        return {
          logs,
          total,
          hasMore: total > offset + limit,
        };
      }

      // Get all client IDs for this company for filtering
      const companyClients = await db
        .select({ id: schema.clients.id })
        .from(schema.clients)
        .where(eq(schema.clients.companyId, companyId));

      const clientIds = companyClients.map(c => c.id);

      if (clientIds.length === 0) {
        return {
          logs: [],
          total: 0,
          hasMore: false,
        };
      }

      // Fetch logs for company's clients using innerJoin
      const logsQuery = db
        .select({
          id: schema.emailLogs.id,
          clientId: schema.emailLogs.clientId,
          userId: schema.emailLogs.userId,
          to: schema.emailLogs.to,
          subject: schema.emailLogs.subject,
          body: schema.emailLogs.body,
          status: schema.emailLogs.status,
          createdAt: schema.emailLogs.createdAt,
        })
        .from(schema.emailLogs)
        .leftJoin(schema.clients, eq(schema.emailLogs.clientId, schema.clients.id))
        .where(
          and(
            sql`(${schema.emailLogs.clientId} IS NULL OR ${schema.clients.companyId} = ${companyId})`,
            ...(status ? [eq(schema.emailLogs.status, status)] : [])
          )
        )
        .orderBy(desc(schema.emailLogs.createdAt))
        .limit(limit)
        .offset(offset);

      const logs = await logsQuery;

      // Get total count with same filtering
      const [countResult] = await db
        .select({ count: count() })
        .from(schema.emailLogs)
        .leftJoin(schema.clients, eq(schema.emailLogs.clientId, schema.clients.id))
        .where(
          and(
            sql`(${schema.emailLogs.clientId} IS NULL OR ${schema.clients.companyId} = ${companyId})`,
            ...(status ? [eq(schema.emailLogs.status, status)] : [])
          )
        );

      const total = countResult?.count || 0;

      return {
        logs,
        total,
        hasMore: total > offset + limit,
      };
    }),

  // Get email statistics
  getEmailStats: protectedProcedure
    .input(
      z.object({
        days: z.number().int().min(1).max(365).default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      const { db, companyId } = ctx;
      const { days } = input;

      if (!companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      // Calculate date threshold
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - days);

      // SECURITY: Get email stats filtered by company via client join
      // Filter to only include logs that belong to this company's clients
      const logs = await db
        .select({ status: schema.emailLogs.status })
        .from(schema.emailLogs)
        .leftJoin(schema.clients, eq(schema.emailLogs.clientId, schema.clients.id))
        .where(
          and(
            sql`${schema.emailLogs.createdAt} >= ${daysAgo}`,
            sql`(${schema.emailLogs.clientId} IS NULL OR ${schema.clients.companyId} = ${companyId})`
          )
        );

      const total_emails = logs.length;
      const sent_emails = logs.filter(l => l.status === 'sent').length;
      const delivered_emails = logs.filter(l => l.status === 'delivered').length;
      const failed_emails = logs.filter(l => l.status === 'failed').length;
      const bounced_emails = logs.filter(l => l.status === 'bounced').length;
      const success_rate = total_emails > 0
        ? ((sent_emails + delivered_emails) / total_emails) * 100
        : 0;

      return {
        total_emails,
        sent_emails,
        delivered_emails,
        failed_emails,
        bounced_emails,
        success_rate: Math.round(success_rate * 100) / 100,
      };
    }),

  // Get user email preferences
  // Schema has: id, userId, marketing, updates, createdAt, updatedAt
  getEmailPreferences: protectedProcedure.query(async ({ ctx }) => {
    const { db, userId } = ctx;

    const preferences = await db.query.emailPreferences.findFirst({
      where: eq(schema.emailPreferences.userId, userId),
    });

    // Return default preferences if none exist (matching schema shape)
    return preferences || {
      id: '',
      userId: userId,
      marketing: false,
      updates: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }),

  // Update user email preferences
  // Schema has: id, userId, marketing, updates, createdAt, updatedAt
  updateEmailPreferences: protectedProcedure
    .input(
      z.object({
        marketing: z.boolean().optional(),
        updates: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, userId } = ctx;

      // Try to update existing preferences
      const existing = await db.query.emailPreferences.findFirst({
        where: eq(schema.emailPreferences.userId, userId),
        columns: { id: true }
      });

      let preferences;

      if (existing) {
        // Update existing preferences
        const [updated] = await db
          .update(schema.emailPreferences)
          .set({
            ...input,
            updatedAt: new Date(),
          })
          .where(eq(schema.emailPreferences.userId, userId))
          .returning();
        preferences = updated;
      } else {
        // Insert new preferences
        const { nanoid } = await import('nanoid');
        const [created] = await db
          .insert(schema.emailPreferences)
          .values({
            id: nanoid(),
            userId,
            ...input,
          })
          .returning();
        preferences = created;
      }

      return {
        success: true,
        preferences,
        message: 'Email preferences updated successfully',
      };
    }),

  // Test email (for development/testing)
  sendTestEmail: protectedProcedure
    .input(
      z.object({
        to: z.string().email(),
        templateType: z.enum(['client_invite', 'wedding_reminder', 'payment_reminder', 'rsvp_confirmation', 'payment_receipt', 'vendor_communication']),
        locale: z.enum(['en', 'es', 'fr', 'de', 'ja', 'zh', 'hi']).default('en'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, companyId } = ctx;
      const { to, templateType, locale } = input;

      if (!companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      try {
        let html: string;
        let subject: string;

        // Render appropriate test template
        switch (templateType) {
          case 'client_invite':
            subject = getEmailSubject('clientInvite', locale);
            html = await render(
              ClientInviteEmail({
                clientName: 'John Doe',
                plannerName: 'Jane Smith',
                inviteLink: 'https://weddingflow.com/invite/test',
                locale,
              })
            );
            break;
          case 'wedding_reminder':
            subject = getEmailSubject('weddingReminder', locale, { days: '7' });
            html = await render(
              WeddingReminderEmail({
                clientName: 'John Doe',
                weddingDate: 'June 15, 2025',
                daysUntilWedding: 7,
                dashboardLink: 'https://weddingflow.com/dashboard',
                locale,
              })
            );
            break;
          case 'payment_reminder':
            subject = getEmailSubject('paymentReminder', locale, { amount: '$500' });
            html = await render(
              PaymentReminderEmail({
                clientName: 'John Doe',
                amount: '$500',
                dueDate: 'May 1, 2025',
                description: 'Venue deposit payment',
                paymentLink: 'https://weddingflow.com/payments/test',
                locale,
              })
            );
            break;
          case 'rsvp_confirmation':
            subject = getEmailSubject('rsvpConfirmation', locale);
            html = await render(
              RsvpConfirmationEmail({
                guestName: 'John Doe',
                eventName: 'Wedding Reception',
                eventDate: 'June 15, 2025',
                eventLocation: 'Grand Hotel Ballroom',
                attending: true,
                guestCount: 2,
                dietaryRestrictions: 'Vegetarian',
                locale,
              })
            );
            break;
          case 'payment_receipt':
            subject = getEmailSubject('paymentReceipt', locale, { amount: '$500' });
            html = await render(
              PaymentReceiptEmail({
                clientName: 'John Doe',
                amount: '$500',
                paymentDate: 'April 15, 2025',
                paymentMethod: 'Credit Card',
                transactionId: 'TXN123456789',
                description: 'Venue deposit payment',
                remainingBalance: '$1,000',
                receiptLink: 'https://weddingflow.com/receipts/test',
                locale,
              })
            );
            break;
          case 'vendor_communication':
            subject = getEmailSubject('vendorCommunication', locale);
            html = await render(
              VendorCommunicationEmail({
                recipientName: 'Vendor Name',
                senderName: 'John Doe',
                senderRole: 'Wedding Planner',
                subject: 'Question about catering options',
                message: 'I would like to discuss the menu options for our wedding.',
                eventName: 'Smith-Johnson Wedding',
                eventDate: 'June 15, 2025',
                priority: 'normal',
                locale,
              })
            );
            break;
        }

        // Send test email
        const result = await resend.emails.send({
          from: 'WeddingFlo <noreply@weddingflow.com>',
          to,
          subject: `[TEST] ${subject}`,
          html,
        });

        if (result.error) {
          throw new Error(`Failed to send test email: ${result.error.message}`);
        }

        // Log test email
        await logEmail({
          db,
          companyId,
          templateType,
          toEmail: to,
          subject: `[TEST] ${subject}`,
          resendId: result.data?.id,
          status: 'sent',
          metadata: { test: true, locale },
        });

        return {
          success: true,
          emailId: result.data?.id,
          message: 'Test email sent successfully',
        };
      } catch (error) {
        console.error('Error sending test email:', error);
        throw new Error(error instanceof Error ? error.message : 'Failed to send test email');
      }
    }),
});
