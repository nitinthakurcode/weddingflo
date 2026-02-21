/**
 * Questionnaires Router
 *
 * February 2026 - Client questionnaire management for WeddingFlo
 *
 * Features:
 * - Template management (CRUD with default templates)
 * - Questionnaire instances (send to clients)
 * - Public submission (no auth required for clients)
 * - Response tracking and analytics
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure, publicProcedure } from '@/server/trpc/trpc';
import {
  questionnaireTemplates,
  questionnaires,
  questionnaireResponses,
  DEFAULT_QUESTIONNAIRE_TEMPLATES,
  type QuestionDefinition,
  type QuestionAnswer,
} from '@/lib/db/schema-questionnaires';
import { eq, and, desc, sql } from 'drizzle-orm';
import { randomBytes } from 'crypto';

// Generate a secure public token
function generatePublicToken(): string {
  return randomBytes(32).toString('hex');
}

// Question definition schema for validation
const questionDefinitionSchema = z.object({
  id: z.string(),
  type: z.enum([
    'text',
    'textarea',
    'number',
    'date',
    'time',
    'datetime',
    'select',
    'multi_select',
    'checkbox',
    'radio',
    'rating',
    'file_upload',
    'image_upload',
    'color_picker',
    'scale',
  ]),
  question: z.string(),
  description: z.string().optional(),
  required: z.boolean().optional(),
  order: z.number(),
  options: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        value: z.string(),
        description: z.string().optional(),
        imageUrl: z.string().optional(),
      })
    )
    .optional(),
  validation: z
    .object({
      minLength: z.number().optional(),
      maxLength: z.number().optional(),
      min: z.number().optional(),
      max: z.number().optional(),
      pattern: z.string().optional(),
      customMessage: z.string().optional(),
    })
    .optional(),
  conditionalLogic: z
    .object({
      dependsOn: z.string(),
      showWhen: z.enum(['equals', 'not_equals', 'contains', 'not_contains', 'is_empty', 'is_not_empty']),
      value: z.unknown().optional(),
    })
    .optional(),
  placeholder: z.string().optional(),
  defaultValue: z.unknown().optional(),
  section: z.string().optional(),
});

// Templates sub-router
const templatesRouter = router({
  /**
   * Get all questionnaire templates for the company
   */
  getAll: protectedProcedure
    .input(
      z
        .object({
          category: z.string().optional(),
          includeInactive: z.boolean().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID not found in session',
        });
      }

      const conditions = [eq(questionnaireTemplates.companyId, ctx.companyId)];

      if (input?.category) {
        conditions.push(eq(questionnaireTemplates.category, input.category));
      }

      if (!input?.includeInactive) {
        conditions.push(eq(questionnaireTemplates.isActive, true));
      }

      const templates = await ctx.db
        .select()
        .from(questionnaireTemplates)
        .where(and(...conditions))
        .orderBy(desc(questionnaireTemplates.createdAt));

      return templates;
    }),

  /**
   * Get a single template by ID
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

      const [template] = await ctx.db
        .select()
        .from(questionnaireTemplates)
        .where(
          and(
            eq(questionnaireTemplates.id, input.id),
            eq(questionnaireTemplates.companyId, ctx.companyId)
          )
        )
        .limit(1);

      if (!template) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Template not found',
        });
      }

      return template;
    }),

  /**
   * Create a new questionnaire template
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        category: z.string().optional(),
        questions: z.array(questionDefinitionSchema).default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID not found in session',
        });
      }

      const [template] = await ctx.db
        .insert(questionnaireTemplates)
        .values({
          companyId: ctx.companyId,
          name: input.name,
          description: input.description,
          category: input.category,
          questions: input.questions as QuestionDefinition[],
          createdBy: ctx.userId,
        })
        .returning();

      return template;
    }),

  /**
   * Update a questionnaire template
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        category: z.string().optional(),
        questions: z.array(questionDefinitionSchema).optional(),
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

      const { id, ...updates } = input;

      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.category !== undefined) updateData.category = updates.category;
      if (updates.questions !== undefined) updateData.questions = updates.questions as QuestionDefinition[];
      if (updates.isActive !== undefined) updateData.isActive = updates.isActive;

      const [template] = await ctx.db
        .update(questionnaireTemplates)
        .set(updateData)
        .where(
          and(
            eq(questionnaireTemplates.id, id),
            eq(questionnaireTemplates.companyId, ctx.companyId)
          )
        )
        .returning();

      if (!template) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Template not found',
        });
      }

      return template;
    }),

  /**
   * Delete a questionnaire template
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID not found in session',
        });
      }

      const result = await ctx.db
        .delete(questionnaireTemplates)
        .where(
          and(
            eq(questionnaireTemplates.id, input.id),
            eq(questionnaireTemplates.companyId, ctx.companyId)
          )
        )
        .returning({ id: questionnaireTemplates.id });

      if (result.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Template not found',
        });
      }

      return { success: true };
    }),

  /**
   * Seed default templates for the company
   */
  seedDefaults: protectedProcedure.mutation(async ({ ctx }) => {
    if (!ctx.companyId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Company ID not found in session',
      });
    }

    // Check if defaults already exist
    const existing = await ctx.db
      .select({ id: questionnaireTemplates.id })
      .from(questionnaireTemplates)
      .where(
        and(
          eq(questionnaireTemplates.companyId, ctx.companyId),
          eq(questionnaireTemplates.isDefault, true)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return { seeded: false, message: 'Default templates already exist' };
    }

    // Insert default templates
    const templates = await ctx.db
      .insert(questionnaireTemplates)
      .values(
        DEFAULT_QUESTIONNAIRE_TEMPLATES.map((template) => ({
          companyId: ctx.companyId!,
          name: template.name,
          description: template.description,
          category: template.category,
          questions: template.questions as QuestionDefinition[],
          isDefault: true,
          createdBy: ctx.userId,
        }))
      )
      .returning();

    return { seeded: true, count: templates.length };
  }),

  /**
   * Get available template categories
   */
  getCategories: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.companyId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Company ID not found in session',
      });
    }

    const result = await ctx.db
      .selectDistinct({ category: questionnaireTemplates.category })
      .from(questionnaireTemplates)
      .where(eq(questionnaireTemplates.companyId, ctx.companyId));

    return result
      .map((r) => r.category)
      .filter((c): c is string => c !== null);
  }),
});

