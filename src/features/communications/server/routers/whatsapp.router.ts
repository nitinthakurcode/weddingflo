import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, router } from '@/server/trpc/trpc';
import { eq, and, desc, gte, count } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';
import { sendWhatsAppMessage, formatWhatsAppNumber, isValidWhatsAppNumber } from '@/lib/whatsapp/whatsapp-client';

// Send WhatsApp message schema
const sendWhatsAppMessageSchema = z.object({
  clientId: z.string().uuid().optional(),
  toNumber: z.string().min(10),
  message: z.string().min(1).max(1600), // WhatsApp limit
  mediaUrl: z.array(z.string().url()).optional(),
});

// Get logs schema
const getLogsSchema = z.object({
  clientId: z.string().uuid().optional(),
  status: z.enum(['queued', 'sent', 'delivered', 'read', 'failed', 'undelivered']).optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

// Create template schema
const createTemplateSchema = z.object({
  name: z.string().min(1),
  language: z.string().default('en'),
  category: z.enum(['MARKETING', 'UTILITY', 'AUTHENTICATION']),
  templateBody: z.string().min(1),
  variables: z.array(z.string()).optional(),
  headerText: z.string().optional(),
  footerText: z.string().optional(),
  buttonText: z.string().optional(),
  buttonUrl: z.string().url().optional(),
});

export const whatsappRouter = router({
  // Send WhatsApp message
  sendMessage: protectedProcedure
    .input(sendWhatsAppMessageSchema)
    .mutation(async ({ ctx, input }) => {
      const { db, companyId } = ctx;

      if (!companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      try {
        // Validate phone number
        if (!isValidWhatsAppNumber(input.toNumber)) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid WhatsApp number format. Must include country code (e.g., +1234567890)',
          });
        }

        const formattedNumber = formatWhatsAppNumber(input.toNumber);
        const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER || '';

        // Send WhatsApp message via Twilio
        const result = await sendWhatsAppMessage({
          to: formattedNumber,
          body: input.message,
          mediaUrl: input.mediaUrl,
        });

        if (!result.success) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: result.error || 'Failed to send WhatsApp message',
          });
        }

        // Log the message to database
        try {
          await db.insert(schema.whatsappLogs).values({
            companyId,
            clientId: input.clientId || undefined,
            toPhone: formattedNumber,
            fromPhone: fromNumber || undefined,
            content: input.message,
            status: result.status || 'queued',
            twilioSid: result.sid || undefined,
            metadata: { mediaUrl: input.mediaUrl || null },
          });
        } catch (insertError) {
          console.error('Error logging WhatsApp message:', insertError);
        }

        return {
          success: true,
          messageId: result.sid,
          status: result.status,
          message: 'WhatsApp message sent successfully',
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error('Error sending WhatsApp message:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to send WhatsApp message',
          cause: error,
        });
      }
    }),

  // Get WhatsApp logs
  getLogs: protectedProcedure
    .input(getLogsSchema)
    .query(async ({ ctx, input }) => {
      const { db, companyId } = ctx;

      if (!companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      try {
        // Build conditions
        const conditions = [eq(schema.whatsappLogs.companyId, companyId)];

        if (input.clientId) {
          conditions.push(eq(schema.whatsappLogs.clientId, input.clientId));
        }

        if (input.status) {
          conditions.push(eq(schema.whatsappLogs.status, input.status));
        }

        // Get logs with client info
        const logs = await db.query.whatsappLogs.findMany({
          where: and(...conditions),
          orderBy: [desc(schema.whatsappLogs.createdAt)],
          limit: input.limit,
          offset: input.offset,
          with: {
            client: true,
          },
        });

        // Get total count
        const [countResult] = await db
          .select({ count: count() })
          .from(schema.whatsappLogs)
          .where(and(...conditions));

        const total = countResult?.count || 0;

        return {
          logs,
          total,
          limit: input.limit,
          offset: input.offset,
        };
      } catch (error) {
        console.error('Error fetching WhatsApp logs:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch WhatsApp logs',
          cause: error,
        });
      }
    }),

  // Get WhatsApp statistics
  getStats: protectedProcedure
    .input(z.object({ days: z.number().min(1).max(365).default(30) }))
    .query(async ({ ctx, input }) => {
      const { db, companyId } = ctx;

      if (!companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - input.days);

        // Get counts by status
        const statsResult = await db
          .select({
            status: schema.whatsappLogs.status,
            count: count(),
          })
          .from(schema.whatsappLogs)
          .where(
            and(
              eq(schema.whatsappLogs.companyId, companyId),
              gte(schema.whatsappLogs.createdAt, startDate)
            )
          )
          .groupBy(schema.whatsappLogs.status);

        // Calculate totals
        let totalSent = 0;
        let delivered = 0;
        let read = 0;
        let failed = 0;

        for (const row of statsResult) {
          totalSent += row.count;
          if (row.status === 'delivered') {
            delivered += row.count;
          }
          if (row.status === 'read') {
            read += row.count;
          }
          if (row.status === 'failed' || row.status === 'undelivered') {
            failed += row.count;
          }
        }

        const deliveryRate = totalSent > 0 ? ((delivered + read) / totalSent) * 100 : 0;

        return {
          total_sent: totalSent,
          delivered,
          read,
          failed,
          delivery_rate: Math.round(deliveryRate * 100) / 100,
        };
      } catch (error) {
        console.error('Error fetching WhatsApp stats:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch WhatsApp statistics',
          cause: error,
        });
      }
    }),

  // Create WhatsApp template
  createTemplate: protectedProcedure
    .input(createTemplateSchema)
    .mutation(async ({ ctx, input }) => {
      const { db, companyId } = ctx;

      if (!companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      try {
        const [template] = await db
          .insert(schema.whatsappTemplates)
          .values({
            companyId,
            name: input.name,
            language: input.language,
            category: input.category.toLowerCase(),
            content: input.templateBody,
            variables: input.variables || [],
            status: 'pending',
          })
          .returning();

        return {
          success: true,
          template,
          message: 'Template created. Submit to Twilio for approval.',
        };
      } catch (error: any) {
        if (error?.code === '23505') {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Template with this name and language already exists',
          });
        }

        console.error('Error creating WhatsApp template:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create WhatsApp template',
          cause: error,
        });
      }
    }),

  // Get WhatsApp templates
  getTemplates: protectedProcedure
    .query(async ({ ctx }) => {
      const { db, companyId } = ctx;

      if (!companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      try {
        const templates = await db.query.whatsappTemplates.findMany({
          where: eq(schema.whatsappTemplates.companyId, companyId),
          orderBy: [desc(schema.whatsappTemplates.createdAt)],
        });

        return templates;
      } catch (error) {
        console.error('Error fetching WhatsApp templates:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch WhatsApp templates',
          cause: error,
        });
      }
    }),

  // Delete WhatsApp template
  deleteTemplate: protectedProcedure
    .input(z.object({ templateId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { db, companyId } = ctx;

      if (!companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      try {
        await db
          .delete(schema.whatsappTemplates)
          .where(
            and(
              eq(schema.whatsappTemplates.id, input.templateId),
              eq(schema.whatsappTemplates.companyId, companyId)
            )
          );

        return {
          success: true,
          message: 'Template deleted successfully',
        };
      } catch (error) {
        console.error('Error deleting WhatsApp template:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete WhatsApp template',
          cause: error,
        });
      }
    }),
});
