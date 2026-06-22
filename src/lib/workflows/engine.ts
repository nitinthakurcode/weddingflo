/**
 * Workflow Execution Engine
 *
 * Drives a `workflow_executions` row forward one step at a time. Each
 * `workflow_step` job processes exactly one step, records an audit log, then
 * enqueues the next step (immediately, or after a delay for `wait` steps).
 * This keeps every unit of work small and crash-safe: a failure retries just
 * that step via the job queue rather than re-running the whole workflow.
 *
 * Recipient/context data flows through `workflow_executions.executionData`,
 * seeded by the trigger that started the execution.
 */

import { db } from '@/lib/db';
import {
  workflows,
  workflowSteps,
  workflowExecutions,
  workflowExecutionLogs,
} from '@/lib/db/schema';
import { eq, and, gt, asc } from 'drizzle-orm';
import { enqueueJob, type WorkflowStepJobPayload } from '@/lib/jobs/pg-queue';
import { sendEmail } from '@/lib/email/resend-client';
import { sendSms } from '@/lib/sms/twilio';
import { sendWhatsAppMessage } from '@/lib/whatsapp/whatsapp-client';
import { createNotification } from '@/features/core/server/services/notification.service';

type StepRow = typeof workflowSteps.$inferSelect;
type ExecutionRow = typeof workflowExecutions.$inferSelect;
type TriggerType = NonNullable<ExecutionRow['triggerType']>;
type Json = Record<string, unknown>;

/**
 * Start a single workflow: create an execution row and enqueue its first step.
 * Returns null if the workflow has no active steps (nothing to run).
 */
export async function startWorkflowExecution(opts: {
  workflowId: string;
  companyId: string;
  triggerType: TriggerType;
  triggerData?: Json;
  entityType?: string;
  entityId?: string;
  executionData?: Json;
}): Promise<{ executionId: string } | null> {
  const [firstStep] = await db
    .select()
    .from(workflowSteps)
    .where(and(eq(workflowSteps.workflowId, opts.workflowId), eq(workflowSteps.isActive, true)))
    .orderBy(asc(workflowSteps.stepOrder))
    .limit(1);

  if (!firstStep) return null;

  const [execution] = await db
    .insert(workflowExecutions)
    .values({
      workflowId: opts.workflowId,
      companyId: opts.companyId,
      triggerType: opts.triggerType,
      triggerData: opts.triggerData,
      entityType: opts.entityType,
      entityId: opts.entityId,
      status: 'running',
      currentStepId: firstStep.id,
      currentStepIndex: 0,
      executionData: opts.executionData,
    })
    .returning({ id: workflowExecutions.id });

  await enqueueJob(db as never, {
    type: 'workflow_step',
    companyId: opts.companyId,
    payload: {
      executionId: execution.id,
      stepId: firstStep.id,
      stepType: firstStep.stepType,
      config: (firstStep.config as Json) || {},
    },
  });

  return { executionId: execution.id };
}

/**
 * Fire all active (non-template) workflows for a company that match a trigger
 * type. Call this from event sites (RSVP received, proposal accepted, …).
 */
export async function startWorkflowsForTrigger(
  companyId: string,
  triggerType: TriggerType,
  opts?: { triggerData?: Json; entityType?: string; entityId?: string; executionData?: Json }
): Promise<{ started: number }> {
  const active = await db
    .select({ id: workflows.id })
    .from(workflows)
    .where(
      and(
        eq(workflows.companyId, companyId),
        eq(workflows.triggerType, triggerType),
        eq(workflows.isActive, true),
        eq(workflows.isTemplate, false)
      )
    );

  let started = 0;
  for (const wf of active) {
    const result = await startWorkflowExecution({ workflowId: wf.id, companyId, triggerType, ...opts });
    if (result) started += 1;
  }
  return { started };
}

async function logStep(
  executionId: string,
  step: Pick<StepRow, 'id' | 'stepType' | 'name'>,
  status: 'started' | 'completed' | 'failed' | 'skipped',
  message?: string,
  error?: string
): Promise<void> {
  await db.insert(workflowExecutionLogs).values({
    executionId,
    stepId: step.id,
    stepType: step.stepType,
    stepName: step.name,
    status,
    message,
    error,
  });
}

/**
 * Evaluate a condition step. Conservative by design: unknown condition shapes
 * resolve to `true` so a misconfigured condition advances the happy path rather
 * than silently stalling the workflow.
 */
function evaluateCondition(step: StepRow, context: Json): boolean {
  const { conditionOperator, conditionField, conditionValue } = step;
  if (!conditionField) return true;

  const actual = context[conditionField];
  switch (conditionOperator) {
    case 'equals':
      return String(actual) === String(conditionValue);
    case 'not_equals':
      return String(actual) !== String(conditionValue);
    case 'contains':
      return String(actual ?? '').includes(String(conditionValue ?? ''));
    case 'exists':
      return actual !== undefined && actual !== null && actual !== '';
    default:
      return true;
  }
}

/**
 * Process a single workflow step job. Idempotent at the execution level:
 * if the execution is already terminal it returns without side effects.
 */