// Responses sub-router
const responsesRouter = router({
  /**
   * Get all responses for a questionnaire
   */
  getByQuestionnaire: protectedProcedure
    .input(z.object({ questionnaireId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID not found in session',
        });
      }

      // Verify ownership
      const [questionnaire] = await ctx.db
        .select({ id: questionnaires.id })
        .from(questionnaires)
        .where(
          and(
            eq(questionnaires.id, input.questionnaireId),
            eq(questionnaires.companyId, ctx.companyId)
          )
        )
        .limit(1);

      if (!questionnaire) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Questionnaire not found',
        });
      }

      const responses = await ctx.db
        .select()
        .from(questionnaireResponses)
        .where(eq(questionnaireResponses.questionnaireId, input.questionnaireId))
        .orderBy(questionnaireResponses.answeredAt);

      return responses;
    }),

  /**
   * Export responses as structured data
   */
  export: protectedProcedure
    .input(z.object({ questionnaireId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID not found in session',
        });
      }

      // Get questionnaire with questions
      const [questionnaire] = await ctx.db
        .select()
        .from(questionnaires)
        .where(
          and(
            eq(questionnaires.id, input.questionnaireId),
            eq(questionnaires.companyId, ctx.companyId)
          )
        )
        .limit(1);

      if (!questionnaire) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Questionnaire not found',
        });
      }

      // Get all responses
      const responses = await ctx.db
        .select()
        .from(questionnaireResponses)
        .where(eq(questionnaireResponses.questionnaireId, input.questionnaireId));

      // Build structured export
      const questions = questionnaire.questions as QuestionDefinition[];
      const responseMap = new Map(responses.map((r) => [r.questionId, r.answer]));

      const exportData = questions.map((q) => ({
        question: q.question,
        type: q.type,
        section: q.section,
        answer: responseMap.get(q.id) || null,
      }));

      return {
        questionnaire: {
          id: questionnaire.id,
          name: questionnaire.name,
          completedAt: questionnaire.completedAt,
        },
        responses: exportData,
      };
    }),
});

