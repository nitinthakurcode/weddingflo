/**
 * Process Jobs Cron Endpoint
 *
 * February 2026 - Cron endpoint for processing background jobs
 * Called by Dokploy cron every minute: `curl -X POST http://web:3000/api/cron/process-jobs`
 *
 * This endpoint:
 * 1. Fetches pending jobs using SKIP LOCKED
 * 2. Processes each job based on type
 * 3. Marks jobs as completed or failed
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { fetchJobsForProcessing, completeJob, failJob } from '@/lib/jobs/pg-queue';
import type { Job, JobType, EmailJobPayload, SmsJobPayload, WorkflowStepJobPayload } from '@/lib/jobs/pg-queue';

// Cron secret for security (optional, set in env)
const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Process individual job based on type
 */
async function processJob(job: Job): Promise<void> {
  console.log(`[Job Processor] Processing job ${job.id} of type ${job.type}`);

  switch (job.type as JobType) {
    case 'send_email':
      await processEmailJob(job);
      break;

    case 'send_sms':
      await processSmsJob(job);
      break;

    case 'send_whatsapp':
      await processWhatsAppJob(job);
      break;

    case 'workflow_step':
      await processWorkflowStepJob(job);
      break;

    case 'send_reminder':
      await processReminderJob(job);
      break;

    case 'cleanup_sessions':
      await processCleanupJob(job);
      break;

    default:
      console.warn(`[Job Processor] Unknown job type: ${job.type}`);
      throw new Error(`Unknown job type: ${job.type}`);
  }
}

/**
 * Process email job
 */
async function processEmailJob(job: Job): Promise<void> {
  const payload = job.payload as EmailJobPayload;

  // TODO: Integrate with Resend
  console.log(`[Job Processor] Would send email to ${payload.to} with subject: ${payload.subject}`);

  // Simulate sending
  // const { Resend } = await import('resend');
  // const resend = new Resend(process.env.RESEND_API_KEY);
  // await resend.emails.send({
  //   from: 'WeddingFlo <noreply@weddingflo.app>',
  //   to: payload.to,
  //   subject: payload.subject,
  //   html: payload.body,
  // });
}

/**
 * Process SMS job
 */
async function processSmsJob(job: Job): Promise<void> {
  const payload = job.payload as SmsJobPayload;

  // TODO: Integrate with Twilio
  console.log(`[Job Processor] Would send SMS to ${payload.to}: ${payload.message}`);
}

/**
 * Process WhatsApp job
 */
async function processWhatsAppJob(job: Job): Promise<void> {
  const payload = job.payload as SmsJobPayload;

  // TODO: Integrate with Twilio WhatsApp
  console.log(`[Job Processor] Would send WhatsApp to ${payload.to}: ${payload.message}`);
}

/**
 * Process workflow step job
 */
async function processWorkflowStepJob(job: Job): Promise<void> {
  const payload = job.payload as WorkflowStepJobPayload;

  // TODO: Implement workflow step processing
  console.log(`[Job Processor] Would process workflow step ${payload.stepId} for execution ${payload.executionId}`);
}

/**
 * Process reminder job - Send payment due reminders via email
 */
async function processReminderJob(job: Job): Promise<void> {
  const payload = job.payload as {
    type: 'payment_due';
    recipientEmail: string;
    recipientName: string;
    amount: string;
    dueDate: string;
    daysUntil: number;
    itemDescription: string;
    clientId: string;
    category: string;
  };

  if (payload.type !== 'payment_due') {
    console.log(`[Job Processor] Unknown reminder type: ${payload.type}`);
    return;
  }

  // Send email using Resend
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.weddingflo.com';
    const budgetUrl = `${appUrl}/dashboard/clients/${payload.clientId}/budget`;

    await resend.emails.send({
      from: 'WeddingFlo <reminders@weddingflo.app>',
      to: payload.recipientEmail,
      subject: `Payment Due in ${payload.daysUntil} day${payload.daysUntil === 1 ? '' : 's'}: ${payload.itemDescription}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a1a2e;">Payment Reminder</h2>
          <p>Hi ${payload.recipientName},</p>
          <p>This is a reminder that a payment is due soon:</p>
          <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 8px 0;"><strong>Item:</strong> ${payload.itemDescription}</p>
            <p style="margin: 8px 0;"><strong>Category:</strong> ${payload.category}</p>
            <p style="margin: 8px 0;"><strong>Amount:</strong> ${payload.amount}</p>
            <p style="margin: 8px 0;"><strong>Due Date:</strong> ${payload.dueDate}</p>
            <p style="margin: 8px 0;"><strong>Days Until Due:</strong> ${payload.daysUntil}</p>
          </div>
          <p>
            <a href="${budgetUrl}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none;">
              View Budget
            </a>
          </p>
          <p style="color: #666; font-size: 12px; margin-top: 24px;">
            This is an automated reminder from WeddingFlo. Please don't reply to this email.
          </p>
        </div>
      `,
    });

    console.log(`[Job Processor] Sent payment reminder to ${payload.recipientEmail}: ${payload.itemDescription} due in ${payload.daysUntil} days`);
  } catch (emailError) {
    console.error(`[Job Processor] Failed to send reminder email:`, emailError);
    throw emailError; // Re-throw to mark job as failed
  }
}

/**
 * Process cleanup job
 */
async function processCleanupJob(job: Job): Promise<void> {
  // TODO: Implement session cleanup
  console.log(`[Job Processor] Would clean up old sessions`);
}

/**
 * POST handler for cron
 */
export async function POST(request: Request) {
  try {
    // Verify cron secret if set
    if (CRON_SECRET) {
      const authHeader = request.headers.get('Authorization');
      const providedSecret = authHeader?.replace('Bearer ', '');

      if (providedSecret !== CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const startTime = Date.now();
    let processedCount = 0;
    let failedCount = 0;

    // Fetch jobs using SKIP LOCKED
    const jobs = await fetchJobsForProcessing(db as any, 10);

    console.log(`[Job Processor] Fetched ${jobs.length} jobs for processing`);

    // Process each job
    for (const job of jobs) {
      try {
        await processJob(job);
        await completeJob(db as any, job.id);
        processedCount++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[Job Processor] Job ${job.id} failed:`, errorMessage);
        await failJob(db as any, job.id, errorMessage, true);
        failedCount++;
      }
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      processed: processedCount,
      failed: failedCount,
      duration: `${duration}ms`,
    });
  } catch (error) {
    console.error('[Job Processor] Error processing jobs:', error);
    return NextResponse.json(
      { error: 'Failed to process jobs' },
      { status: 500 }
    );
  }
}

/**
 * GET handler for health check
 */
export async function GET() {
  return NextResponse.json({ status: 'ok', endpoint: 'process-jobs' });
}
