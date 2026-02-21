/**
 * Workflows Router
 *
 * February 2026 - Workflow automation for WeddingFlo
 * Manages workflow definitions, steps, and execution tracking.
 *
 * Features:
 * - Create/edit workflows with trigger configs
 * - Add/reorder workflow steps
 * - Execute workflows manually or automatically
 * - Track execution history
 */

import { router, protectedProcedure, adminProcedure } from '@/server/trpc/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq, and, desc, asc, count } from 'drizzle-orm';
import { workflows, workflowSteps, workflowExecutions, workflowExecutionLogs, WORKFLOW_TEMPLATES, users } from '@/lib/db/schema';
import { enqueueJob } from '@/lib/jobs/pg-queue';

// Input schemas
const triggerTypeSchema = z.enum([
  'lead_stage_change',
  'client_created',
  'event_date_approaching',
  'payment_overdue',
  'rsvp_received',
  'proposal_accepted',
  'contract_signed',
  'scheduled',
  'manual',
]);

const stepTypeSchema = z.enum([
  'send_email',
  'send_sms',
  'send_whatsapp',
  'wait',
  'condition',
  'create_task',
  'update_lead',
  'update_client',
  'create_notification',
  'webhook',
]);

const executionStatusSchema = z.enum([
  'running',
  'waiting',
  'completed',
  'failed',
  'cancelled',
]);