// Main questionnaires router
export const questionnairesRouter = router({
  templates: templatesRouter,
  responses: responsesRouter,

  /**
   * Get all questionnaires for the company
   */
  getAll: protectedProcedure
    .input(
      z
        .object({
          clientId: z.string().uuid().optional(),
          eventId: z.string().uuid().optional(),
          status: z
            .enum(['draft', 'sent', 'viewed', 'in_progress', 'completed', 'expired'])
            .optional(),
          limit: z.number().min(1).max(100).default(50),
          offset: z.number().min(0).default(0),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID not found in session',
        });
      }

      const conditions = [eq(questionnaires.companyId, ctx.companyId)];

      if (input?.clientId) {
        conditions.push(eq(questionnaires.clientId, input.clientId));
      }

      if (input?.eventId) {
        conditions.push(eq(questionnaires.eventId, input.eventId));
      }

      if (input?.status) {
        conditions.push(eq(questionnaires.status, input.status));
      }

      const [items, countResult] = await Promise.all([
        ctx.db
          .select()
          .from(questionnaires)
          .where(and(...conditions))
          .orderBy(desc(questionnaires.createdAt))
          .limit(input?.limit ?? 50)
          .offset(input?.offset ?? 0),
        ctx.db
          .select({ count: sql<number>`count(*)` })
          .from(questionnaires)
          .where(and(...conditions)),
      ]);

      return {
        items,
        total: Number(countResult[0]?.count ?? 0),
        limit: input?.limit ?? 50,
        offset: input?.offset ?? 0,
      };
    }),

  /**
   * Get a single questionnaire by ID
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

      const [questionnaire] = await ctx.db
        .select()
        .from(questionnaires)
        .where(
          and(
            eq(questionnaires.id, input.id),
            eq(questionnaires.companyId, ctx.companyId)
          )
        )
        .limit(1);

      if (!questionnaire) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Questionnaire not found',
        });
      }

      // Get responses
      const responses = await ctx.db
        .select()
        .from(questionnaireResponses)
        .where(eq(questionnaireResponses.questionnaireId, input.id));

      return {
        ...questionnaire,
        responses,
      };
    }),

  /**
   * Create a new questionnaire
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        templateId: z.string().uuid().optional(),
        clientId: z.string().uuid().optional(),
        eventId: z.string().uuid().optional(),
        questions: z.array(questionDefinitionSchema).optional(),
        expiresAt: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID not found in session',
        });
      }

      let questions = input.questions as QuestionDefinition[] | undefined;

      // If using a template, copy questions from template
      if (input.templateId && !questions) {
        const [template] = await ctx.db
          .select({ questions: questionnaireTemplates.questions })
          .from(questionnaireTemplates)
          .where(
            and(
              eq(questionnaireTemplates.id, input.templateId),
              eq(questionnaireTemplates.companyId, ctx.companyId)
            )
          )
          .limit(1);

        if (template) {
          questions = template.questions as QuestionDefinition[];
        }
      }

      const [questionnaire] = await ctx.db
        .insert(questionnaires)
        .values({
          companyId: ctx.companyId,
          templateId: input.templateId,
          clientId: input.clientId,
          eventId: input.eventId,
          name: input.name,
          description: input.description,
          questions: questions || [],
          expiresAt: input.expiresAt,
          createdBy: ctx.userId,
        })
        .returning();

      return questionnaire;
    }),

  /**
   * Update a questionnaire
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        questions: z.array(questionDefinitionSchema).optional(),
        expiresAt: z.date().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID not found in session',
        });
      }

      const { id, ...updates } = input;

      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.questions !== undefined) updateData.questions = updates.questions as QuestionDefinition[];
      if (updates.expiresAt !== undefined) updateData.expiresAt = updates.expiresAt;

      const [questionnaire] = await ctx.db
        .update(questionnaires)
        .set(updateData)
        .where(
          and(
            eq(questionnaires.id, id),
            eq(questionnaires.companyId, ctx.companyId)
          )
        )
        .returning();

      if (!questionnaire) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Questionnaire not found',
        });
      }

      return questionnaire;
    }),

  /**
   * Send questionnaire to client (generates public token)
   */
  send: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        sendEmail: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID not found in session',
        });
      }

      const publicToken = generatePublicToken();

      const [questionnaire] = await ctx.db
        .update(questionnaires)
        .set({
          publicToken,
          status: 'sent',
          sentAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(questionnaires.id, input.id),
            eq(questionnaires.companyId, ctx.companyId),
            eq(questionnaires.status, 'draft')
          )
        )
        .returning();

      if (!questionnaire) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Questionnaire not found or already sent',
        });
      }

      // TODO: Send email notification if sendEmail is true

      return {
        questionnaire,
        publicUrl: `/questionnaire/${publicToken}`,
      };
    }),

  /**
   * Resend questionnaire (send reminder)
   */
  resend: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID not found in session',
        });
      }

      const [questionnaire] = await ctx.db
        .update(questionnaires)
        .set({
          reminderSentAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(questionnaires.id, input.id),
            eq(questionnaires.companyId, ctx.companyId)
          )
        )
        .returning();

      if (!questionnaire) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Questionnaire not found',
        });
      }

      // TODO: Send reminder email

      return questionnaire;
    }),

  /**
   * Delete a questionnaire
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID not found in session',
        });
      }

      const result = await ctx.db
        .delete(questionnaires)
        .where(
          and(
            eq(questionnaires.id, input.id),
            eq(questionnaires.companyId, ctx.companyId)
          )
        )
        .returning({ id: questionnaires.id });

      if (result.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Questionnaire not found',
        });
      }

      return { success: true };
    }),

  /**
   * Get questionnaire stats
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.companyId) {
      return {
        draft: 0,
        sent: 0,
        viewed: 0,
        inProgress: 0,
        completed: 0,
        expired: 0,
        total: 0,
      };
    }

    const result = await ctx.db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'draft') as draft,
        COUNT(*) FILTER (WHERE status = 'sent') as sent,
        COUNT(*) FILTER (WHERE status = 'viewed') as viewed,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'expired') as expired,
        COUNT(*) as total
      FROM questionnaires
      WHERE company_id = ${ctx.companyId}
    `);

    const row = (result as any)[0] || {};
    return {
      draft: Number(row.draft || 0),
      sent: Number(row.sent || 0),
      viewed: Number(row.viewed || 0),
      inProgress: Number(row.in_progress || 0),
      completed: Number(row.completed || 0),
      expired: Number(row.expired || 0),
      total: Number(row.total || 0),
    };
  }),

  // ==================== PUBLIC ENDPOINTS ====================

  /**
   * Get questionnaire by public token (no auth required)
   */
  getByPublicToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ ctx, input }) => {
      const [questionnaire] = await ctx.db
        .select({
          id: questionnaires.id,
          name: questionnaires.name,
          description: questionnaires.description,
          questions: questionnaires.questions,
          status: questionnaires.status,
          expiresAt: questionnaires.expiresAt,
        })
        .from(questionnaires)
        .where(eq(questionnaires.publicToken, input.token))
        .limit(1);

      if (!questionnaire) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Questionnaire not found',
        });
      }

      // Check if expired
      if (questionnaire.expiresAt && new Date() > questionnaire.expiresAt) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'This questionnaire has expired',
        });
      }

      // Check if already completed
      if (questionnaire.status === 'completed') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'This questionnaire has already been completed',
        });
      }

      // Mark as viewed if first view
      if (questionnaire.status === 'sent') {
        await ctx.db
          .update(questionnaires)
          .set({
            status: 'viewed',
            viewedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(questionnaires.publicToken, input.token));
      }

      // Get existing responses
      const responses = await ctx.db
        .select()
        .from(questionnaireResponses)
        .where(eq(questionnaireResponses.questionnaireId, questionnaire.id));

      return {
        ...questionnaire,
        responses,
      };
    }),

  /**
   * Save response to a question (no auth required)
   */
  saveResponse: publicProcedure
    .input(
      z.object({
        token: z.string(),
        questionId: z.string(),
        answer: z.object({
          value: z.unknown(),
          textValue: z.string().optional(),
          files: z
            .array(
              z.object({
                id: z.string(),
                name: z.string(),
                url: z.string(),
                type: z.string(),
                size: z.number(),
              })
            )
            .optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get questionnaire
      const [questionnaire] = await ctx.db
        .select({
          id: questionnaires.id,
          status: questionnaires.status,
          expiresAt: questionnaires.expiresAt,
        })
        .from(questionnaires)
        .where(eq(questionnaires.publicToken, input.token))
        .limit(1);

      if (!questionnaire) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Questionnaire not found',
        });
      }

      // Check if expired
      if (questionnaire.expiresAt && new Date() > questionnaire.expiresAt) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'This questionnaire has expired',
        });
      }

      // Check if already completed
      if (questionnaire.status === 'completed') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'This questionnaire has already been completed',
        });
      }

      // Update status to in_progress
      if (
        questionnaire.status === 'sent' ||
        questionnaire.status === 'viewed'
      ) {
        await ctx.db
          .update(questionnaires)
          .set({
            status: 'in_progress',
            updatedAt: new Date(),
          })
          .where(eq(questionnaires.id, questionnaire.id));
      }

      // Check if response already exists
      const [existingResponse] = await ctx.db
        .select({ id: questionnaireResponses.id })
        .from(questionnaireResponses)
        .where(
          and(
            eq(questionnaireResponses.questionnaireId, questionnaire.id),
            eq(questionnaireResponses.questionId, input.questionId)
          )
        )
        .limit(1);

      if (existingResponse) {
        // Update existing response
        await ctx.db
          .update(questionnaireResponses)
          .set({
            answer: input.answer as QuestionAnswer,
            updatedAt: new Date(),
          })
          .where(eq(questionnaireResponses.id, existingResponse.id));
      } else {
        // Insert new response
        await ctx.db.insert(questionnaireResponses).values({
          questionnaireId: questionnaire.id,
          questionId: input.questionId,
          answer: input.answer as QuestionAnswer,
        });
      }

      return { success: true };
    }),

  /**
   * Submit completed questionnaire (no auth required)
   */
  submit: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [questionnaire] = await ctx.db
        .select({
          id: questionnaires.id,
          questions: questionnaires.questions,
          status: questionnaires.status,
          expiresAt: questionnaires.expiresAt,
        })
        .from(questionnaires)
        .where(eq(questionnaires.publicToken, input.token))
        .limit(1);

      if (!questionnaire) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Questionnaire not found',
        });
      }

      // Check if expired
      if (questionnaire.expiresAt && new Date() > questionnaire.expiresAt) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'This questionnaire has expired',
        });
      }

      // Check if already completed
      if (questionnaire.status === 'completed') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'This questionnaire has already been completed',
        });
      }

      // Validate required questions are answered
      const questions = questionnaire.questions as QuestionDefinition[];
      const requiredQuestionIds = questions
        .filter((q) => q.required)
        .map((q) => q.id);

      const responses = await ctx.db
        .select({ questionId: questionnaireResponses.questionId })
        .from(questionnaireResponses)
        .where(eq(questionnaireResponses.questionnaireId, questionnaire.id));

      const answeredIds = new Set(responses.map((r) => r.questionId));
      const missingRequired = requiredQuestionIds.filter(
        (id) => !answeredIds.has(id)
      );

      if (missingRequired.length > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Please answer all required questions. Missing: ${missingRequired.length} questions`,
        });
      }

      // Mark as completed
      await ctx.db
        .update(questionnaires)
        .set({
          status: 'completed',
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(questionnaires.id, questionnaire.id));

      return { success: true, message: 'Questionnaire submitted successfully' };
    }),
});
