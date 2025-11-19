import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, router } from '@/server/trpc/trpc';
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
      const { supabase, companyId } = ctx;

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
        const { error: insertError } = await supabase
          .from('whatsapp_logs')
          .insert({
            company_id: companyId,
            client_id: input.clientId || null,
            to_number: formattedNumber,
            from_number: fromNumber,
            message: input.message,
            status: result.status || 'queued',
            twilio_sid: result.sid,
            media_url: input.mediaUrl || null,
            sent_at: new Date().toISOString(),
          });

        if (insertError) {
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
      const { supabase, companyId } = ctx;

      if (!companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      try {
        // TODO: Update select to use correct client columns (partner names not bride/groom)
        let query = supabase
          .from('whatsapp_logs')
          .select('*, client:clients(id, partner1_first_name, partner1_last_name, partner2_first_name, partner2_last_name)', { count: 'exact' })
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .range(input.offset, input.offset + input.limit - 1);

        if (input.clientId) {
          query = query.eq('client_id', input.clientId);
        }

        if (input.status) {
          query = query.eq('status', input.status);
        }

        const { data, error, count } = await query;

        if (error) throw error;

        return {
          logs: data || [],
          total: count || 0,
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
      const { supabase, companyId } = ctx;

      if (!companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      try {
        const { data, error } = await supabase.rpc('get_whatsapp_stats', {
          p_company_id: companyId,
          p_days: input.days,
        });

        if (error) throw error;

        return data?.[0] || {
          total_sent: 0,
          delivered: 0,
          read: 0,
          failed: 0,
          delivery_rate: 0,
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
      const { supabase, companyId } = ctx;

      if (!companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      try {
        const { data, error } = await supabase
          .from('whatsapp_templates')
          .insert({
            company_id: companyId,
            name: input.name,
            language: input.language,
            category: input.category,
            template_body: input.templateBody,
            variables: input.variables || [],
            header_text: input.headerText,
            footer_text: input.footerText,
            button_text: input.buttonText,
            button_url: input.buttonUrl,
            status: 'pending',
          })
          .select()
          .single();

        if (error) {
          if (error.code === '23505') {
            throw new TRPCError({
              code: 'CONFLICT',
              message: 'Template with this name and language already exists',
            });
          }
          throw error;
        }

        return {
          success: true,
          template: data,
          message: 'Template created. Submit to Twilio for approval.',
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;

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
      const { supabase, companyId } = ctx;

      if (!companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      try {
        const { data, error } = await supabase
          .from('whatsapp_templates')
          .select('*')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        return data || [];
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
      const { supabase, companyId } = ctx;

      if (!companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      try {
        const { error } = await supabase
          .from('whatsapp_templates')
          .delete()
          .eq('id', input.templateId)
          .eq('company_id', companyId);

        if (error) throw error;

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
