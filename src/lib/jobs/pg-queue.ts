/**
 * PostgreSQL Job Queue
 *
 * February 2026 - PostgreSQL-based job queue for WeddingFlo
 * No Redis needed - uses SKIP LOCKED for concurrent job processing.
 *
 * Usage:
 * ```ts
 * import { enqueueJob, processJobs, JobType } from '@/lib/jobs/pg-queue';
 *
 * // Enqueue a job
 * await enqueueJob(db, {
 *   type: 'send_email',
 *   payload: { to: 'user@example.com', subject: 'Hello' },
 *   companyId: 'company-123',
 *   scheduledAt: new Date(Date.now() + 60000), // 1 minute from now
 * });
 *
 * // Process jobs (called by cron)
 * await processJobs(db);
 * ```
 */

import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { sql, eq, and, lte } from 'drizzle-orm';
import { jobQueue } from '@/lib/db/schema';

// Job types
export type JobType =
  | 'send_email'
  | 'send_sms'
  | 'send_whatsapp'
  | 'workflow_step'
  | 'generate_report'
  | 'send_reminder'
  | 'cleanup_sessions'
  | 'process_rsvp'
  | 'sync_calendar';

// Job status
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

// Job payload types
export interface EmailJobPayload {
  to: string;
  subject: string;
  body?: string;
  templateId?: string;
  templateData?: Record<string, unknown>;
}

export interface SmsJobPayload {
  to: string;
  message: string;
  templateId?: string;
}

export interface WorkflowStepJobPayload {
  executionId: string;
  stepId: string;
  stepType: string;
  config: Record<string, unknown>;
}

export type JobPayload =
  | EmailJobPayload
  | SmsJobPayload
  | WorkflowStepJobPayload
  | Record<string, unknown>;

// Job interface
export interface Job {
  id: string;
  companyId: string | null;
  type: JobType;
  payload: JobPayload;
  status: JobStatus;
  scheduledAt: Date;
  attempts: number;
  maxAttempts: number;
  error: string | null;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
}

// Enqueue options
export interface EnqueueJobOptions {
  type: JobType;
  payload: JobPayload;
  companyId?: string | null;
  scheduledAt?: Date;
  maxAttempts?: number;
}

/**
 * Enqueue a job to be processed later
 */
export async function enqueueJob(
  db: PostgresJsDatabase<Record<string, unknown>>,
  options: EnqueueJobOptions
): Promise<{ id: string }> {
  const [job] = await db
    .insert(jobQueue)
    .values({
      companyId: options.companyId || null,
      type: options.type,
      payload: options.payload,
      scheduledAt: options.scheduledAt || new Date(),
      maxAttempts: options.maxAttempts || 3,
      status: 'pending',
    })
    .returning({ id: jobQueue.id });

  return job;
}

/**
 * Enqueue multiple jobs at once
 */
export async function enqueueJobs(
  db: PostgresJsDatabase<Record<string, unknown>>,
  jobs: EnqueueJobOptions[]
): Promise<{ ids: string[] }> {
  if (jobs.length === 0) {
    return { ids: [] };
  }

  const results = await db
    .insert(jobQueue)
    .values(
      jobs.map((job) => ({
        companyId: job.companyId || null,
        type: job.type,
        payload: job.payload,
        scheduledAt: job.scheduledAt || new Date(),
        maxAttempts: job.maxAttempts || 3,
        status: 'pending',
      }))
    )
    .returning({ id: jobQueue.id });

  return { ids: results.map((r) => r.id) };
}

/**
 * Process pending jobs using SKIP LOCKED pattern
 * This ensures concurrent workers don't process the same job
 */
export async function fetchJobsForProcessing(
  db: PostgresJsDatabase<Record<string, unknown>>,
  limit: number = 10
): Promise<Job[]> {
  // Use raw SQL for SKIP LOCKED (not directly supported by Drizzle)
  const result = await db.execute(sql`
    UPDATE job_queue
    SET status = 'processing', started_at = NOW(), attempts = attempts + 1
    WHERE id IN (
      SELECT id FROM job_queue
      WHERE status = 'pending'
        AND scheduled_at <= NOW()
      ORDER BY scheduled_at
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING *
  `);

  return (result as unknown as Job[]);
}

