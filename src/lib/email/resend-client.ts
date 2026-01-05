import { Resend } from 'resend';

// Lazy initialization - client created on first use (not at build time)
let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not defined in environment variables');
    }
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

// Default sender email
// For production: update with your verified domain (verify at https://resend.com/domains)
// For development: using Resend's test email
export const DEFAULT_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
export const DEFAULT_FROM_NAME = 'WeddingFlo';
export const DEFAULT_FROM = `${DEFAULT_FROM_NAME} <${DEFAULT_FROM_EMAIL}>`;

// Email configuration
export const EMAIL_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  timeout: 30000, // 30 seconds
} as const;

/**
 * Send an email using Resend
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  from = DEFAULT_FROM,
  replyTo,
  cc,
  bcc,
  attachments,
}: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
  }>;
}) {
  try {
    const resend = getResendClient();
    const result = await resend.emails.send({
      from,
      to,
      subject,
      html,
      text,
      replyTo,
      cc,
      bcc,
      attachments,
    });

    return {
      success: true,
      data: result.data,
      error: null,
    };
  } catch (error) {
    console.error('Failed to send email:', error);
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send bulk emails (batch processing)
 */
export async function sendBulkEmails(
  emails: Array<{
    to: string;
    subject: string;
    html: string;
    text?: string;
    from?: string;
  }>
) {
  const results = await Promise.allSettled(
    emails.map((email) => sendEmail(email))
  );

  const successful = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;

  return {
    total: emails.length,
    successful,
    failed,
    results,
  };
}

/**
 * Validate email address
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Sanitize email addresses
 */
export function sanitizeEmails(emails: string | string[]): string[] {
  const emailArray = Array.isArray(emails) ? emails : [emails];
  return emailArray.filter(isValidEmail);
}
