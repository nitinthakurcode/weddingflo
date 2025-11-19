import { createServerSupabaseAdminClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/database.types';

type EmailLog = Database['public']['Tables']['email_logs']['Insert'];
type EmailLogUpdate = Database['public']['Tables']['email_logs']['Update'];
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
    const supabase = createServerSupabaseAdminClient();

    const emailLog: EmailLog = {
      company_id: params.companyId,
      client_id: params.clientId || null,
      email_type: params.emailType,
      recipient_email: params.recipientEmail,
      recipient_name: params.recipientName || null,
      subject: params.subject,
      locale: params.locale || 'en',
      status: 'pending',
      metadata: params.metadata as any || null,
    };

    const { data, error } = await supabase
      .from('email_logs')
      .insert(emailLog)
      .select('id')
      .single();

    if (error) {
      console.error('Error logging email:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception logging email:', error);
    return null;
  }
}

/**
 * Update email log status after sending
 */
export async function updateEmailStatus(params: UpdateEmailStatusParams): Promise<boolean> {
  try {
    const supabase = createServerSupabaseAdminClient();

    const update: EmailLogUpdate = {
      status: params.status,
      resend_id: params.resendId,
      error_message: params.errorMessage,
      sent_at: params.sentAt?.toISOString(),
      delivered_at: params.deliveredAt?.toISOString(),
    };

    const { error } = await supabase
      .from('email_logs')
      .update(update)
      .eq('id', params.emailLogId);

    if (error) {
      console.error('Error updating email status:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Exception updating email status:', error);
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
    const supabase = createServerSupabaseAdminClient();
    const { limit = 50, offset = 0, status, emailType, clientId } = options;

    let query = supabase
      .from('email_logs')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    if (emailType) {
      query = query.eq('email_type', emailType);
    }

    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching email logs:', error);
      return { logs: [], count: 0 };
    }

    return { logs: data || [], count: count || 0 };
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
    const supabase = createServerSupabaseAdminClient();

    const { data, error } = await supabase
      .rpc('get_email_stats', {
        p_company_id: companyId,
        p_days: days,
      });

    if (error) {
      console.error('Error fetching email stats:', error);
      return null;
    }

    return data;
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
    const supabase = createServerSupabaseAdminClient();

    const { data, error } = await supabase
      .rpc('should_send_email', {
        p_user_id: userId,
        p_email_type: emailType,
      });

    if (error) {
      console.error('Error checking email preferences:', error);
      return true; // Default to allowing email if preferences check fails
    }

    return data || true;
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
    const supabase = createServerSupabaseAdminClient();

    const { data, error } = await supabase
      .from('email_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      // If no preferences found, return defaults
      if (error.code === 'PGRST116') {
        return {
          receive_wedding_reminders: true,
          receive_payment_reminders: true,
          receive_rsvp_notifications: true,
          receive_vendor_messages: true,
          receive_marketing: false,
          email_frequency: 'immediate',
        };
      }
      console.error('Error fetching email preferences:', error);
      return null;
    }

    return data;
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
  companyId: string,
  preferences: {
    receive_wedding_reminders?: boolean;
    receive_payment_reminders?: boolean;
    receive_rsvp_notifications?: boolean;
    receive_vendor_messages?: boolean;
    receive_marketing?: boolean;
    email_frequency?: 'immediate' | 'daily' | 'weekly';
  }
) {
  try {
    const supabase = createServerSupabaseAdminClient();

    const { data, error } = await supabase
      .from('email_preferences')
      .upsert({
        user_id: userId,
        company_id: companyId,
        ...preferences,
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating email preferences:', error);
      return null;
    }

    return data;
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