/**
 * Mark a job as completed
 */
export async function completeJob(
  db: PostgresJsDatabase<Record<string, unknown>>,
  jobId: string
): Promise<void> {
  await db
    .update(jobQueue)
    .set({
      status: 'completed',
      completedAt: new Date(),
    })
    .where(eq(jobQueue.id, jobId));
}

/**
 * Mark a job as failed
 */
export async function failJob(
  db: PostgresJsDatabase<Record<string, unknown>>,
  jobId: string,
  error: string,
  retry: boolean = true
): Promise<void> {
  // Get current job to check attempts
  const [job] = await db
    .select({
      attempts: jobQueue.attempts,
      maxAttempts: jobQueue.maxAttempts,
    })
    .from(jobQueue)
    .where(eq(jobQueue.id, jobId))
    .limit(1);

  const shouldRetry = retry && job && (job.attempts || 0) < (job.maxAttempts || 3);

  await db
    .update(jobQueue)
    .set({
      status: shouldRetry ? 'pending' : 'failed',
      error,
      // If retrying, schedule for later (exponential backoff)
      scheduledAt: shouldRetry
        ? new Date(Date.now() + Math.pow(2, job.attempts || 1) * 60000)
        : undefined,
    })
    .where(eq(jobQueue.id, jobId));
}

/**
 * Get job by ID
 */
export async function getJob(
  db: PostgresJsDatabase<Record<string, unknown>>,
  jobId: string
): Promise<Job | null> {
  const [job] = await db
    .select()
    .from(jobQueue)
    .where(eq(jobQueue.id, jobId))
    .limit(1);

  return (job as Job) || null;
}

/**
 * Get job stats for monitoring
 */
export async function getJobStats(
  db: PostgresJsDatabase<Record<string, unknown>>,
  companyId?: string
): Promise<{
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}> {
  const conditions = companyId ? [eq(jobQueue.companyId, companyId)] : [];

  const result = await db.execute(sql`
    SELECT
      COUNT(*) FILTER (WHERE status = 'pending') as pending,
      COUNT(*) FILTER (WHERE status = 'processing') as processing,
      COUNT(*) FILTER (WHERE status = 'completed') as completed,
      COUNT(*) FILTER (WHERE status = 'failed') as failed
    FROM job_queue
    ${companyId ? sql`WHERE company_id = ${companyId}` : sql``}
  `);

  const row = (result as any)[0] || {};
  return {
    pending: Number(row.pending || 0),
    processing: Number(row.processing || 0),
    completed: Number(row.completed || 0),
    failed: Number(row.failed || 0),
  };
}

/**
 * Clean up old completed/failed jobs
 */
export async function cleanupOldJobs(
  db: PostgresJsDatabase<Record<string, unknown>>,
  olderThanDays: number = 7
): Promise<{ deleted: number }> {
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

  const result = await db.execute(sql`
    DELETE FROM job_queue
    WHERE status IN ('completed', 'failed')
      AND created_at < ${cutoff}
  `);

  return { deleted: (result as any).rowCount || 0 };
}

/**
 * Cancel a pending job
 */
export async function cancelJob(
  db: PostgresJsDatabase<Record<string, unknown>>,
  jobId: string
): Promise<boolean> {
  const result = await db
    .update(jobQueue)
    .set({ status: 'failed', error: 'Cancelled by user' })
    .where(and(eq(jobQueue.id, jobId), eq(jobQueue.status, 'pending')));

  return true;
}

/**
 * Retry a failed job
 */
export async function retryJob(
  db: PostgresJsDatabase<Record<string, unknown>>,
  jobId: string
): Promise<boolean> {
  await db
    .update(jobQueue)
    .set({
      status: 'pending',
      error: null,
      attempts: 0,
      scheduledAt: new Date(),
    })
    .where(and(eq(jobQueue.id, jobId), eq(jobQueue.status, 'failed')));

  return true;
}
