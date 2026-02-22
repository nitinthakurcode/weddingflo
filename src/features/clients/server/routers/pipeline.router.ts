/**
 * Pipeline Router
 *
 * February 2026 - Full Pipeline CRM for WeddingFlo
 * Manages leads, stages, and activities with Kanban board support.
 *
 * Features:
 * - Company-customizable pipeline stages
 * - Lead management with scoring and prioritization
 * - Activity tracking (notes, calls, emails, meetings)
 * - Lead conversion to client
 * - Pipeline statistics
 */

import { router, protectedProcedure, adminProcedure } from '@/server/trpc/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq, and, isNull, desc, asc, sql, count, sum, gte, lte, or, ilike } from 'drizzle-orm';
import { pipelineStages, pipelineLeads, pipelineActivities, DEFAULT_PIPELINE_STAGES } from '@/lib/db/schema-pipeline';
import { clients, user } from '@/lib/db/schema';
// Note: Using crypto.randomUUID() for client IDs to match TEXT UUID format
// nanoid removed - was causing inconsistent ID formats

// Input schemas
const leadStatusSchema = z.enum(['new', 'contacted', 'qualified', 'proposal_sent', 'negotiating', 'won', 'lost']);
const activityTypeSchema = z.enum(['note', 'call', 'email', 'meeting', 'task', 'stage_change', 'proposal_sent', 'follow_up']);
const prioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);

