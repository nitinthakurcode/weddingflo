import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '@/server/trpc/trpc';
import {
  sendSms,
  getSmsMessage,
  formatPhoneNumber,
  isValidPhoneNumber,
  type SmsTemplateType,
  type Locale,
} from '@/lib/sms/twilio';

// Helper function to log SMS to database
async function logSms({
  supabase,
  companyId,
  clientId,
  smsType,
  recipientPhone,
  recipientName,
  messageBody,
  locale,
  twilioSid,
  segments,
  status,
  errorCode,
  errorMessage,
  metadata,
}: {
  supabase: any;
  companyId: string;
  clientId?: string;
  smsType: string;
  recipientPhone: string;
  recipientName?: string;
  messageBody: string;
  locale: Locale;
  twilioSid?: string;
  segments?: number;
  status: 'pending' | 'queued' | 'sending' | 'sent' | 'failed';
  errorCode?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
}) {
  const { data, error } = await supabase
    .from('sms_logs')
    .insert({
      company_id: companyId,
      client_id: clientId || null,
      sms_type: smsType,
      recipient_phone: recipientPhone,
      recipient_name: recipientName,
      message_body: messageBody,
      locale,
      status,
      twilio_sid: twilioSid,
      segments: segments || 1,
      error_code: errorCode,
      error_message: errorMessage,
      metadata: metadata || {},
      sent_at: status === 'sent' || status === 'queued' ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to log SMS:', error);
  }

  return data;
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
      const { supabase, companyId } = ctx;
      const { clientId, recipientName, recipientPhone, eventName, daysUntilWedding, locale } = input;

      if (!companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      try {
        // Validate phone number
        if (!isValidPhoneNumber(recipientPhone)) {
          throw new Error('Invalid phone number format');
        }

        // TODO: Implement SMS preference checking when user_id columns are added to clients table
        // Currently clients table doesn't have partner1_user_id/partner2_user_id columns

        // Check if user wants to receive wedding reminders
        // const { data: client } = await supabase
        //   .from('clients')
        //   .select('partner1_user_id, partner2_user_id')
        //   .eq('id', clientId)
        //   .single();

        // if (client) {
        //   const recipientUserId = client.partner1_user_id || client.partner2_user_id;

        //   if (recipientUserId) {
        //     const { data: shouldSend } = await supabase
        //       .rpc('should_send_sms', {
        //         p_user_id: recipientUserId,
        //         p_sms_type: 'wedding_reminder',
        //       });

        //     if (shouldSend === false) {
        //       return {
        //         success: false,
        //         message: 'User has disabled wedding reminder SMS',
        //       };
        //     }
        //   }
        // }

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
            supabase,
            companyId,
            clientId,
            smsType: 'wedding_reminder',
            recipientPhone: formatPhoneNumber(recipientPhone),
            recipientName,
            messageBody: message,
            locale,
            status: 'failed',
            errorMessage: result.error,
          });

          throw new Error(`Failed to send SMS: ${result.error}`);
        }

        // Log successful SMS
        await logSms({
          supabase,
          companyId,
          clientId,
          smsType: 'wedding_reminder',
          recipientPhone: formatPhoneNumber(recipientPhone),
          recipientName,
          messageBody: message,
          locale,
          twilioSid: result.sid,
          segments: result.segments,
          status: result.status === 'queued' ? 'queued' : 'sent',
          metadata: { eventName, daysUntilWedding },
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
      const { supabase, companyId } = ctx;
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
            supabase,
            companyId,
            clientId,
            smsType: 'rsvp_confirmation',
            recipientPhone: formatPhoneNumber(guestPhone),
            recipientName: guestName,
            messageBody: message,
            locale,
            status: 'failed',
            errorMessage: result.error,
          });

          throw new Error(`Failed to send SMS: ${result.error}`);
        }

        await logSms({
          supabase,
          companyId,
          clientId,
          smsType: 'rsvp_confirmation',
          recipientPhone: formatPhoneNumber(guestPhone),
          recipientName: guestName,
          messageBody: message,
          locale,
          twilioSid: result.sid,
          segments: result.segments,
          status: result.status === 'queued' ? 'queued' : 'sent',
          metadata: { eventName },
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
      const { supabase, companyId } = ctx;
      const { clientId, recipientName, recipientPhone, amount, dueDate, locale } = input;

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

        // TODO: Implement SMS preference checking when user_id columns are added to clients table
        // Currently clients table doesn't have partner1_user_id/partner2_user_id columns

        // Check user preferences
        // const { data: client } = await supabase
        //   .from('clients')
        //   .select('partner1_user_id, partner2_user_id')
        //   .eq('id', clientId)
        //   .single();

        // if (client) {
        //   const recipientUserId = client.partner1_user_id || client.partner2_user_id;

        //   if (recipientUserId) {
        //     const { data: shouldSend } = await supabase
        //       .rpc('should_send_sms', {
        //         p_user_id: recipientUserId,
        //         p_sms_type: 'payment_reminder',
        //       });

        //     if (shouldSend === false) {
        //       return {
        //         success: false,
        //         message: 'User has disabled payment reminder SMS',
        //       };
        //     }
        //   }
        // }

        const message = getSmsMessage('paymentReminder', locale, amount, dueDate);

        const result = await sendSms({
          to: recipientPhone,
          message,
        });

        if (!result.success) {
          await logSms({
            supabase,
            companyId,
            clientId,
            smsType: 'payment_reminder',
            recipientPhone: formatPhoneNumber(recipientPhone),
            recipientName,
            messageBody: message,
            locale,
            status: 'failed',
            errorMessage: result.error,
          });

          throw new Error(`Failed to send SMS: ${result.error}`);
        }

        await logSms({
          supabase,
          companyId,
          clientId,
          smsType: 'payment_reminder',
          recipientPhone: formatPhoneNumber(recipientPhone),
          recipientName,
          messageBody: message,
          locale,
          twilioSid: result.sid,
          segments: result.segments,
          status: result.status === 'queued' ? 'queued' : 'sent',
          metadata: { amount, dueDate },
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
      const { supabase, companyId } = ctx;
      const { clientId, recipientName, recipientPhone, amount, locale } = input;

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

        const message = getSmsMessage('paymentReceived', locale, amount);

        const result = await sendSms({
          to: recipientPhone,
          message,
        });

        if (!result.success) {
          await logSms({
            supabase,
            companyId,
            clientId,
            smsType: 'payment_received',
            recipientPhone: formatPhoneNumber(recipientPhone),
            recipientName,
            messageBody: message,
            locale,
            status: 'failed',
            errorMessage: result.error,
          });

          throw new Error(`Failed to send SMS: ${result.error}`);
        }

        await logSms({
          supabase,
          companyId,
          clientId,
          smsType: 'payment_received',
          recipientPhone: formatPhoneNumber(recipientPhone),
          recipientName,
          messageBody: message,
          locale,
          twilioSid: result.sid,
          segments: result.segments,
          status: result.status === 'queued' ? 'queued' : 'sent',
          metadata: { amount },
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
      const { supabase, companyId } = ctx;
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
            supabase,
            companyId,
            clientId,
            smsType: 'vendor_notification',
            recipientPhone: formatPhoneNumber(recipientPhone),
            recipientName,
            messageBody: message,
            locale,
            status: 'failed',
            errorMessage: result.error,
          });

          throw new Error(`Failed to send SMS: ${result.error}`);
        }

        await logSms({
          supabase,
          companyId,
          clientId,
          smsType: 'vendor_notification',
          recipientPhone: formatPhoneNumber(recipientPhone),
          recipientName,
          messageBody: message,
          locale,
          twilioSid: result.sid,
          segments: result.segments,
          status: result.status === 'queued' ? 'queued' : 'sent',
          metadata: { customMessage },
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
      const { supabase, companyId } = ctx;
      const { clientId, recipientName, recipientPhone, eventName, updateMessage, locale } = input;

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

        const message = getSmsMessage('eventUpdate', locale, eventName, updateMessage);

        const result = await sendSms({
          to: recipientPhone,
          message,
        });

        if (!result.success) {
          await logSms({
            supabase,
            companyId,
            clientId,
            smsType: 'event_update',
            recipientPhone: formatPhoneNumber(recipientPhone),
            recipientName,
            messageBody: message,
            locale,
            status: 'failed',
            errorMessage: result.error,
          });

          throw new Error(`Failed to send SMS: ${result.error}`);
        }

        await logSms({
          supabase,
          companyId,
          clientId,
          smsType: 'event_update',
          recipientPhone: formatPhoneNumber(recipientPhone),
          recipientName,
          messageBody: message,
          locale,
          twilioSid: result.sid,
          segments: result.segments,
          status: result.status === 'queued' ? 'queued' : 'sent',
          metadata: { eventName, updateMessage },
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

  // Get SMS logs for company
  getSmsLogs: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(50),
        offset: z.number().int().min(0).default(0),
        smsType: z.enum(['wedding_reminder', 'rsvp_confirmation', 'payment_reminder', 'payment_received', 'vendor_notification', 'event_update', 'general']).optional(),
        status: z.enum(['pending', 'queued', 'sending', 'sent', 'delivered', 'undelivered', 'failed']).optional(),
        clientId: z.string().uuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { supabase, companyId } = ctx;
      const { limit, offset, smsType, status, clientId } = input;

      if (!companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      let query = supabase
        .from('sms_logs')
        .select('*', { count: 'exact' })
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (smsType) {
        query = query.eq('sms_type', smsType);
      }

      if (status) {
        query = query.eq('status', status);
      }

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Failed to fetch SMS logs: ${error.message}`);
      }

      return {
        logs: data || [],
        total: count || 0,
        hasMore: (count || 0) > offset + limit,
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
      const { supabase, companyId } = ctx;
      const { days } = input;

      if (!companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      const { data, error } = await supabase
        .rpc('get_sms_stats', {
          p_company_id: companyId,
          p_days: days,
        });

      if (error) {
        throw new Error(`Failed to fetch SMS stats: ${error.message}`);
      }

      return data?.[0] || {
        total_sms: 0,
        sent_sms: 0,
        delivered_sms: 0,
        failed_sms: 0,
        total_segments: 0,
        success_rate: 0,
      };
    }),

  // Get user SMS preferences
  getSmsPreferences: protectedProcedure
    .query(async ({ ctx }) => {
      const { supabase, userId, companyId } = ctx;

      if (!companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      const { data, error } = await supabase
        .from('sms_preferences')
        .select('*')
        .eq('user_id', userId)
        .eq('company_id', companyId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Failed to fetch SMS preferences: ${error.message}`);
      }

      // Return default preferences if none exist
      return data || {
        receive_wedding_reminders: true,
        receive_payment_reminders: true,
        receive_rsvp_notifications: true,
        receive_vendor_messages: true,
        receive_event_updates: true,
        sms_frequency: 'immediate',
      };
    }),

  // Update user SMS preferences
  updateSmsPreferences: protectedProcedure
    .input(
      z.object({
        receive_wedding_reminders: z.boolean().optional(),
        receive_payment_reminders: z.boolean().optional(),
        receive_rsvp_notifications: z.boolean().optional(),
        receive_vendor_messages: z.boolean().optional(),
        receive_event_updates: z.boolean().optional(),
        sms_frequency: z.enum(['immediate', 'daily', 'off']).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { supabase, userId, companyId } = ctx;

      if (!companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      // Try to update existing preferences
      const { data: existing } = await supabase
        .from('sms_preferences')
        .select('id')
        .eq('user_id', userId)
        .eq('company_id', companyId)
        .single();

      let result;

      if (existing) {
        // Update existing preferences
        result = await supabase
          .from('sms_preferences')
          .update(input)
          .eq('user_id', userId)
          .eq('company_id', companyId)
          .select()
          .single();
      } else {
        // Insert new preferences
        result = await supabase
          .from('sms_preferences')
          .insert({
            user_id: userId,
            company_id: companyId,
            ...input,
          })
          .select()
          .single();
      }

      if (result.error) {
        throw new Error(`Failed to update SMS preferences: ${result.error.message}`);
      }

      return {
        success: true,
        preferences: result.data,
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
      const { supabase, companyId } = ctx;
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
          supabase,
          companyId,
          smsType: templateType,
          recipientPhone: formatPhoneNumber(to),
          recipientName: 'Test User',
          messageBody: message,
          locale,
          twilioSid: result.sid,
          segments: result.segments,
          status: result.status === 'queued' ? 'queued' : 'sent',
          metadata: { test: true },
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
