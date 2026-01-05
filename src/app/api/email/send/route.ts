import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/server';
import { sendEmail } from '@/lib/email/resend-client';
import { renderEmailTemplate } from '@/lib/email/template-renderer';
import { queueEmail } from '@/lib/email/email-queue';
import {
  checkUserRateLimit,
  checkEmailRateLimit,
  checkGlobalRateLimit,
} from '@/lib/email/rate-limiter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface SendEmailRequest {
  to: string | string[];
  subject: string;
  template?: string;
  templateProps?: any;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  queue?: boolean;
  priority?: 'high' | 'normal' | 'low';
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await getServerSession();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body: SendEmailRequest = await request.json();
    const {
      to,
      subject,
      template,
      templateProps,
      html,
      text,
      from,
      replyTo,
      queue = false,
      priority = 'normal',
    } = body;

    // Validate required fields
    if (!to || !subject) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: to, subject' },
        { status: 400 }
      );
    }

    if (!html && !template) {
      return NextResponse.json(
        { success: false, error: 'Either html or template must be provided' },
        { status: 400 }
      );
    }

    // Check rate limits (Redis-backed)
    const userLimit = await checkUserRateLimit(userId);
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

    // Check recipient rate limit
    const recipients = Array.isArray(to) ? to : [to];
    for (const email of recipients) {
      const emailLimit = await checkEmailRateLimit(email);
      if (!emailLimit.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: `Rate limit exceeded for recipient: ${email}`,
            retryAfter: new Date(emailLimit.resetAt).toISOString(),
          },
          { status: 429 }
        );
      }
    }

    // Check global rate limit
    const globalLimit = await checkGlobalRateLimit();
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

    // Render template if provided
    let emailHtml = html;
    let emailText = text;

    if (template && templateProps) {
      try {
        // Dynamically import template
        const templateModule = await import(`@/emails/${template}`);
        const TemplateComponent = templateModule.default || templateModule[Object.keys(templateModule)[0]];

        if (!TemplateComponent) {
          return NextResponse.json(
            { success: false, error: `Template ${template} not found` },
            { status: 400 }
          );
        }

        // Render template
        const rendered = await renderEmailTemplate(
          TemplateComponent(templateProps)
        );
        emailHtml = rendered.html;
        emailText = rendered.text;
      } catch (error) {
        console.error('Template rendering error:', error);
        return NextResponse.json(
          {
            success: false,
            error: 'Failed to render email template',
            details: error instanceof Error ? error.message : 'Unknown error',
          },
          { status: 500 }
        );
      }
    }

    // Queue email if requested
    if (queue) {
      const queueId = queueEmail(
        {
          to,
          subject,
          html: emailHtml!,
          text: emailText,
          from,
        },
        priority
      );

      return NextResponse.json({
        success: true,
        queued: true,
        queueId,
        message: 'Email queued for delivery',
      });
    }

    // Send email immediately
    const result = await sendEmail({
      to,
      subject,
      html: emailHtml!,
      text: emailText,
      from,
      replyTo,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to send email',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: 'Email sent successfully',
    });
  } catch (error) {
    console.error('Email send error:', error);
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
