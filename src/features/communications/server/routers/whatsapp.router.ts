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
  content: z.string().min(1),
});

export const whatsappRouter = router({
  // Send WhatsApp message
  // whatsappLogs schema: id, clientId, to, message, status, createdAt
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

      // SECURITY: Verify clientId belongs to company if provided
      if (input.clientId) {
        const [client] = await db
          .select({ id: schema.clients.id })
          .from(schema.clients)
          .where(and(
            eq(schema.clients.id, input.clientId),
            eq(schema.clients.companyId, companyId)
          ))
          .limit(1);

        if (!client) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Client not found or access denied',
          });
        }
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
            id: crypto.randomUUID(),
            clientId: input.clientId || undefined,
            to: formattedNumber,
            message: input.message,
            status: result.status || 'queued',
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
        // SECURITY: Filter by company through clients table join
        // Build conditions with company isolation
        const conditions: any[] = [
          eq(schema.clients.companyId, companyId),
        ];

        if (input.clientId) {
          conditions.push(eq(schema.whatsappLogs.clientId, input.clientId));
        }

        if (input.status) {
          conditions.push(eq(schema.whatsappLogs.status, input.status));
        }

        // Get logs with inner join to ensure company isolation
        const logs = await db
          .select({
            id: schema.whatsappLogs.id,
            clientId: schema.whatsappLogs.clientId,
            to: schema.whatsappLogs.to,
            message: schema.whatsappLogs.message,
            status: schema.whatsappLogs.status,
            createdAt: schema.whatsappLogs.createdAt,
          })
          .from(schema.whatsappLogs)
          .innerJoin(schema.clients, eq(schema.whatsappLogs.clientId, schema.clients.id))
          .where(and(...conditions))
          .orderBy(desc(schema.whatsappLogs.createdAt))
          .limit(input.limit)
          .offset(input.offset);

        // Get total count with same conditions
        const [countResult] = await db
          .select({ count: count() })
          .from(schema.whatsappLogs)
          .innerJoin(schema.clients, eq(schema.whatsappLogs.clientId, schema.clients.id))
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

        // SECURITY: Filter by company through clients table join
        const statsResult = await db
          .select({
            status: schema.whatsappLogs.status,
            count: count(),
          })
          .from(schema.whatsappLogs)
          .innerJoin(schema.clients, eq(schema.whatsappLogs.clientId, schema.clients.id))
          .where(and(
            eq(schema.clients.companyId, companyId),
            gte(schema.whatsappLogs.createdAt, startDate)
          ))
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
  // whatsappTemplates schema: id, companyId, name, content, createdAt, updatedAt
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
            id: crypto.randomUUID(),
            companyId,
            name: input.name,
            content: input.content,
          })
          .returning();

        return {
          success: true,
          template,
          message: 'Template created successfully',
        };
      } catch (error: any) {
        if (error?.code === '23505') {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Template with this name already exists',
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