export const workflowsRouter = router({
  // ========== WORKFLOWS ==========
  /**
   * Get all workflows
   */
  getAll: protectedProcedure
    .input(
      z.object({
        isActive: z.boolean().optional(),
        triggerType: triggerTypeSchema.optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID not found in session',
        });
      }

      const conditions = [eq(workflows.companyId, ctx.companyId)];

      if (input?.isActive !== undefined) {
        conditions.push(eq(workflows.isActive, input.isActive));
      }
      if (input?.triggerType) {
        conditions.push(eq(workflows.triggerType, input.triggerType));
      }

      return ctx.db
        .select()
        .from(workflows)
        .where(and(...conditions))
        .orderBy(desc(workflows.createdAt));
    }),

  /**
   * Get a single workflow with steps
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID not found in session',
        });
      }

      const [workflow] = await ctx.db
        .select()
        .from(workflows)
        .where(and(eq(workflows.id, input.id), eq(workflows.companyId, ctx.companyId)))
        .limit(1);

      if (!workflow) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Workflow not found',
        });
      }

      // Get steps
      const steps = await ctx.db
        .select()
        .from(workflowSteps)
        .where(eq(workflowSteps.workflowId, input.id))
        .orderBy(asc(workflowSteps.stepOrder));

      return {
        ...workflow,
        steps,
      };
    }),

  /**
   * Get workflow templates
   */
  getTemplates: protectedProcedure.query(async () => {
    return WORKFLOW_TEMPLATES;
  }),

  /**
   * Create a workflow
   */
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().optional(),
        triggerType: triggerTypeSchema,
        triggerConfig: z.record(z.string(), z.unknown()).optional(),
        cronExpression: z.string().optional(),
        timezone: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID not found in session',
        });
      }

      const [currentUser] = ctx.userId ? await ctx.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.authId, ctx.userId))
        .limit(1) : [];

      const [workflow] = await ctx.db
        .insert(workflows)
        .values({
          companyId: ctx.companyId,
          name: input.name,
          description: input.description,
          triggerType: input.triggerType,
          triggerConfig: input.triggerConfig,
          cronExpression: input.cronExpression,
          timezone: input.timezone || 'UTC',
          isActive: input.isActive ?? true,
          createdBy: currentUser?.id,
        })
        .returning();

      return workflow;
    }),

  /**
   * Create workflow from template
   */
  createFromTemplate: adminProcedure
    .input(
      z.object({
        templateIndex: z.number().min(0).max(WORKFLOW_TEMPLATES.length - 1),
        name: z.string().min(1).max(100).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID not found in session',
        });
      }

      const template = WORKFLOW_TEMPLATES[input.templateIndex];
      if (!template) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid template index',
        });
      }

      const [currentUser] = ctx.userId ? await ctx.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.authId, ctx.userId))
        .limit(1) : [];

      // Create workflow
      const [workflow] = await ctx.db
        .insert(workflows)
        .values({
          companyId: ctx.companyId,
          name: input.name || template.name,
          description: template.description,
          triggerType: template.triggerType,
          isActive: false, // Start inactive so user can configure
          createdBy: currentUser?.id,
        })
        .returning();

      // Create steps
      const stepValues = template.steps.map((step, index) => ({
        workflowId: workflow.id,
        stepType: step.stepType as any,
        stepOrder: index,
        name: step.name,
        config: 'config' in step ? step.config : undefined,
        waitDuration: 'waitDuration' in step ? step.waitDuration : undefined,
        waitUnit: 'waitUnit' in step ? step.waitUnit : undefined,
        conditionType: 'conditionType' in step ? step.conditionType : undefined,
        conditionValue: 'conditionValue' in step ? step.conditionValue : undefined,
      }));

      await ctx.db.insert(workflowSteps).values(stepValues);

      // Get steps for return
      const steps = await ctx.db
        .select()
        .from(workflowSteps)
        .where(eq(workflowSteps.workflowId, workflow.id))
        .orderBy(asc(workflowSteps.stepOrder));

      return {
        ...workflow,
        steps,
      };
    }),

  /**
   * Update a workflow
   */
  update: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().optional(),
        triggerType: triggerTypeSchema.optional(),
        triggerConfig: z.record(z.string(), z.unknown()).optional(),
        cronExpression: z.string().optional().nullable(),
        timezone: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID not found in session',
        });
      }

      const { id, ...updateFields } = input;

      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      Object.entries(updateFields).forEach(([key, value]) => {
        if (value !== undefined) {
          updateData[key] = value;
        }
      });

      const [workflow] = await ctx.db
        .update(workflows)
        .set(updateData)
        .where(and(eq(workflows.id, id), eq(workflows.companyId, ctx.companyId)))
        .returning();

      return workflow;
    }),

  /**
   * Delete a workflow
   */
  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID not found in session',
        });
      }

      // Delete workflow (cascade will delete steps)
      await ctx.db
        .delete(workflows)
        .where(and(eq(workflows.id, input.id), eq(workflows.companyId, ctx.companyId)));

      return { success: true };
    }),

  // ========== STEPS ==========
  steps: router({
    /**
     * Add a step to a workflow
     */
    add: adminProcedure
      .input(
        z.object({
          workflowId: z.string().uuid(),
          stepType: stepTypeSchema,
          name: z.string().optional(),
          config: z.record(z.string(), z.unknown()).optional(),
          waitDuration: z.number().int().positive().optional(),
          waitUnit: z.enum(['minutes', 'hours', 'days']).optional(),
          conditionType: z.string().optional(),
          conditionField: z.string().optional(),
          conditionOperator: z.string().optional(),
          conditionValue: z.string().optional(),
          insertAfterStepId: z.string().uuid().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (!ctx.companyId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Company ID not found in session',
          });
        }

        // Verify workflow belongs to company
        const [workflow] = await ctx.db
          .select({ id: workflows.id })
          .from(workflows)
          .where(and(eq(workflows.id, input.workflowId), eq(workflows.companyId, ctx.companyId)))
          .limit(1);

        if (!workflow) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Workflow not found',
          });
        }

        // Get max step order
        const existingSteps = await ctx.db
          .select({ stepOrder: workflowSteps.stepOrder })
          .from(workflowSteps)
          .where(eq(workflowSteps.workflowId, input.workflowId))
          .orderBy(desc(workflowSteps.stepOrder))
          .limit(1);

        const newOrder = (existingSteps[0]?.stepOrder ?? -1) + 1;

        const [step] = await ctx.db
          .insert(workflowSteps)
          .values({
            workflowId: input.workflowId,
            stepType: input.stepType,
            stepOrder: newOrder,
            name: input.name,
            config: input.config,
            waitDuration: input.waitDuration,
            waitUnit: input.waitUnit,
            conditionType: input.conditionType,
            conditionField: input.conditionField,
            conditionOperator: input.conditionOperator,
            conditionValue: input.conditionValue,
          })
          .returning();

        return step;
      }),

    /**
     * Update a step
     */
    update: adminProcedure
      .input(
        z.object({
          id: z.string().uuid(),
          stepType: stepTypeSchema.optional(),
          name: z.string().optional(),
          config: z.record(z.string(), z.unknown()).optional(),
          waitDuration: z.number().int().positive().optional(),
          waitUnit: z.enum(['minutes', 'hours', 'days']).optional(),
          conditionType: z.string().optional(),
          conditionField: z.string().optional(),
          conditionOperator: z.string().optional(),
          conditionValue: z.string().optional(),
          onTrueStepId: z.string().uuid().optional().nullable(),
          onFalseStepId: z.string().uuid().optional().nullable(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (!ctx.companyId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Company ID not found in session',
          });
        }

        const { id, ...updateFields } = input;

        // Verify step belongs to company's workflow
        const [step] = await ctx.db
          .select({ workflowId: workflowSteps.workflowId })
          .from(workflowSteps)
          .innerJoin(workflows, eq(workflowSteps.workflowId, workflows.id))
          .where(and(eq(workflowSteps.id, id), eq(workflows.companyId, ctx.companyId)))
          .limit(1);

        if (!step) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Step not found',
          });
        }

        const updateData: Record<string, unknown> = { updatedAt: new Date() };
        Object.entries(updateFields).forEach(([key, value]) => {
          if (value !== undefined) {
            updateData[key] = value;
          }
        });

        const [updated] = await ctx.db
          .update(workflowSteps)
          .set(updateData)
          .where(eq(workflowSteps.id, id))
          .returning();

        return updated;
      }),

    /**
     * Reorder steps
     */
    reorder: adminProcedure
      .input(
        z.object({
          workflowId: z.string().uuid(),
          stepIds: z.array(z.string().uuid()),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (!ctx.companyId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Company ID not found in session',
          });
        }

        // Verify workflow belongs to company
        const [workflow] = await ctx.db
          .select({ id: workflows.id })
          .from(workflows)
          .where(and(eq(workflows.id, input.workflowId), eq(workflows.companyId, ctx.companyId)))
          .limit(1);

        if (!workflow) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Workflow not found',
          });
        }

        // Update order for each step
        await Promise.all(
          input.stepIds.map((stepId, index) =>
            ctx.db
              .update(workflowSteps)
              .set({ stepOrder: index, updatedAt: new Date() })
              .where(and(eq(workflowSteps.id, stepId), eq(workflowSteps.workflowId, input.workflowId)))
          )
        );

        return { success: true };
      }),

    /**
     * Delete a step
     */
    delete: adminProcedure
      .input(z.object({ id: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.companyId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Company ID not found in session',
          });
        }

        // Verify step belongs to company's workflow
        const [step] = await ctx.db
          .select({ workflowId: workflowSteps.workflowId })
          .from(workflowSteps)
          .innerJoin(workflows, eq(workflowSteps.workflowId, workflows.id))
          .where(and(eq(workflowSteps.id, input.id), eq(workflows.companyId, ctx.companyId)))
          .limit(1);

        if (!step) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Step not found',
          });
        }

        await ctx.db.delete(workflowSteps).where(eq(workflowSteps.id, input.id));

        return { success: true };
      }),
  }),

  // ========== EXECUTIONS ==========
  executions: router({
    /**
     * Get executions for a workflow
     */
    getByWorkflow: protectedProcedure
      .input(
        z.object({
          workflowId: z.string().uuid(),
          status: executionStatusSchema.optional(),
          limit: z.number().min(1).max(100).optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        if (!ctx.companyId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Company ID not found in session',
          });
        }

        const conditions = [
          eq(workflowExecutions.workflowId, input.workflowId),
          eq(workflowExecutions.companyId, ctx.companyId),
        ];

        if (input.status) {
          conditions.push(eq(workflowExecutions.status, input.status));
        }

        let query = ctx.db
          .select()
          .from(workflowExecutions)
          .where(and(...conditions))
          .orderBy(desc(workflowExecutions.startedAt));

        if (input.limit) {
          query = query.limit(input.limit) as typeof query;
        }

        return query;
      }),

    /**
     * Get execution details with logs
     */
    getById: protectedProcedure
      .input(z.object({ id: z.string().uuid() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.companyId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Company ID not found in session',
          });
        }

        const [execution] = await ctx.db
          .select()
          .from(workflowExecutions)
          .where(
            and(eq(workflowExecutions.id, input.id), eq(workflowExecutions.companyId, ctx.companyId))
          )
          .limit(1);

        if (!execution) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Execution not found',
          });
        }

        // Get logs
        const logs = await ctx.db
          .select()
          .from(workflowExecutionLogs)
          .where(eq(workflowExecutionLogs.executionId, input.id))
          .orderBy(asc(workflowExecutionLogs.createdAt));

        return {
          ...execution,
          logs,
        };
      }),

    /**
     * Cancel an execution
     */
    cancel: adminProcedure
      .input(z.object({ id: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.companyId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Company ID not found in session',
          });
        }

        await ctx.db
          .update(workflowExecutions)
          .set({
            status: 'cancelled',
            completedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(workflowExecutions.id, input.id),
              eq(workflowExecutions.companyId, ctx.companyId)
            )
          );

        return { success: true };
      }),
  }),

  /**
   * Trigger a workflow manually
   */
  trigger: protectedProcedure
    .input(
      z.object({
        workflowId: z.string().uuid(),
        entityType: z.string().optional(),
        entityId: z.string().optional(),
        triggerData: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID not found in session',
        });
      }

      // Verify workflow
      const [workflow] = await ctx.db
        .select()
        .from(workflows)
        .where(
          and(
            eq(workflows.id, input.workflowId),
            eq(workflows.companyId, ctx.companyId),
            eq(workflows.isActive, true)
          )
        )
        .limit(1);

      if (!workflow) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Workflow not found or not active',
        });
      }

      // Create execution
      const [execution] = await ctx.db
        .insert(workflowExecutions)
        .values({
          workflowId: workflow.id,
          companyId: ctx.companyId,
          triggerType: 'manual',
          triggerData: input.triggerData,
          entityType: input.entityType,
          entityId: input.entityId,
          status: 'running',
          currentStepIndex: 0,
        })
        .returning();

      // Enqueue job to process first step
      await enqueueJob(ctx.db as any, {
        type: 'workflow_step',
        companyId: ctx.companyId,
        payload: {
          executionId: execution.id,
          workflowId: workflow.id,
          stepIndex: 0,
        },
      });

      return execution;
    }),

  /**
   * Get workflow stats
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.companyId) {
      return {
        totalWorkflows: 0,
        activeWorkflows: 0,
        totalExecutions: 0,
        executionsByStatus: {},
      };
    }

    // Count workflows
    const [workflowCount] = await ctx.db
      .select({ count: count() })
      .from(workflows)
      .where(eq(workflows.companyId, ctx.companyId));

    const [activeCount] = await ctx.db
      .select({ count: count() })
      .from(workflows)
      .where(and(eq(workflows.companyId, ctx.companyId), eq(workflows.isActive, true)));

    // Count executions
    const [executionCount] = await ctx.db
      .select({ count: count() })
      .from(workflowExecutions)
      .where(eq(workflowExecutions.companyId, ctx.companyId));

    const executionsByStatus = await ctx.db
      .select({
        status: workflowExecutions.status,
        count: count(),
      })
      .from(workflowExecutions)
      .where(eq(workflowExecutions.companyId, ctx.companyId))
      .groupBy(workflowExecutions.status);

    return {
      totalWorkflows: Number(workflowCount?.count || 0),
      activeWorkflows: Number(activeCount?.count || 0),
      totalExecutions: Number(executionCount?.count || 0),
      executionsByStatus: executionsByStatus.reduce(
        (acc, row) => {
          acc[row.status || 'unknown'] = Number(row.count);
          return acc;
        },
        {} as Record<string, number>
      ),
    };
  }),
});
