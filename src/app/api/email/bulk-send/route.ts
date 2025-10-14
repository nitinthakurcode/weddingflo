import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sendBulkEmails } from '@/lib/email/resend-client';
import { renderEmailTemplate } from '@/lib/email/template-renderer';
import { queueEmail } from '@/lib/email/email-queue';
import {
  checkUserRateLimit,
  checkGlobalRateLimit,
} from '@/lib/email/rate-limiter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface BulkEmail {
  to: string;
  subject: string;
  template?: string;
  templateProps?: any;
  html?: string;
  text?: string;
}

interface BulkSendRequest {
  emails: BulkEmail[];
  from?: string;
  queue?: boolean;
  priority?: 'high' | 'normal' | 'low';
  batchSize?: number;
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body: BulkSendRequest = await request.json();
    const {
      emails,
      from,
      queue = true, // Default to queuing for bulk sends
      priority = 'normal',
      batchSize = 10,
    } = body;

    // Validate
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No emails provided' },
        { status: 400 }
      );
    }

    // Limit bulk send size
    if (emails.length > 100) {
      return NextResponse.json(
        {
          success: false,
          error: 'Bulk send limited to 100 emails per request',
        },
        { status: 400 }
      );
    }

    // Check rate limits
    const userLimit = checkUserRateLimit(userId);
    if (!userLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter: new Date(userLimit.resetAt).toISOString(),
        },
        { status: 429 }
      );
    }

    const globalLimit = checkGlobalRateLimit();
    if (!globalLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'System rate limit exceeded. Please try again later.',
          retryAfter: new Date(globalLimit.resetAt).toISOString(),
        },
        { status: 429 }
      );
    }

    // Process emails
    const processedEmails: Array<{
      to: string;
      subject: string;
      html: string;
      text?: string;
      from?: string;
    }> = [];

    for (const email of emails) {
      try {
        let emailHtml = email.html;
        let emailText = email.text;

        // Render template if provided
        if (email.template && email.templateProps) {
          const templateModule = await import(`@/emails/${email.template}`);
          const TemplateComponent = templateModule.default || templateModule[Object.keys(templateModule)[0]];

          if (TemplateComponent) {
            const rendered = await renderEmailTemplate(
              TemplateComponent(email.templateProps)
            );
            emailHtml = rendered.html;
            emailText = rendered.text;
          }
        }

        if (emailHtml) {
          processedEmails.push({
            to: email.to,
            subject: email.subject,
            html: emailHtml,
            text: emailText,
            from,
          });
        }
      } catch (error) {
        console.error(`Failed to process email for ${email.to}:`, error);
      }
    }

    // Queue emails
    if (queue) {
      const queueIds: string[] = [];

      for (const email of processedEmails) {
        const queueId = queueEmail(email, priority);
        queueIds.push(queueId);
      }

      return NextResponse.json({
        success: true,
        queued: true,
        total: processedEmails.length,
        queueIds,
        message: `${processedEmails.length} emails queued for delivery`,
      });
    }

    // Send immediately in batches
    const batches: typeof processedEmails[] = [];
    for (let i = 0; i < processedEmails.length; i += batchSize) {
      batches.push(processedEmails.slice(i, i + batchSize));
    }

    const results = [];
    for (const batch of batches) {
      const batchResult = await sendBulkEmails(batch);
      results.push(batchResult);
    }

    const totalSuccessful = results.reduce(
      (sum, r) => sum + r.successful,
      0
    );
    const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);

    return NextResponse.json({
      success: true,
      total: processedEmails.length,
      successful: totalSuccessful,
      failed: totalFailed,
      batches: results.length,
      message: `Sent ${totalSuccessful} emails successfully, ${totalFailed} failed`,
    });
  } catch (error) {
    console.error('Bulk email send error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
