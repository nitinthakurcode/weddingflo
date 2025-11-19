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
  supabase,
  companyId,
  clientId,
  emailType,
  recipientEmail,
  recipientName,
  subject,
  locale,
  resendId,
  status,
  errorMessage,
  metadata,
}: {
  supabase: any;
  companyId: string;
  clientId?: string;
  emailType: DatabaseEmailType;
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  locale: Locale;
  resendId?: string;
  status: 'pending' | 'sent' | 'failed';
  errorMessage?: string;
  metadata?: Record<string, any>;
}) {
  const { data, error } = await supabase
    .from('email_logs')
    .insert({
      company_id: companyId,
      client_id: clientId || null,
      email_type: emailType,
      recipient_email: recipientEmail,
      recipient_name: recipientName,
      subject,
      locale,
      status,
      resend_id: resendId,
      error_message: errorMessage,
      metadata: metadata || {},
      sent_at: status === 'sent' ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to log email:', error);
  }

  return data;
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
      const { supabase, companyId } = ctx;
      const { clientId, clientName, clientEmail, plannerName, inviteLink, locale } = input;

      // Guard: Ensure companyId exists in session claims
      if (!companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
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
          from: 'WeddingFlow Pro <noreply@weddingflow.com>',
          to: clientEmail,
          subject,
          html,
        });

        if (result.error) {
          // Log failed email
          await logEmail({
            supabase,
            companyId,
            clientId,
            emailType: 'client_invite',
            recipientEmail: clientEmail,
            recipientName: clientName,
            subject,
            locale,
            status: 'failed',
            errorMessage: result.error.message,
          });

          throw new Error(`Failed to send email: ${result.error.message}`);
        }

        // Log successful email
        await logEmail({
          supabase,
          companyId,
          clientId,
          emailType: 'client_invite',
          recipientEmail: clientEmail,
          recipientName: clientName,
          subject,
          locale,
          resendId: result.data?.id,
          status: 'sent',
          metadata: { plannerName, inviteLink },
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
      const { supabase, companyId } = ctx;
      const { clientId, clientName, clientEmail, weddingDate, daysUntilWedding, dashboardLink, locale } = input;

      if (!companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
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
          from: 'WeddingFlow Pro <noreply@weddingflow.com>',
          to: clientEmail,
          subject,
          html,
        });

        if (result.error) {
          await logEmail({
            supabase,
            companyId,
            clientId,
            emailType: 'wedding_reminder',
            recipientEmail: clientEmail,
            recipientName: clientName,
            subject,
            locale,
            status: 'failed',
            errorMessage: result.error.message,
          });

          throw new Error(`Failed to send email: ${result.error.message}`);
        }

        // Log successful email
        await logEmail({
          supabase,
          companyId,
          clientId,
          emailType: 'wedding_reminder',
          recipientEmail: clientEmail,
          recipientName: clientName,
          subject,
          locale,
          resendId: result.data?.id,
          status: 'sent',
          metadata: { weddingDate, daysUntilWedding, dashboardLink },
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
      const { supabase, companyId } = ctx;
      const { clientId, clientName, clientEmail, amount, dueDate, description, paymentLink, locale } = input;

      if (!companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
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
          from: 'WeddingFlow Pro <noreply@weddingflow.com>',
          to: clientEmail,
          subject,
          html,
        });

        if (result.error) {
          await logEmail({
            supabase,
            companyId,
            clientId,
            emailType: 'payment_reminder',
            recipientEmail: clientEmail,
            recipientName: clientName,
            subject,
            locale,
            status: 'failed',
            errorMessage: result.error.message,
          });

          throw new Error(`Failed to send email: ${result.error.message}`);
        }

        // Log successful email
        await logEmail({
          supabase,
          companyId,
          clientId,
          emailType: 'payment_reminder',
          recipientEmail: clientEmail,
          recipientName: clientName,
          subject,
          locale,
          resendId: result.data?.id,
          status: 'sent',
          metadata: { amount, dueDate, description, paymentLink },
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
      const { supabase, companyId } = ctx;
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
          from: 'WeddingFlow Pro <noreply@weddingflow.com>',
          to: guestEmail,
          subject,
          html,
        });

        if (result.error) {
          await logEmail({
            supabase,
            companyId,
            emailType: 'rsvp_confirmation',
            recipientEmail: guestEmail,
            recipientName: guestName,
            subject,
            locale,
            status: 'failed',
            errorMessage: result.error.message,
          });

          throw new Error(`Failed to send email: ${result.error.message}`);
        }

        // Log successful email
        await logEmail({
          supabase,
          companyId,
          emailType: 'rsvp_confirmation',
          recipientEmail: guestEmail,
          recipientName: guestName,
          subject,
          locale,
          resendId: result.data?.id,
          status: 'sent',
          metadata: {
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
      const { supabase, companyId } = ctx;
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
          from: 'WeddingFlow Pro <noreply@weddingflow.com>',
          to: clientEmail,
          subject,
          html,
        });

        if (result.error) {
          await logEmail({
            supabase,
            companyId,
            clientId,
            emailType: 'payment_receipt',
            recipientEmail: clientEmail,
            recipientName: clientName,
            subject,
            locale,
            status: 'failed',
            errorMessage: result.error.message,
          });

          throw new Error(`Failed to send email: ${result.error.message}`);
        }

        // Log successful email
        await logEmail({
          supabase,
          companyId,
          clientId,
          emailType: 'payment_receipt',
          recipientEmail: clientEmail,
          recipientName: clientName,
          subject,
          locale,
          resendId: result.data?.id,
          status: 'sent',
          metadata: { amount, paymentDate, paymentMethod, transactionId, description },
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
      const { supabase, companyId } = ctx;
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
          from: 'WeddingFlow Pro <noreply@weddingflow.com>',
          to: recipientEmail,
          subject,
          html,
        });

        if (result.error) {
          await logEmail({
            supabase,
            companyId,
            emailType: 'vendor_communication',
            recipientEmail,
            recipientName,
            subject,
            locale,
            status: 'failed',
            errorMessage: result.error.message,
          });

          throw new Error(`Failed to send email: ${result.error.message}`);
        }

        // Log successful email
        await logEmail({
          supabase,
          companyId,
          emailType: 'vendor_communication',
          recipientEmail,
          recipientName,
          subject,
          locale,
          resendId: result.data?.id,
          status: 'sent',
          metadata: {
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
        emailType: z
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
      const { supabase, companyId } = ctx;
      const { limit, offset, emailType, status, clientId } = input;

      if (!companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      let query = supabase
        .from('email_logs')
        .select('*', { count: 'exact' })
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (emailType) {
        query = query.eq('email_type', emailType);
      }

      if (status) {
        query = query.eq('status', status);
      }

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Failed to fetch email logs: ${error.message}`);
      }

      return {
        logs: data || [],
        total: count || 0,
        hasMore: (count || 0) > offset + limit,
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
      const { supabase, companyId } = ctx;
      const { days } = input;

      if (!companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      const { data, error } = await supabase.rpc('get_email_stats', {
        p_company_id: companyId,
        p_days: days,
      });

      if (error) {
        throw new Error(`Failed to fetch email stats: ${error.message}`);
      }

      return (
        data?.[0] || {
          total_emails: 0,
          sent_emails: 0,
          delivered_emails: 0,
          failed_emails: 0,
          bounced_emails: 0,
          success_rate: 0,
        }
      );
    }),

  // Get user email preferences
  getEmailPreferences: protectedProcedure.query(async ({ ctx }) => {
    const { supabase, userId, companyId } = ctx;

    if (!companyId) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Company ID not found in session claims',
      });
    }

    const { data, error } = await supabase
      .from('email_preferences')
      .select('*')
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch email preferences: ${error.message}`);
    }

    // Return default preferences if none exist
    return (
      data || {
        receive_wedding_reminders: true,
        receive_payment_reminders: true,
        receive_rsvp_notifications: true,
        receive_vendor_messages: true,
        receive_marketing: false,
        email_frequency: 'immediate',
      }
    );
  }),

  // Update user email preferences
  updateEmailPreferences: protectedProcedure
    .input(
      z.object({
        receive_wedding_reminders: z.boolean().optional(),
        receive_payment_reminders: z.boolean().optional(),
        receive_rsvp_notifications: z.boolean().optional(),
        receive_vendor_messages: z.boolean().optional(),
        receive_marketing: z.boolean().optional(),
        email_frequency: z.enum(['immediate', 'daily', 'weekly']).optional(),
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
        .from('email_preferences')
        .select('id')
        .eq('user_id', userId)
        .eq('company_id', companyId)
        .single();

      let result;

      if (existing) {
        // Update existing preferences
        result = await supabase
          .from('email_preferences')
          .update(input)
          .eq('user_id', userId)
          .eq('company_id', companyId)
          .select()
          .single();
      } else {
        // Insert new preferences
        result = await supabase
          .from('email_preferences')
          .insert({
            user_id: userId,
            company_id: companyId,
            ...input,
          })
          .select()
          .single();
      }

      if (result.error) {
        throw new Error(`Failed to update email preferences: ${result.error.message}`);
      }

      return {
        success: true,
        preferences: result.data,
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
      const { supabase, companyId } = ctx;
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
          from: 'WeddingFlow Pro <noreply@weddingflow.com>',
          to,
          subject: `[TEST] ${subject}`,
          html,
        });

        if (result.error) {
          throw new Error(`Failed to send test email: ${result.error.message}`);
        }

        // Log test email
        await logEmail({
          supabase,
          companyId,
          emailType: templateType,
          recipientEmail: to,
          recipientName: 'Test User',
          subject: `[TEST] ${subject}`,
          locale,
          resendId: result.data?.id,
          status: 'sent',
          metadata: { test: true },
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
