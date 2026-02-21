/**
 * Proposals Router
 *
 * February 2026 - Proposal management for WeddingFlo
 * Handles creating, sending, and tracking proposals with public viewing support.
 *
 * Features:
 * - Proposal templates
 * - Service package management
 * - Public viewing with token
 * - Client acceptance/decline
 */

import { router, protectedProcedure, publicProcedure, adminProcedure } from '@/server/trpc/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq, and, isNull, desc, asc, count } from 'drizzle-orm';
import { proposals, proposalTemplates, pipelineLeads, clients, users, companies } from '@/lib/db/schema';
import { nanoid } from 'nanoid';
import { createNotification, notifyTeamMembers } from '@/features/core/server/services/notification.service';

// Input schemas
const proposalStatusSchema = z.enum(['draft', 'sent', 'viewed', 'accepted', 'declined', 'expired']);

const servicePackageSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  price: z.number(),
  items: z.array(z.object({
    name: z.string(),
    quantity: z.number().optional(),
    unitPrice: z.number().optional(),
  })).optional(),
});

export const proposalsRouter = router({
  // ========== TEMPLATES ==========
  templates: router({
    /**
     * Get all proposal templates
     */
    getAll: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID not found in session',
        });
      }

      return ctx.db
        .select()
        .from(proposalTemplates)
        .where(and(eq(proposalTemplates.companyId, ctx.companyId), eq(proposalTemplates.isActive, true)))
        .orderBy(desc(proposalTemplates.isDefault), asc(proposalTemplates.name));
    }),

    /**
     * Get a single template
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
          .from(proposalTemplates)
          .where(and(eq(proposalTemplates.id, input.id), eq(proposalTemplates.companyId, ctx.companyId)))
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
     * Create a template
     */
    create: adminProcedure
      .input(
        z.object({
          name: z.string().min(1).max(100),
          description: z.string().optional(),
          introText: z.string().optional(),
          termsText: z.string().optional(),
          signatureText: z.string().optional(),
          defaultPackages: z.array(servicePackageSchema).optional(),
          headerImageUrl: z.string().url().optional(),
          accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
          isDefault: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (!ctx.companyId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Company ID not found in session',
          });
        }

        // If setting as default, unset others
        if (input.isDefault) {
          await ctx.db
            .update(proposalTemplates)
            .set({ isDefault: false })
            .where(eq(proposalTemplates.companyId, ctx.companyId));
        }

        const [template] = await ctx.db
          .insert(proposalTemplates)
          .values({
            companyId: ctx.companyId,
            name: input.name,
            description: input.description,
            introText: input.introText,
            termsText: input.termsText,
            signatureText: input.signatureText,
            defaultPackages: input.defaultPackages,
            headerImageUrl: input.headerImageUrl,
            accentColor: input.accentColor,
            isDefault: input.isDefault,
          })
          .returning();

        return template;
      }),

    /**
     * Update a template
     */
    update: adminProcedure
      .input(
        z.object({
          id: z.string().uuid(),
          name: z.string().min(1).max(100).optional(),
          description: z.string().optional(),
          introText: z.string().optional(),
          termsText: z.string().optional(),
          signatureText: z.string().optional(),
          defaultPackages: z.array(servicePackageSchema).optional(),
          headerImageUrl: z.string().url().optional().nullable(),
          accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
          isDefault: z.boolean().optional(),
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

        if (updateFields.isDefault) {
          await ctx.db
            .update(proposalTemplates)
            .set({ isDefault: false })
            .where(eq(proposalTemplates.companyId, ctx.companyId));
        }

        const updateData: Record<string, unknown> = { updatedAt: new Date() };
        Object.entries(updateFields).forEach(([key, value]) => {
          if (value !== undefined) {
            updateData[key] = value;
          }
        });

        const [template] = await ctx.db
          .update(proposalTemplates)
          .set(updateData)
          .where(and(eq(proposalTemplates.id, id), eq(proposalTemplates.companyId, ctx.companyId)))
          .returning();

        return template;
      }),

    /**
     * Delete a template
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
          .update(proposalTemplates)
          .set({ isActive: false, updatedAt: new Date() })
          .where(and(eq(proposalTemplates.id, input.id), eq(proposalTemplates.companyId, ctx.companyId)));

        return { success: true };
      }),
  }),

  // ========== PROPOSALS ==========
  /**
   * Get all proposals
   */
  getAll: protectedProcedure
    .input(
      z.object({
        status: proposalStatusSchema.optional(),
        clientId: z.string().optional(),
        leadId: z.string().uuid().optional(),
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

      const conditions = [eq(proposals.companyId, ctx.companyId), isNull(proposals.deletedAt)];

      if (input?.status) {
        conditions.push(eq(proposals.status, input.status));
      }
      if (input?.clientId) {
        conditions.push(eq(proposals.clientId, input.clientId));
      }
      if (input?.leadId) {
        conditions.push(eq(proposals.leadId, input.leadId));
      }

      let query = ctx.db
        .select()
        .from(proposals)
        .where(and(...conditions))
        .orderBy(desc(proposals.createdAt));

      if (input?.limit) {
        query = query.limit(input.limit) as typeof query;
      }
      if (input?.offset) {
        query = query.offset(input.offset) as typeof query;
      }

      return query;
    }),

  /**
   * Get a single proposal by ID
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

      const [proposal] = await ctx.db
        .select()
        .from(proposals)
        .where(
          and(
            eq(proposals.id, input.id),
            eq(proposals.companyId, ctx.companyId),
            isNull(proposals.deletedAt)
          )
        )
        .limit(1);

      if (!proposal) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Proposal not found',
        });
      }

      return proposal;
    }),

  /**
   * Get proposal by public token (no auth required)
   */
  getByPublicToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ ctx, input }) => {
      const [proposal] = await ctx.db
        .select()
        .from(proposals)
        .where(and(eq(proposals.publicToken, input.token), isNull(proposals.deletedAt)))
        .limit(1);

      if (!proposal) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Proposal not found',
        });
      }

      // Check if expired
      if (proposal.validUntil && new Date(proposal.validUntil) < new Date()) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This proposal has expired',
        });
      }

      // Mark as viewed if first time
      if (!proposal.viewedAt) {
        await ctx.db
          .update(proposals)
          .set({ viewedAt: new Date(), status: 'viewed', updatedAt: new Date() })
          .where(eq(proposals.id, proposal.id));

        // Notify team that proposal was viewed
        if (proposal.companyId) {
          await notifyTeamMembers(ctx.db as any, {
            companyId: proposal.companyId,
            type: 'proposal_viewed',
            title: `Proposal viewed: ${proposal.title}`,
            message: `${proposal.recipientName || 'Client'} viewed proposal ${proposal.proposalNumber}`,
            metadata: {
              entityType: 'proposal',
              entityId: proposal.id,
              link: `/dashboard/proposals/${proposal.id}`,
            },
          });
        }
      }

      // Get company info for branding
      let company = null;
      if (proposal.companyId) {
        const [companyData] = await ctx.db
          .select({
            name: companies.name,
            logoUrl: companies.logoUrl,
            branding: companies.branding,
          })
          .from(companies)
          .where(eq(companies.id, proposal.companyId))
          .limit(1);
        company = companyData;
      }

      return {
        ...proposal,
        company,
      };
    }),

  /**
   * Create a new proposal
   */
  create: protectedProcedure
    .input(
      z.object({
        templateId: z.string().uuid().optional(),
        leadId: z.string().uuid().optional(),
        clientId: z.string().optional(),
        title: z.string().min(1).max(200),
        recipientName: z.string().optional(),
        recipientEmail: z.string().email().optional(),
        recipientPhone: z.string().optional(),
        weddingDate: z.string().optional(),
        venue: z.string().optional(),
        guestCount: z.string().optional(),
        introText: z.string().optional(),
        servicePackages: z.array(servicePackageSchema).optional(),
        termsText: z.string().optional(),
        subtotal: z.number().optional(),
        discount: z.number().optional(),
        discountType: z.enum(['fixed', 'percentage']).optional(),
        tax: z.number().optional(),
        total: z.number().optional(),
        currency: z.string().optional(),
        validUntil: z.string().datetime().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID not found in session',
        });
      }

      // Get current user
      const [currentUser] = await ctx.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.authId, ctx.userId))
        .limit(1);

      // Generate proposal number
      const [countResult] = await ctx.db
        .select({ count: count() })
        .from(proposals)
        .where(eq(proposals.companyId, ctx.companyId));

      const proposalNumber = `PROP-${new Date().getFullYear()}-${String((Number(countResult?.count) || 0) + 1).padStart(4, '0')}`;

      // Generate public token
      const publicToken = nanoid(32);

      // Auto-populate from lead if leadId provided
      let recipientData = {
        recipientName: input.recipientName,
        recipientEmail: input.recipientEmail,
        recipientPhone: input.recipientPhone,
        weddingDate: input.weddingDate,
        venue: input.venue,
        guestCount: input.guestCount,
      };

      if (input.leadId) {
        const [lead] = await ctx.db
          .select()
          .from(pipelineLeads)
          .where(eq(pipelineLeads.id, input.leadId))
          .limit(1);

        if (lead) {
          recipientData = {
            recipientName: input.recipientName || `${lead.firstName} ${lead.lastName || ''}`.trim(),
            recipientEmail: input.recipientEmail || lead.email || undefined,
            recipientPhone: input.recipientPhone || lead.phone || undefined,
            weddingDate: input.weddingDate || lead.weddingDate || undefined,
            venue: input.venue || lead.venue || undefined,
            guestCount: input.guestCount || lead.estimatedGuestCount?.toString() || undefined,
          };
        }
      }

      // Auto-populate from client if clientId provided
      if (input.clientId) {
        const [client] = await ctx.db
          .select()
          .from(clients)
          .where(eq(clients.id, input.clientId))
          .limit(1);

        if (client) {
          recipientData = {
            recipientName: input.recipientName || `${client.partner1FirstName} ${client.partner1LastName || ''}`.trim(),
            recipientEmail: input.recipientEmail || client.partner1Email || undefined,
            recipientPhone: input.recipientPhone || client.partner1Phone || undefined,
            weddingDate: input.weddingDate || client.weddingDate || undefined,
            venue: input.venue || client.venue || undefined,
            guestCount: input.guestCount || client.guestCount?.toString() || undefined,
          };
        }
      }

      const [proposal] = await ctx.db
        .insert(proposals)
        .values({
          companyId: ctx.companyId,
          templateId: input.templateId,
          leadId: input.leadId,
          clientId: input.clientId,
          title: input.title,
          proposalNumber,
          ...recipientData,
          introText: input.introText,
          servicePackages: input.servicePackages,
          termsText: input.termsText,
          subtotal: input.subtotal?.toString(),
          discount: input.discount?.toString(),
          discountType: input.discountType,
          tax: input.tax?.toString(),
          total: input.total?.toString(),
          currency: input.currency || 'USD',
          validUntil: input.validUntil ? new Date(input.validUntil) : null,
          publicToken,
          publicUrl: `/proposal/${publicToken}`,
          createdBy: currentUser?.id,
          status: 'draft',
        })
        .returning();

      return proposal;
    }),

  /**
   * Update a proposal
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(1).max(200).optional(),
        recipientName: z.string().optional(),
        recipientEmail: z.string().email().optional(),
        recipientPhone: z.string().optional(),
        weddingDate: z.string().optional(),
        venue: z.string().optional(),
        guestCount: z.string().optional(),
        introText: z.string().optional(),
        servicePackages: z.array(servicePackageSchema).optional(),
        termsText: z.string().optional(),
        subtotal: z.number().optional(),
        discount: z.number().optional(),
        discountType: z.enum(['fixed', 'percentage']).optional(),
        tax: z.number().optional(),
        total: z.number().optional(),
        currency: z.string().optional(),
        validUntil: z.string().datetime().optional().nullable(),
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
          if (['subtotal', 'discount', 'tax', 'total'].includes(key)) {
            updateData[key] = value?.toString();
          } else if (key === 'validUntil') {
            updateData[key] = value ? new Date(value as string) : null;
          } else {
            updateData[key] = value;
          }
        }
      });

      const [proposal] = await ctx.db
        .update(proposals)
        .set(updateData)
        .where(
          and(
            eq(proposals.id, id),
            eq(proposals.companyId, ctx.companyId),
            isNull(proposals.deletedAt)
          )
        )
        .returning();

      if (!proposal) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Proposal not found',
        });
      }

      return proposal;
    }),

  /**
   * Send a proposal (updates status and sends email)
   */
  send: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID not found in session',
        });
      }

      const [proposal] = await ctx.db
        .select()
        .from(proposals)
        .where(
          and(
            eq(proposals.id, input.id),
            eq(proposals.companyId, ctx.companyId),
            isNull(proposals.deletedAt)
          )
        )
        .limit(1);

      if (!proposal) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Proposal not found',
        });
      }

      if (!proposal.recipientEmail) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Proposal must have a recipient email to send',
        });
      }

      // Update status
      const [updated] = await ctx.db
        .update(proposals)
        .set({
          status: 'sent',
          sentAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(proposals.id, input.id))
        .returning();

      // TODO: Send email via Resend
      console.log(`[Proposals] Would send proposal ${proposal.proposalNumber} to ${proposal.recipientEmail}`);

      return updated;
    }),

  /**
   * Client response (accept/decline) - public endpoint
   */
  respond: publicProcedure
    .input(
      z.object({
        token: z.string(),
        response: z.enum(['accepted', 'declined']),
        notes: z.string().optional(),
        signature: z.string().optional(), // Base64 signature data
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [proposal] = await ctx.db
        .select()
        .from(proposals)
        .where(and(eq(proposals.publicToken, input.token), isNull(proposals.deletedAt)))
        .limit(1);

      if (!proposal) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Proposal not found',
        });
      }

      // Check if already responded
      if (proposal.clientResponse) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This proposal has already been responded to',
        });
      }

      // Check if expired
      if (proposal.validUntil && new Date(proposal.validUntil) < new Date()) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This proposal has expired',
        });
      }

      const [updated] = await ctx.db
        .update(proposals)
        .set({
          status: input.response,
          clientResponse: input.response,
          clientResponseNotes: input.notes,
          clientSignature: input.signature ? { signature: input.signature, signedAt: new Date().toISOString() } : null,
          respondedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(proposals.id, proposal.id))
        .returning();

      // Notify team
      if (proposal.companyId) {
        const notificationType = input.response === 'accepted' ? 'proposal_accepted' : 'proposal_declined';
        await notifyTeamMembers(ctx.db as any, {
          companyId: proposal.companyId,
          type: notificationType,
          title: `Proposal ${input.response}: ${proposal.title}`,
          message: `${proposal.recipientName || 'Client'} has ${input.response} proposal ${proposal.proposalNumber}`,
          metadata: {
            entityType: 'proposal',
            entityId: proposal.id,
            link: `/dashboard/proposals/${proposal.id}`,
          },
        });
      }

      return { success: true, proposal: updated };
    }),

  /**
   * Delete a proposal
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
        .update(proposals)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(proposals.id, input.id), eq(proposals.companyId, ctx.companyId)));

      return { success: true };
    }),

  /**
   * Get proposal stats
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.companyId) {
      return {
        total: 0,
        byStatus: {},
        acceptanceRate: 0,
      };
    }

    const conditions = [eq(proposals.companyId, ctx.companyId), isNull(proposals.deletedAt)];

    // Total count
    const [totalResult] = await ctx.db
      .select({ count: count() })
      .from(proposals)
      .where(and(...conditions));

    // By status
    const statusCounts = await ctx.db
      .select({
        status: proposals.status,
        count: count(),
      })
      .from(proposals)
      .where(and(...conditions))
      .groupBy(proposals.status);

    // Calculate acceptance rate
    const accepted = statusCounts.find((s) => s.status === 'accepted')?.count || 0;
    const declined = statusCounts.find((s) => s.status === 'declined')?.count || 0;
    const responded = Number(accepted) + Number(declined);
    const acceptanceRate = responded > 0 ? (Number(accepted) / responded) * 100 : 0;

    return {
      total: Number(totalResult?.count || 0),
      byStatus: statusCounts.reduce(
        (acc, row) => {
          acc[row.status || 'unknown'] = Number(row.count);
          return acc;
        },
        {} as Record<string, number>
      ),
      acceptanceRate: Math.round(acceptanceRate * 100) / 100,
    };
  }),
});
