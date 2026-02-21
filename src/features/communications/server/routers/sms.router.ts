import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '@/server/trpc/trpc';
import { eq, and, desc, gte, count } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';
import {
  sendSms,
  getSmsMessage,
  formatPhoneNumber,
  isValidPhoneNumber,
  type Locale,
} from '@/lib/sms/twilio';

// Helper function to log SMS to database
// Schema has: id, clientId, to, message, status, createdAt
async function logSms({
  db,
  clientId,
  toPhone,
  content,
  status,
}: {
  db: any;
  clientId?: string;
  toPhone: string;
  content: string;
  status: 'pending' | 'queued' | 'sending' | 'sent' | 'failed';
}) {
  try {
    const [log] = await db.insert(schema.smsLogs).values({
      id: crypto.randomUUID(),
      clientId: clientId || undefined,
      to: toPhone,
      message: content,
      status,
    }).returning();

    return log;
  } catch (error) {
    console.error('Failed to log SMS:', error);
    return null;
  }
}

export const smsRouter = router({
  // Send wedding reminder SMS
  sendWeddingReminder: protectedProcedure
    .input(
      z.object({
        clientId: z.string().uuid(),
        recipientName: z.string(),
        recipientPhone: z.string(),
        eventName: z.string(),
        daysUntilWedding: z.number().int().positive(),
        locale: z.enum(['en', 'es', 'fr', 'de', 'ja', 'zh', 'hi']).default('en'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, companyId } = ctx;
      const { clientId, recipientName, recipientPhone, eventName, daysUntilWedding, locale } = input;

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
        // Validate phone number
        if (!isValidPhoneNumber(recipientPhone)) {
          throw new Error('Invalid phone number format');
        }

        // Get SMS message from template
        const message = getSmsMessage('weddingReminder', locale, daysUntilWedding, eventName);

        // Send SMS via Twilio
        const result = await sendSms({
          to: recipientPhone,
          message,
        });

        if (!result.success) {
          // Log failed SMS
          await logSms({
            db,
            clientId,
            toPhone: formatPhoneNumber(recipientPhone),
            content: message,
            status: 'failed',
          });

          throw new Error(`Failed to send SMS: ${result.error}`);
        }

        // Log successful SMS
        await logSms({
          db,
          clientId,
          toPhone: formatPhoneNumber(recipientPhone),
          content: message,
          status: result.status === 'queued' ? 'queued' : 'sent',
        });

        return {
          success: true,
          sid: result.sid,
          segments: result.segments,
          message: 'Wedding reminder SMS sent successfully',
        };
      } catch (error) {
        console.error('Error sending wedding reminder SMS:', error);
        throw new Error(error instanceof Error ? error.message : 'Failed to send SMS');
      }
    }),

  // Send RSVP confirmation SMS
  sendRsvpConfirmation: protectedProcedure
    .input(
      z.object({
        clientId: z.string().uuid().optional(),
        guestName: z.string(),
        guestPhone: z.string(),
        eventName: z.string(),
        locale: z.enum(['en', 'es', 'fr', 'de', 'ja', 'zh', 'hi']).default('en'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, companyId } = ctx;
      const { clientId, guestName, guestPhone, eventName, locale } = input;

      if (!companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      try {
        if (!isValidPhoneNumber(guestPhone)) {
          throw new Error('Invalid phone number format');
        }

        const message = getSmsMessage('rsvpConfirmation', locale, guestName, eventName);

        const result = await sendSms({
          to: guestPhone,
          message,
        });

        if (!result.success) {
          await logSms({
            db,
            clientId,
            toPhone: formatPhoneNumber(guestPhone),
            content: message,
            status: 'failed',
          });

          throw new Error(`Failed to send SMS: ${result.error}`);
        }

        await logSms({
          db,
          clientId,
          toPhone: formatPhoneNumber(guestPhone),
          content: message,
          status: result.status === 'queued' ? 'queued' : 'sent',
        });

        return {
          success: true,
          sid: result.sid,
          segments: result.segments,
          message: 'RSVP confirmation SMS sent successfully',
        };
      } catch (error) {
        console.error('Error sending RSVP confirmation SMS:', error);
        throw new Error(error instanceof Error ? error.message : 'Failed to send SMS');
      }
    }),

  // Send payment reminder SMS
  sendPaymentReminder: protectedProcedure
    .input(
      z.object({
        clientId: z.string().uuid(),
        recipientName: z.string(),
        recipientPhone: z.string(),
        amount: z.string(),
        dueDate: z.string(),
        locale: z.enum(['en', 'es', 'fr', 'de', 'ja', 'zh', 'hi']).default('en'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, companyId } = ctx;
      const { clientId, recipientName, recipientPhone, amount, dueDate, locale } = input;

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
        if (!isValidPhoneNumber(recipientPhone)) {
          throw new Error('Invalid phone number format');
        }

        const message = getSmsMessage('paymentReminder', locale, amount, dueDate);

        const result = await sendSms({
          to: recipientPhone,
          message,
        });

        if (!result.success) {
          await logSms({
            db,
            clientId,
            toPhone: formatPhoneNumber(recipientPhone),
            content: message,
            status: 'failed',
          });

          throw new Error(`Failed to send SMS: ${result.error}`);
        }

        await logSms({
          db,
          clientId,
          toPhone: formatPhoneNumber(recipientPhone),
          content: message,
          status: result.status === 'queued' ? 'queued' : 'sent',
        });

        return {
          success: true,
          sid: result.sid,
          segments: result.segments,
          message: 'Payment reminder SMS sent successfully',
        };
      } catch (error) {
        console.error('Error sending payment reminder SMS:', error);
        throw new Error(error instanceof Error ? error.message : 'Failed to send SMS');
      }
    }),

  // Send payment received confirmation SMS
  sendPaymentReceived: protectedProcedure
    .input(
      z.object({
        clientId: z.string().uuid(),
        recipientName: z.string(),
        recipientPhone: z.string(),
        amount: z.string(),
        locale: z.enum(['en', 'es', 'fr', 'de', 'ja', 'zh', 'hi']).default('en'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, companyId } = ctx;
      const { clientId, recipientName, recipientPhone, amount, locale } = input;

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
        if (!isValidPhoneNumber(recipientPhone)) {
          throw new Error('Invalid phone number format');
        }

        const message = getSmsMessage('paymentReceived', locale, amount);

        const result = await sendSms({
          to: recipientPhone,
          message,
        });

        if (!result.success) {
          await logSms({
            db,
            clientId,
            toPhone: formatPhoneNumber(recipientPhone),
            content: message,
            status: 'failed',
          });

          throw new Error(`Failed to send SMS: ${result.error}`);
        }

        await logSms({
          db,
          clientId,
          toPhone: formatPhoneNumber(recipientPhone),
          content: message,
          status: result.status === 'queued' ? 'queued' : 'sent',
        });

        return {
          success: true,
          sid: result.sid,
          segments: result.segments,
          message: 'Payment confirmation SMS sent successfully',
        };
      } catch (error) {
        console.error('Error sending payment confirmation SMS:', error);
        throw new Error(error instanceof Error ? error.message : 'Failed to send SMS');
      }
    }),

  // Send vendor notification SMS
  sendVendorNotification: protectedProcedure
    .input(
      z.object({
        clientId: z.string().uuid().optional(),
        recipientName: z.string(),
        recipientPhone: z.string(),
        message: z.string().max(1500), // Limit custom messages
        locale: z.enum(['en', 'es', 'fr', 'de', 'ja', 'zh', 'hi']).default('en'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, companyId } = ctx;
      const { clientId, recipientName, recipientPhone, message: customMessage, locale } = input;

      if (!companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      try {
        if (!isValidPhoneNumber(recipientPhone)) {
          throw new Error('Invalid phone number format');
        }

        const message = getSmsMessage('vendorNotification', locale, customMessage);

        const result = await sendSms({
          to: recipientPhone,
          message,
        });

        if (!result.success) {
          await logSms({
            db,
            clientId,
            toPhone: formatPhoneNumber(recipientPhone),
            content: message,
            status: 'failed',
          });

          throw new Error(`Failed to send SMS: ${result.error}`);
        }

        await logSms({
          db,
          clientId,
          toPhone: formatPhoneNumber(recipientPhone),
          content: message,
          status: result.status === 'queued' ? 'queued' : 'sent',
        });

        return {
          success: true,
          sid: result.sid,
          segments: result.segments,
          message: 'Vendor notification SMS sent successfully',
        };
      } catch (error) {
        console.error('Error sending vendor notification SMS:', error);
        throw new Error(error instanceof Error ? error.message : 'Failed to send SMS');
      }
    }),

  // Send event update SMS
  sendEventUpdate: protectedProcedure
    .input(
      z.object({
        clientId: z.string().uuid(),
        recipientName: z.string(),
        recipientPhone: z.string(),
        eventName: z.string(),
        updateMessage: z.string().max(500),
        locale: z.enum(['en', 'es', 'fr', 'de', 'ja', 'zh', 'hi']).default('en'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, companyId } = ctx;
      const { clientId, recipientName, recipientPhone, eventName, updateMessage, locale } = input;

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
        if (!isValidPhoneNumber(recipientPhone)) {
          throw new Error('Invalid phone number format');
        }

        const message = getSmsMessage('eventUpdate', locale, eventName, updateMessage);

        const result = await sendSms({
          to: recipientPhone,
          message,
        });

        if (!result.success) {
          await logSms({
            db,
            clientId,
            toPhone: formatPhoneNumber(recipientPhone),
            content: message,
            status: 'failed',
          });

          throw new Error(`Failed to send SMS: ${result.error}`);
        }

        await logSms({
          db,
          clientId,
          toPhone: formatPhoneNumber(recipientPhone),
          content: message,
          status: result.status === 'queued' ? 'queued' : 'sent',
        });

        return {
          success: true,
          sid: result.sid,
          segments: result.segments,
          message: 'Event update SMS sent successfully',
        };
      } catch (error) {
        console.error('Error sending event update SMS:', error);
        throw new Error(error instanceof Error ? error.message : 'Failed to send SMS');
      }
    }),

  // Get SMS logs
  // Schema: id, clientId, to, message, status, createdAt
  getSmsLogs: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(50),
        offset: z.number().int().min(0).default(0),
        status: z.enum(['pending', 'queued', 'sending', 'sent', 'delivered', 'undelivered', 'failed']).optional(),
        clientId: z.string().uuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { db, companyId } = ctx;
      const { limit, offset, status, clientId } = input;

      if (!companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      // Build where conditions (schema doesn't have companyId, filter by clientId if provided)
      const conditions: any[] = [];

      if (status) {
        conditions.push(eq(schema.smsLogs.status, status));
      }

      if (clientId) {
        conditions.push(eq(schema.smsLogs.clientId, clientId));
      }

      // Get logs with filtering
      const logs = await db.query.smsLogs.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        orderBy: [desc(schema.smsLogs.createdAt)],
        limit,
        offset,
      });

      // Get total count
      const [countResult] = await db
        .select({ count: count() })
        .from(schema.smsLogs)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      const total = countResult?.count || 0;

      return {
        logs,
        total,
        hasMore: total > offset + limit,
      };
    }),

  // Get SMS statistics
  getSmsStats: protectedProcedure
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

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get counts by status (schema doesn't have companyId)
      const statsResult = await db
        .select({
          status: schema.smsLogs.status,
          count: count(),
        })
        .from(schema.smsLogs)
        .where(gte(schema.smsLogs.createdAt, startDate))
        .groupBy(schema.smsLogs.status);

      // Calculate totals
      let totalSms = 0;
      let sentSms = 0;
      let deliveredSms = 0;
      let failedSms = 0;

      for (const row of statsResult) {
        totalSms += row.count;
        if (row.status === 'sent' || row.status === 'queued') {
          sentSms += row.count;
        }
        if (row.status === 'delivered') {
          deliveredSms += row.count;
        }
        if (row.status === 'failed') {
          failedSms += row.count;
        }
      }

      const successRate = totalSms > 0 ? ((sentSms + deliveredSms) / totalSms) * 100 : 0;

      return {
        total_sms: totalSms,
        sent_sms: sentSms,
        delivered_sms: deliveredSms,
        failed_sms: failedSms,
        total_segments: 0,
        success_rate: Math.round(successRate * 100) / 100,
      };
    }),

  // Get user SMS preferences
  // Schema: id, userId, smsEnabled, marketingSms, transactionalSms, reminderSms, phoneNumber, enabled, rsvpUpdates, reminders, createdAt, updatedAt
  getSmsPreferences: protectedProcedure
    .query(async ({ ctx }) => {
      const { db, userId } = ctx;

      const preferences = await db.query.smsPreferences.findFirst({
        where: eq(schema.smsPreferences.userId, userId),
      });

      // Return default preferences if none exist
      return preferences || {
        id: '',
        userId,
        smsEnabled: true,
        marketingSms: false,
        transactionalSms: true,
        reminderSms: true,
        phoneNumber: null,
        enabled: true,
        rsvpUpdates: true,
        reminders: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }),

  // Update user SMS preferences
  updateSmsPreferences: protectedProcedure
    .input(
      z.object({
        smsEnabled: z.boolean().optional(),
        marketingSms: z.boolean().optional(),
        transactionalSms: z.boolean().optional(),
        reminderSms: z.boolean().optional(),
        phoneNumber: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, userId } = ctx;

      // Check if preferences exist
      const existing = await db.query.smsPreferences.findFirst({
        where: eq(schema.smsPreferences.userId, userId),
      });

      let result;

      if (existing) {
        // Update existing preferences
        const [updated] = await db
          .update(schema.smsPreferences)
          .set({
            ...input,
            updatedAt: new Date(),
          })
          .where(eq(schema.smsPreferences.userId, userId))
          .returning();
        result = updated;
      } else {
        // Insert new preferences
        const [inserted] = await db
          .insert(schema.smsPreferences)
          .values({
            id: crypto.randomUUID(),
            userId,
            smsEnabled: input.smsEnabled ?? true,
            marketingSms: input.marketingSms ?? false,
            transactionalSms: input.transactionalSms ?? true,
            reminderSms: input.reminderSms ?? true,
            phoneNumber: input.phoneNumber || undefined,
          })
          .returning();
        result = inserted;
      }

      return {
        success: true,
        preferences: result,
        message: 'SMS preferences updated successfully',
      };
    }),

  // Test SMS (for development/testing)
  sendTestSms: protectedProcedure
    .input(
      z.object({
        to: z.string(),
        templateType: z.enum(['wedding_reminder', 'rsvp_confirmation', 'payment_reminder']),
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
        if (!isValidPhoneNumber(to)) {
          throw new Error('Invalid phone number format');
        }

        let message: string;

        // Generate test message based on template type
        switch (templateType) {
          case 'wedding_reminder':
            message = getSmsMessage('weddingReminder', locale, 7, 'Test Wedding');
            break;
          case 'rsvp_confirmation':
            message = getSmsMessage('rsvpConfirmation', locale, 'John Doe', 'Test Event');
            break;
          case 'payment_reminder':
            message = getSmsMessage('paymentReminder', locale, '$500', 'May 1, 2025');
            break;
        }

        // Prepend [TEST] to message
        message = `[TEST] ${message}`;

        // Send test SMS
        const result = await sendSms({
          to,
          message,
        });

        if (!result.success) {
          throw new Error(`Failed to send test SMS: ${result.error}`);
        }

        // Log test SMS
        await logSms({
          db,
          toPhone: formatPhoneNumber(to),
          content: message,
          status: result.status === 'queued' ? 'queued' : 'sent',
        });

        return {
          success: true,
          sid: result.sid,
          segments: result.segments,
          message: 'Test SMS sent successfully',
        };
      } catch (error) {
        console.error('Error sending test SMS:', error);
        throw new Error(error instanceof Error ? error.message : 'Failed to send SMS');
      }
    }),
});