export const pipelineRouter = router({
  // ========== STAGES ==========
  stages: router({
    /**
     * Get all stages for the company
     */
    getAll: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID not found in session',
        });
      }

      const stages = await ctx.db
        .select()
        .from(pipelineStages)
        .where(and(eq(pipelineStages.companyId, ctx.companyId), eq(pipelineStages.isActive, true)))
        .orderBy(asc(pipelineStages.sortOrder));

      // If no stages exist, initialize with defaults
      if (stages.length === 0) {
        const defaultStages = DEFAULT_PIPELINE_STAGES.map((stage) => ({
          ...stage,
          companyId: ctx.companyId!,
        }));

        await ctx.db.insert(pipelineStages).values(defaultStages);

        return ctx.db
          .select()
          .from(pipelineStages)
          .where(and(eq(pipelineStages.companyId, ctx.companyId!), eq(pipelineStages.isActive, true)))
          .orderBy(asc(pipelineStages.sortOrder));
      }

      return stages;
    }),

    /**
     * Create a new stage
     */
    create: adminProcedure
      .input(
        z.object({
          name: z.string().min(1).max(100),
          description: z.string().optional(),
          color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
          isWon: z.boolean().optional(),
          isLost: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (!ctx.companyId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Company ID not found in session',
          });
        }

        // Get max sort order
        const [maxOrder] = await ctx.db
          .select({ maxOrder: sql<number>`COALESCE(MAX(${pipelineStages.sortOrder}), 0)` })
          .from(pipelineStages)
          .where(eq(pipelineStages.companyId, ctx.companyId));

        const [stage] = await ctx.db
          .insert(pipelineStages)
          .values({
            companyId: ctx.companyId,
            name: input.name,
            description: input.description,
            color: input.color || '#6B7280',
            sortOrder: (maxOrder?.maxOrder || 0) + 1,
            isWon: input.isWon || false,
            isLost: input.isLost || false,
          })
          .returning();

        return stage;
      }),

    /**
     * Update a stage
     */
    update: adminProcedure
      .input(
        z.object({
          id: z.string().uuid(),
          name: z.string().min(1).max(100).optional(),
          description: z.string().optional(),
          color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
          isDefault: z.boolean().optional(),
          isWon: z.boolean().optional(),
          isLost: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (!ctx.companyId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Company ID not found in session',
          });
        }

        // If setting as default, unset other defaults first
        if (input.isDefault) {
          await ctx.db
            .update(pipelineStages)
            .set({ isDefault: false })
            .where(eq(pipelineStages.companyId, ctx.companyId));
        }

        const updateData: Record<string, unknown> = { updatedAt: new Date() };
        if (input.name !== undefined) updateData.name = input.name;
        if (input.description !== undefined) updateData.description = input.description;
        if (input.color !== undefined) updateData.color = input.color;
        if (input.isDefault !== undefined) updateData.isDefault = input.isDefault;
        if (input.isWon !== undefined) updateData.isWon = input.isWon;
        if (input.isLost !== undefined) updateData.isLost = input.isLost;

        const [stage] = await ctx.db
          .update(pipelineStages)
          .set(updateData)
          .where(and(eq(pipelineStages.id, input.id), eq(pipelineStages.companyId, ctx.companyId)))
          .returning();

        if (!stage) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Stage not found',
          });
        }

        return stage;
      }),

    /**
     * Reorder stages
     */
    reorder: adminProcedure
      .input(
        z.object({
          stageIds: z.array(z.string().uuid()),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (!ctx.companyId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Company ID not found in session',
          });
        }

        // Update sort order for each stage
        await Promise.all(
          input.stageIds.map((id, index) =>
            ctx.db
              .update(pipelineStages)
              .set({ sortOrder: index, updatedAt: new Date() })
              .where(and(eq(pipelineStages.id, id), eq(pipelineStages.companyId, ctx.companyId!)))
          )
        );

        return { success: true };
      }),

    /**
     * Delete a stage (soft delete by marking inactive)
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

        // Check if stage has leads
        const [leadCount] = await ctx.db
          .select({ count: count() })
          .from(pipelineLeads)
          .where(and(eq(pipelineLeads.stageId, input.id), isNull(pipelineLeads.deletedAt)));

        if (leadCount && Number(leadCount.count) > 0) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Cannot delete stage with existing leads. Move leads to another stage first.',
          });
        }

        await ctx.db
          .update(pipelineStages)
          .set({ isActive: false, updatedAt: new Date() })
          .where(and(eq(pipelineStages.id, input.id), eq(pipelineStages.companyId, ctx.companyId)));

        return { success: true };
      }),
  }),

  // ========== LEADS ==========
  leads: router({
    /**
     * Get all leads with optional filters
     */
    getAll: protectedProcedure
      .input(
        z.object({
          stageId: z.string().uuid().optional(),
          status: leadStatusSchema.optional(),
          assigneeId: z.string().optional(),
          search: z.string().optional(),
          priority: prioritySchema.optional(),
          limit: z.number().min(1).max(100).optional(),
          offset: z.number().min(0).optional(),
        }).optional()
      )
      .query(async ({ ctx, input }) => {
        if (!ctx.companyId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Company ID not found in session',
          });
        }

        const conditions = [eq(pipelineLeads.companyId, ctx.companyId), isNull(pipelineLeads.deletedAt)];

        if (input?.stageId) {
          conditions.push(eq(pipelineLeads.stageId, input.stageId));
        }
        if (input?.status) {
          conditions.push(eq(pipelineLeads.status, input.status));
        }
        if (input?.assigneeId) {
          conditions.push(eq(pipelineLeads.assigneeId, input.assigneeId));
        }
        if (input?.priority) {
          conditions.push(eq(pipelineLeads.priority, input.priority));
        }
        if (input?.search) {
          const searchPattern = `%${input.search}%`;
          conditions.push(
            or(
              ilike(pipelineLeads.firstName, searchPattern),
              ilike(pipelineLeads.lastName, searchPattern),
              ilike(pipelineLeads.email, searchPattern),
              ilike(pipelineLeads.partnerFirstName, searchPattern)
            )!
          );
        }

        let query = ctx.db
          .select()
          .from(pipelineLeads)
          .where(and(...conditions))
          .orderBy(desc(pipelineLeads.createdAt));

        if (input?.limit) {
          query = query.limit(input.limit) as typeof query;
        }
        if (input?.offset) {
          query = query.offset(input.offset) as typeof query;
        }

        return query;
      }),

    /**
     * Get leads grouped by stage (for Kanban board)
     */
    getByStages: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID not found in session',
        });
      }

      // Get all stages
      const stages = await ctx.db
        .select()
        .from(pipelineStages)
        .where(and(eq(pipelineStages.companyId, ctx.companyId), eq(pipelineStages.isActive, true)))
        .orderBy(asc(pipelineStages.sortOrder));

      // Initialize with defaults if empty
      if (stages.length === 0) {
        const defaultStages = DEFAULT_PIPELINE_STAGES.map((stage) => ({
          ...stage,
          companyId: ctx.companyId!,
        }));
        await ctx.db.insert(pipelineStages).values(defaultStages);
      }

      // Get all leads
      const leads = await ctx.db
        .select()
        .from(pipelineLeads)
        .where(and(eq(pipelineLeads.companyId, ctx.companyId), isNull(pipelineLeads.deletedAt)))
        .orderBy(desc(pipelineLeads.createdAt));

      // Get current stages again (in case we just created them)
      const currentStages = stages.length > 0 ? stages : await ctx.db
        .select()
        .from(pipelineStages)
        .where(and(eq(pipelineStages.companyId, ctx.companyId!), eq(pipelineStages.isActive, true)))
        .orderBy(asc(pipelineStages.sortOrder));

      // Group leads by stage
      const leadsByStage: Record<string, typeof leads> = {};
      for (const stage of currentStages) {
        leadsByStage[stage.id] = leads.filter((lead) => lead.stageId === stage.id);
      }

      return {
        stages: currentStages,
        leadsByStage,
        totalLeads: leads.length,
      };
    }),

    /**
     * Get a single lead by ID
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

        // OPTIMIZED: Combine lead + stage + assignee in single query
        const [result] = await ctx.db
          .select({
            // Lead fields
            lead: pipelineLeads,
            // Stage fields
            stage: pipelineStages,
            // Assignee fields
            assigneeId: user.id,
            assigneeFirstName: user.firstName,
            assigneeLastName: user.lastName,
            assigneeEmail: user.email,
            assigneeAvatarUrl: user.avatarUrl,
          })
          .from(pipelineLeads)
          .leftJoin(pipelineStages, eq(pipelineLeads.stageId, pipelineStages.id))
          .leftJoin(user, eq(pipelineLeads.assigneeId, user.id))
          .where(
            and(
              eq(pipelineLeads.id, input.id),
              eq(pipelineLeads.companyId, ctx.companyId),
              isNull(pipelineLeads.deletedAt)
            )
          )
          .limit(1);

        if (!result) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Lead not found',
          });
        }

        // Get recent activities (separate query is acceptable for list data)
        const activities = await ctx.db
          .select()
          .from(pipelineActivities)
          .where(eq(pipelineActivities.leadId, input.id))
          .orderBy(desc(pipelineActivities.createdAt))
          .limit(10);

        // Build assignee object if present
        const assignee = result.assigneeId ? {
          id: result.assigneeId,
          firstName: result.assigneeFirstName,
          lastName: result.assigneeLastName,
          email: result.assigneeEmail,
          avatarUrl: result.assigneeAvatarUrl,
        } : null;

        return {
          ...result.lead,
          stage: result.stage,
          activities,
          assignee,
        };
      }),

    /**
     * Create a new lead
     * February 2026 - Changed to adminProcedure for proper access control
     */
    create: adminProcedure
      .input(
        z.object({
          firstName: z.string().min(1).max(100),
          lastName: z.string().max(100).optional(),
          email: z.string().email().optional(),
          phone: z.string().optional(),
          partnerFirstName: z.string().optional(),
          partnerLastName: z.string().optional(),
          partnerEmail: z.string().email().optional(),
          partnerPhone: z.string().optional(),
          weddingDate: z.string().optional(),
          venue: z.string().optional(),
          estimatedGuestCount: z.number().int().positive().optional(),
          estimatedBudget: z.number().positive().optional(),
          weddingType: z.string().optional(),
          source: z.string().optional(),
          referralSource: z.string().optional(),
          priority: prioritySchema.optional(),
          notes: z.string().optional(),
          tags: z.array(z.string()).optional(),
          assigneeId: z.string().optional(),
          stageId: z.string().uuid().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (!ctx.companyId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Company ID not found in session',
          });
        }

        // Get default stage if not specified
        let stageId = input.stageId;
        if (!stageId) {
          const [defaultStage] = await ctx.db
            .select({ id: pipelineStages.id })
            .from(pipelineStages)
            .where(
              and(
                eq(pipelineStages.companyId, ctx.companyId),
                eq(pipelineStages.isDefault, true),
                eq(pipelineStages.isActive, true)
              )
            )
            .limit(1);

          if (!defaultStage) {
            // Get first stage
            const [firstStage] = await ctx.db
              .select({ id: pipelineStages.id })
              .from(pipelineStages)
              .where(and(eq(pipelineStages.companyId, ctx.companyId), eq(pipelineStages.isActive, true)))
              .orderBy(asc(pipelineStages.sortOrder))
              .limit(1);

            if (!firstStage) {
              throw new TRPCError({
                code: 'BAD_REQUEST',
                message: 'No pipeline stages found. Please create stages first.',
              });
            }
            stageId = firstStage.id;
          } else {
            stageId = defaultStage.id;
          }
        }

        const [lead] = await ctx.db
          .insert(pipelineLeads)
          .values({
            companyId: ctx.companyId,
            stageId,
            firstName: input.firstName,
            lastName: input.lastName,
            email: input.email,
            phone: input.phone,
            partnerFirstName: input.partnerFirstName,
            partnerLastName: input.partnerLastName,
            partnerEmail: input.partnerEmail,
            partnerPhone: input.partnerPhone,
            weddingDate: input.weddingDate,
            venue: input.venue,
            estimatedGuestCount: input.estimatedGuestCount,
            estimatedBudget: input.estimatedBudget?.toString(),
            weddingType: input.weddingType,
            source: input.source,
            referralSource: input.referralSource,
            priority: input.priority || 'medium',
            notes: input.notes,
            tags: input.tags,
            assigneeId: input.assigneeId,
            status: 'new',
          })
          .returning();

        // Create initial activity
        const [currentUser] = ctx.userId ? await ctx.db
          .select({ id: user.id })
          .from(user)
          .where(eq(user.id, ctx.userId))
          .limit(1) : [];

        if (currentUser) {
          await ctx.db.insert(pipelineActivities).values({
            leadId: lead.id,
            companyId: ctx.companyId,
            userId: currentUser.id,
            type: 'note',
            title: 'Lead created',
            description: `Lead ${input.firstName} ${input.lastName || ''} was added to the pipeline.`,
          });
        }

        return lead;
      }),

    /**
     * Update a lead
     * February 2026 - Changed to adminProcedure for proper access control
     */
    update: adminProcedure
      .input(
        z.object({
          id: z.string().uuid(),
          firstName: z.string().min(1).max(100).optional(),
          lastName: z.string().max(100).optional(),
          email: z.string().email().optional(),
          phone: z.string().optional(),
          partnerFirstName: z.string().optional(),
          partnerLastName: z.string().optional(),
          partnerEmail: z.string().email().optional(),
          partnerPhone: z.string().optional(),
          weddingDate: z.string().optional(),
          venue: z.string().optional(),
          estimatedGuestCount: z.number().int().positive().optional(),
          estimatedBudget: z.number().positive().optional(),
          weddingType: z.string().optional(),
          source: z.string().optional(),
          referralSource: z.string().optional(),
          priority: prioritySchema.optional(),
          score: z.number().int().min(0).max(100).optional(),
          notes: z.string().optional(),
          tags: z.array(z.string()).optional(),
          assigneeId: z.string().nullable().optional(),
          nextFollowUpAt: z.string().datetime().optional(),
          lostReason: z.string().optional(),
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
            if (key === 'estimatedBudget') {
              updateData[key] = value?.toString();
            } else if (key === 'nextFollowUpAt') {
              updateData[key] = new Date(value as string);
            } else {
              updateData[key] = value;
            }
          }
        });

        const [lead] = await ctx.db
          .update(pipelineLeads)
          .set(updateData)
          .where(
            and(
              eq(pipelineLeads.id, id),
              eq(pipelineLeads.companyId, ctx.companyId),
              isNull(pipelineLeads.deletedAt)
            )
          )
          .returning();

        if (!lead) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Lead not found',
          });
        }

        return lead;
      }),

    /**
     * Update lead stage (for drag-and-drop)
     * February 2026 - Changed to adminProcedure for proper access control
     */
    updateStage: adminProcedure
      .input(
        z.object({
          id: z.string().uuid(),
          stageId: z.string().uuid(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (!ctx.companyId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Company ID not found in session',
          });
        }

        // Get current lead
        const [lead] = await ctx.db
          .select({ stageId: pipelineLeads.stageId })
          .from(pipelineLeads)
          .where(
            and(
              eq(pipelineLeads.id, input.id),
              eq(pipelineLeads.companyId, ctx.companyId),
              isNull(pipelineLeads.deletedAt)
            )
          )
          .limit(1);

        if (!lead) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Lead not found',
          });
        }

        const previousStageId = lead.stageId;

        // Verify new stage belongs to company
        const [newStage] = await ctx.db
          .select()
          .from(pipelineStages)
          .where(
            and(
              eq(pipelineStages.id, input.stageId),
              eq(pipelineStages.companyId, ctx.companyId),
              eq(pipelineStages.isActive, true)
            )
          )
          .limit(1);

        if (!newStage) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Stage not found',
          });
        }

        // Update lead status based on stage type
        let newStatus: 'new' | 'contacted' | 'qualified' | 'proposal_sent' | 'negotiating' | 'won' | 'lost' | undefined;
        if (newStage.isWon) {
          newStatus = 'won';
        } else if (newStage.isLost) {
          newStatus = 'lost';
        }

        const updateData: Record<string, unknown> = {
          stageId: input.stageId,
          updatedAt: new Date(),
        };
        if (newStatus) {
          updateData.status = newStatus;
        }

        const [updatedLead] = await ctx.db
          .update(pipelineLeads)
          .set(updateData)
          .where(eq(pipelineLeads.id, input.id))
          .returning();

        // Log stage change activity
        const [currentUser] = ctx.userId ? await ctx.db
          .select({ id: user.id })
          .from(user)
          .where(eq(user.id, ctx.userId))
          .limit(1) : [];

        if (currentUser) {
          await ctx.db.insert(pipelineActivities).values({
            leadId: input.id,
            companyId: ctx.companyId,
            userId: currentUser.id,
            type: 'stage_change',
            title: `Moved to ${newStage.name}`,
            previousStageId,
            newStageId: input.stageId,
          });
        }

        return updatedLead;
      }),

    /**
     * Convert lead to client
     */
    convertToClient: adminProcedure
      .input(
        z.object({
          id: z.string().uuid(),
          weddingDate: z.string().optional(),
          venue: z.string().optional(),
          budget: z.number().positive().optional(),
          guestCount: z.number().int().positive().optional(),
          weddingType: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (!ctx.companyId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Company ID not found in session',
          });
        }

        // Get the lead
        const [lead] = await ctx.db
          .select()
          .from(pipelineLeads)
          .where(
            and(
              eq(pipelineLeads.id, input.id),
              eq(pipelineLeads.companyId, ctx.companyId),
              isNull(pipelineLeads.deletedAt)
            )
          )
          .limit(1);

        if (!lead) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Lead not found',
          });
        }

        if (lead.convertedToClientId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Lead has already been converted to a client',
          });
        }

        // Get current user for createdBy
        const [currentUser] = ctx.userId ? await ctx.db
          .select({ id: user.id })
          .from(user)
          .where(eq(user.id, ctx.userId))
          .limit(1) : [null];

        // Create client from lead data
        // Use crypto.randomUUID() for consistent UUID format
        const [client] = await ctx.db
          .insert(clients)
          .values({
            id: crypto.randomUUID(),
            companyId: ctx.companyId,
            partner1FirstName: lead.firstName,
            partner1LastName: lead.lastName,
            partner1Email: lead.email,
            partner1Phone: lead.phone,
            partner2FirstName: lead.partnerFirstName,
            partner2LastName: lead.partnerLastName,
            partner2Email: lead.partnerEmail,
            partner2Phone: lead.partnerPhone,
            weddingDate: input.weddingDate || lead.weddingDate,
            venue: input.venue || lead.venue,
            budget: (input.budget || (lead.estimatedBudget ? parseFloat(lead.estimatedBudget) : null))?.toString(),
            guestCount: input.guestCount || lead.estimatedGuestCount,
            weddingType: input.weddingType || lead.weddingType || 'traditional',
            status: 'planning',
            notes: lead.notes,
            createdBy: currentUser?.id,
            metadata: {
              convertedFromLeadId: lead.id,
              leadSource: lead.source,
              leadTags: lead.tags,
            },
          })
          .returning();

        // Find "won" stage and move lead there
        const [wonStage] = await ctx.db
          .select({ id: pipelineStages.id })
          .from(pipelineStages)
          .where(
            and(
              eq(pipelineStages.companyId, ctx.companyId),
              eq(pipelineStages.isWon, true),
              eq(pipelineStages.isActive, true)
            )
          )
          .limit(1);

        // Update lead with conversion info
        await ctx.db
          .update(pipelineLeads)
          .set({
            convertedToClientId: client.id,
            convertedAt: new Date(),
            status: 'won',
            stageId: wonStage?.id || lead.stageId,
            updatedAt: new Date(),
          })
          .where(eq(pipelineLeads.id, input.id));

        // Log conversion activity
        if (currentUser) {
          await ctx.db.insert(pipelineActivities).values({
            leadId: input.id,
            companyId: ctx.companyId,
            userId: currentUser.id,
            type: 'note',
            title: 'Converted to client',
            description: `Lead was successfully converted to client #${client.id}`,
            metadata: { clientId: client.id },
          });
        }

        return {
          lead: { ...lead, convertedToClientId: client.id },
          client,
        };
      }),

    /**
     * Delete a lead (soft delete)
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

        await ctx.db
          .update(pipelineLeads)
          .set({ deletedAt: new Date(), updatedAt: new Date() })
          .where(and(eq(pipelineLeads.id, input.id), eq(pipelineLeads.companyId, ctx.companyId)));

        return { success: true };
      }),

    /**
     * Get pipeline statistics
     */
    getStats: protectedProcedure
      .input(
        z.object({
          dateFrom: z.string().datetime().optional(),
          dateTo: z.string().datetime().optional(),
        }).optional()
      )
      .query(async ({ ctx, input }) => {
        if (!ctx.companyId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Company ID not found in session',
          });
        }

        const conditions = [eq(pipelineLeads.companyId, ctx.companyId), isNull(pipelineLeads.deletedAt)];

        if (input?.dateFrom) {
          conditions.push(gte(pipelineLeads.createdAt, new Date(input.dateFrom)));
        }
        if (input?.dateTo) {
          conditions.push(lte(pipelineLeads.createdAt, new Date(input.dateTo)));
        }

        // Total leads
        const [totalResult] = await ctx.db
          .select({ count: count() })
          .from(pipelineLeads)
          .where(and(...conditions));

        // Leads by status
        const statusCounts = await ctx.db
          .select({
            status: pipelineLeads.status,
            count: count(),
          })
          .from(pipelineLeads)
          .where(and(...conditions))
          .groupBy(pipelineLeads.status);

        // Leads by stage
        const stageCounts = await ctx.db
          .select({
            stageId: pipelineLeads.stageId,
            stageName: pipelineStages.name,
            stageColor: pipelineStages.color,
            count: count(),
          })
          .from(pipelineLeads)
          .innerJoin(pipelineStages, eq(pipelineLeads.stageId, pipelineStages.id))
          .where(and(...conditions))
          .groupBy(pipelineLeads.stageId, pipelineStages.name, pipelineStages.color);

        // Total estimated budget
        const [budgetResult] = await ctx.db
          .select({
            total: sum(pipelineLeads.estimatedBudget),
          })
          .from(pipelineLeads)
          .where(and(...conditions));

        // Conversion rate
        const [convertedResult] = await ctx.db
          .select({ count: count() })
          .from(pipelineLeads)
          .where(and(...conditions, eq(pipelineLeads.status, 'won')));

        const total = Number(totalResult?.count || 0);
        const converted = Number(convertedResult?.count || 0);
        const conversionRate = total > 0 ? (converted / total) * 100 : 0;

        return {
          totalLeads: total,
          byStatus: statusCounts.reduce(
            (acc, row) => {
              acc[row.status || 'unknown'] = Number(row.count);
              return acc;
            },
            {} as Record<string, number>
          ),
          byStage: stageCounts.map((row) => ({
            stageId: row.stageId,
            stageName: row.stageName,
            stageColor: row.stageColor,
            count: Number(row.count),
          })),
          totalEstimatedBudget: parseFloat(budgetResult?.total || '0'),
          conversionRate: Math.round(conversionRate * 100) / 100,
        };
      }),
  }),

  // ========== ACTIVITIES ==========
  activities: router({
    /**
     * Get activities for a lead
     */
    getByLead: protectedProcedure
      .input(
        z.object({
          leadId: z.string().uuid(),
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

        let query = ctx.db
          .select()
          .from(pipelineActivities)
          .where(
            and(eq(pipelineActivities.leadId, input.leadId), eq(pipelineActivities.companyId, ctx.companyId))
          )
          .orderBy(desc(pipelineActivities.createdAt));

        if (input.limit) {
          query = query.limit(input.limit) as typeof query;
        }

        return query;
      }),

    /**
     * Create an activity
     * February 2026 - Changed to adminProcedure for proper access control
     */
    create: adminProcedure
      .input(
        z.object({
          leadId: z.string().uuid(),
          type: activityTypeSchema,
          title: z.string().min(1).max(200),
          description: z.string().optional(),
          dueAt: z.string().datetime().optional(),
          metadata: z.record(z.string(), z.unknown()).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (!ctx.companyId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Company ID not found in session',
          });
        }

        // Verify lead belongs to company
        const [lead] = await ctx.db
          .select({ id: pipelineLeads.id })
          .from(pipelineLeads)
          .where(
            and(
              eq(pipelineLeads.id, input.leadId),
              eq(pipelineLeads.companyId, ctx.companyId),
              isNull(pipelineLeads.deletedAt)
            )
          )
          .limit(1);

        if (!lead) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Lead not found',
          });
        }

        // Get current user ID
        if (!ctx.userId) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'User ID not found in session',
          });
        }

        const [currentUser] = await ctx.db
          .select({ id: user.id })
          .from(user)
          .where(eq(user.id, ctx.userId))
          .limit(1);

        if (!currentUser) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'User not found',
          });
        }

        const [activity] = await ctx.db
          .insert(pipelineActivities)
          .values({
            leadId: input.leadId,
            companyId: ctx.companyId,
            userId: currentUser.id,
            type: input.type,
            title: input.title,
            description: input.description,
            dueAt: input.dueAt ? new Date(input.dueAt) : null,
            metadata: input.metadata,
          })
          .returning();

        // Update lead's lastContactedAt for certain activity types
        if (['call', 'email', 'meeting'].includes(input.type)) {
          await ctx.db
            .update(pipelineLeads)
            .set({ lastContactedAt: new Date(), updatedAt: new Date() })
            .where(eq(pipelineLeads.id, input.leadId));
        }

        return activity;
      }),

    /**
     * Complete an activity/task
     */
    complete: protectedProcedure
      .input(z.object({ id: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.companyId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Company ID not found in session',
          });
        }

        const [activity] = await ctx.db
          .update(pipelineActivities)
          .set({
            isCompleted: true,
            completedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(and(eq(pipelineActivities.id, input.id), eq(pipelineActivities.companyId, ctx.companyId)))
          .returning();

        if (!activity) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Activity not found',
          });
        }

        return activity;
      }),

    /**
     * Get upcoming tasks/follow-ups
     */
    getUpcoming: protectedProcedure
      .input(
        z.object({
          limit: z.number().min(1).max(50).optional(),
        }).optional()
      )
      .query(async ({ ctx, input }) => {
        if (!ctx.companyId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Company ID not found in session',
          });
        }

        const now = new Date();

        let query = ctx.db
          .select({
            activity: pipelineActivities,
            lead: {
              id: pipelineLeads.id,
              firstName: pipelineLeads.firstName,
              lastName: pipelineLeads.lastName,
              email: pipelineLeads.email,
            },
          })
          .from(pipelineActivities)
          .innerJoin(pipelineLeads, eq(pipelineActivities.leadId, pipelineLeads.id))
          .where(
            and(
              eq(pipelineActivities.companyId, ctx.companyId),
              eq(pipelineActivities.isCompleted, false),
              sql`${pipelineActivities.dueAt} IS NOT NULL`,
              gte(pipelineActivities.dueAt, now)
            )
          )
          .orderBy(asc(pipelineActivities.dueAt));

        if (input?.limit) {
          query = query.limit(input.limit) as typeof query;
        }

        return query;
      }),

    /**
     * Delete an activity
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

        await ctx.db
          .delete(pipelineActivities)
          .where(and(eq(pipelineActivities.id, input.id), eq(pipelineActivities.companyId, ctx.companyId)));

        return { success: true };
      }),
  }),

  // ========== BACKWARD COMPATIBILITY ==========
  /**
   * List leads (backward compatible with old stub)
   */
  list: protectedProcedure
    .input(z.object({ status: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        return [];
      }

      const conditions = [eq(pipelineLeads.companyId, ctx.companyId), isNull(pipelineLeads.deletedAt)];

      if (input.status) {
        conditions.push(eq(pipelineLeads.status, input.status as any));
      }

      return ctx.db
        .select()
        .from(pipelineLeads)
        .where(and(...conditions))
        .orderBy(desc(pipelineLeads.createdAt));
    }),
});