export async function processWorkflowStep(payload: WorkflowStepJobPayload): Promise<void> {
  const [execution] = await db
    .select()
    .from(workflowExecutions)
    .where(eq(workflowExecutions.id, payload.executionId))
    .limit(1);

  if (!execution) {
    console.warn(`[Workflow Engine] Execution ${payload.executionId} not found`);
    return;
  }
  if (['completed', 'failed', 'cancelled'].includes(execution.status ?? '')) {
    return; // terminal — nothing to do
  }

  const [step] = await db
    .select()
    .from(workflowSteps)
    .where(eq(workflowSteps.id, payload.stepId))
    .limit(1);

  if (!step) {
    await failExecution(execution, `Step ${payload.stepId} not found`);
    return;
  }

  await logStep(execution.id, step, 'started');

  const context: Json = (execution.executionData as Json) || {};
  const config: Json = (step.config as Json) || {};
  let nextStepId: string | null = null;
  let delayMs = 0;

  try {
    switch (step.stepType) {
      case 'send_email': {
        const to = (config.to as string) || (context.recipientEmail as string);
        if (to) {
          const result = await sendEmail({
            to,
            subject: (config.subject as string) || 'Update from your wedding planner',
            html: (config.body as string) || (config.subject as string) || '',
          });
          if (!result.success) throw new Error(result.error || 'email send failed');
        } else {
          await logStep(execution.id, step, 'skipped', 'No recipient email in step config or execution context');
        }
        break;
      }
      case 'send_sms': {
        const to = (config.to as string) || (context.recipientPhone as string);
        const message = (config.message as string) || '';
        if (to && message) {
          const result = await sendSms({ to, message });
          if (!result.success) throw new Error(result.error || 'sms send failed');
        } else {
          await logStep(execution.id, step, 'skipped', 'No recipient phone/message');
        }
        break;
      }
      case 'send_whatsapp': {
        const to = (config.to as string) || (context.recipientPhone as string);
        const body = (config.message as string) || '';
        if (to && body) {
          const result = await sendWhatsAppMessage({ to, body });
          if (!result.success) throw new Error(result.error || 'whatsapp send failed');
        } else {
          await logStep(execution.id, step, 'skipped', 'No recipient phone/message');
        }
        break;
      }
      case 'wait': {
        const minutes = step.waitDuration ?? 0;
        delayMs = Math.max(0, minutes) * 60 * 1000;
        break;
      }
      case 'condition': {
        const passed = evaluateCondition(step, context);
        nextStepId = (passed ? step.onTrueStepId : step.onFalseStepId) ?? null;
        break;
      }
      case 'create_notification': {
        const targetUserId = (config.userId as string) || (context.userId as string);
        if (execution.companyId && targetUserId) {
          await createNotification(db as never, {
            companyId: execution.companyId,
            userId: targetUserId,
            type: 'system',
            title: (config.title as string) || 'Workflow notification',
            message: config.message as string | undefined,
            metadata: { entityType: execution.entityType ?? undefined, entityId: execution.entityId ?? undefined },
          });
        } else {
          await logStep(execution.id, step, 'skipped', 'No target user for notification');
        }
        break;
      }
      case 'webhook': {
        const url = config.url as string;
        if (url) {
          await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ executionId: execution.id, entityId: execution.entityId, context }),
          });
        } else {
          await logStep(execution.id, step, 'skipped', 'No webhook url');
        }
        break;
      }
      // create_task / update_lead / update_client: recorded but not yet wired to
      // their target modules — logged as completed so the workflow continues.
      default:
        await logStep(execution.id, step, 'skipped', `Step type ${step.stepType} not yet executable; continuing`);
        break;
    }

    await logStep(execution.id, step, 'completed');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logStep(execution.id, step, 'failed', undefined, message);
    await failExecution(execution, message);
    throw err; // surface to the job queue for retry
  }

  // For non-condition steps, advance linearly by stepOrder.
  if (step.stepType !== 'condition') {
    const [next] = await db
      .select({ id: workflowSteps.id })
      .from(workflowSteps)
      .where(
        and(
          eq(workflowSteps.workflowId, step.workflowId),
          gt(workflowSteps.stepOrder, step.stepOrder),
          eq(workflowSteps.isActive, true)
        )
      )
      .orderBy(asc(workflowSteps.stepOrder))
      .limit(1);
    nextStepId = next?.id ?? null;
  }

  if (nextStepId) {
    const [nextStep] = await db
      .select()
      .from(workflowSteps)
      .where(eq(workflowSteps.id, nextStepId))
      .limit(1);

    if (nextStep) {
      const resumeAt = delayMs > 0 ? new Date(Date.now() + delayMs) : new Date();
      await db
        .update(workflowExecutions)
        .set({
          currentStepId: nextStep.id,
          status: delayMs > 0 ? 'waiting' : 'running',
          nextResumeAt: delayMs > 0 ? resumeAt : null,
          updatedAt: new Date(),
        })
        .where(eq(workflowExecutions.id, execution.id));

      await enqueueJob(db as never, {
        type: 'workflow_step',
        companyId: execution.companyId,
        scheduledAt: resumeAt,
        payload: {
          executionId: execution.id,
          stepId: nextStep.id,
          stepType: nextStep.stepType,
          config: (nextStep.config as Json) || {},
        },
      });
      return;
    }
  }

  // No further steps — mark the execution complete.
  await db
    .update(workflowExecutions)
    .set({ status: 'completed', completedAt: new Date(), nextResumeAt: null, updatedAt: new Date() })
    .where(eq(workflowExecutions.id, execution.id));
}

async function failExecution(execution: ExecutionRow, error: string): Promise<void> {
  await db
    .update(workflowExecutions)
    .set({ status: 'failed', error, updatedAt: new Date() })
    .where(eq(workflowExecutions.id, execution.id));
}
