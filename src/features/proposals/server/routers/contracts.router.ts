/**
 * Contracts Router
 *
 * February 2026 - Contract management with e-signatures for WeddingFlo
 * Handles creating, sending, and signing contracts with public viewing support.
 *
 * Features:
 * - Contract templates with {{variable}} placeholders
 * - E-signature capture (client and planner)
 * - Public viewing/signing with token
 * - Auto-generated contract numbers
 */

import { router, protectedProcedure, publicProcedure, adminProcedure } from '@/server/trpc/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq, and, isNull, desc, asc, count } from 'drizzle-orm';
import { contracts, contractTemplates, proposals, clients, users, companies, DEFAULT_CONTRACT_VARIABLES } from '@/lib/db/schema';
import { nanoid } from 'nanoid';
import { createNotification, notifyTeamMembers } from '@/features/core/server/services/notification.service';

// Input schemas
const contractStatusSchema = z.enum(['draft', 'pending_signature', 'signed', 'expired', 'cancelled']);

const paymentScheduleItemSchema = z.object({
  amount: z.number(),
  dueDate: z.string(),
  description: z.string().optional(),
  isPaid: z.boolean().optional(),
});

export const contractsRouter = router({
  // ========== TEMPLATES ==========
  templates: router({
    /**
     * Get all contract templates
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
        .from(contractTemplates)
        .where(and(eq(contractTemplates.companyId, ctx.companyId), eq(contractTemplates.isActive, true)))
        .orderBy(desc(contractTemplates.isDefault), asc(contractTemplates.name));
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
          .from(contractTemplates)
          .where(and(eq(contractTemplates.id, input.id), eq(contractTemplates.companyId, ctx.companyId)))
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
     * Get available variables for template
     */
    getVariables: protectedProcedure.query(async () => {
      return DEFAULT_CONTRACT_VARIABLES;
    }),

    /**
     * Create a template
     */
    create: adminProcedure
      .input(
        z.object({
          name: z.string().min(1).max(100),
          description: z.string().optional(),
          content: z.string().min(1),
          availableVariables: z.array(z.string()).optional(),
          requireClientSignature: z.boolean().optional(),
          requirePlannerSignature: z.boolean().optional(),
          signaturesRequired: z.enum(['client', 'planner', 'both']).optional(),
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

        if (input.isDefault) {
          await ctx.db
            .update(contractTemplates)
            .set({ isDefault: false })
            .where(eq(contractTemplates.companyId, ctx.companyId));
        }

        const [template] = await ctx.db
          .insert(contractTemplates)
          .values({
            companyId: ctx.companyId,
            name: input.name,
            description: input.description,
            content: input.content,
            availableVariables: input.availableVariables || DEFAULT_CONTRACT_VARIABLES,
            requireClientSignature: input.requireClientSignature ?? true,
            requirePlannerSignature: input.requirePlannerSignature ?? true,
            signaturesRequired: input.signaturesRequired || 'both',
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
          content: z.string().min(1).optional(),
          availableVariables: z.array(z.string()).optional(),
          requireClientSignature: z.boolean().optional(),
          requirePlannerSignature: z.boolean().optional(),
          signaturesRequired: z.enum(['client', 'planner', 'both']).optional(),
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
            .update(contractTemplates)
            .set({ isDefault: false })
            .where(eq(contractTemplates.companyId, ctx.companyId));
        }

        const updateData: Record<string, unknown> = { updatedAt: new Date() };
        Object.entries(updateFields).forEach(([key, value]) => {
          if (value !== undefined) {
            updateData[key] = value;
          }
        });

        const [template] = await ctx.db
          .update(contractTemplates)
          .set(updateData)
          .where(and(eq(contractTemplates.id, id), eq(contractTemplates.companyId, ctx.companyId)))
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
          .update(contractTemplates)
          .set({ isActive: false, updatedAt: new Date() })
          .where(and(eq(contractTemplates.id, input.id), eq(contractTemplates.companyId, ctx.companyId)));

        return { success: true };
      }),
  }),

  // ========== CONTRACTS ==========
  /**
   * Get all contracts
   */
  getAll: protectedProcedure
    .input(
      z.object({
        status: contractStatusSchema.optional(),
        clientId: z.string().optional(),
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

      const conditions = [eq(contracts.companyId, ctx.companyId), isNull(contracts.deletedAt)];

      if (input?.status) {
        conditions.push(eq(contracts.status, input.status));
      }
      if (input?.clientId) {
        conditions.push(eq(contracts.clientId, input.clientId));
      }

      let query = ctx.db
        .select()
        .from(contracts)
        .where(and(...conditions))
        .orderBy(desc(contracts.createdAt));

      if (input?.limit) {
        query = query.limit(input.limit) as typeof query;
      }
      if (input?.offset) {
        query = query.offset(input.offset) as typeof query;
      }

      return query;
    }),

  /**
   * Get a single contract by ID
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

      const [contract] = await ctx.db
        .select()
        .from(contracts)
        .where(
          and(
            eq(contracts.id, input.id),
            eq(contracts.companyId, ctx.companyId),
            isNull(contracts.deletedAt)
          )
        )
        .limit(1);

      if (!contract) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Contract not found',
        });
      }

      return contract;
    }),

  /**
   * Get contract by public token (no auth required)
   */
  getByPublicToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ ctx, input }) => {
      const [contract] = await ctx.db
        .select()
        .from(contracts)
        .where(and(eq(contracts.publicToken, input.token), isNull(contracts.deletedAt)))
        .limit(1);

      if (!contract) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Contract not found',
        });
      }

      // Check if expired
      if (contract.validUntil && new Date(contract.validUntil) < new Date()) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This contract has expired',
        });
      }

      // Mark as viewed if first time
      if (!contract.viewedAt) {
        await ctx.db
          .update(contracts)
          .set({ viewedAt: new Date(), updatedAt: new Date() })
          .where(eq(contracts.id, contract.id));
      }

      // Get company info for branding
      let company = null;
      if (contract.companyId) {
        const [companyData] = await ctx.db
          .select({
            name: companies.name,
            logoUrl: companies.logoUrl,
            branding: companies.branding,
          })
          .from(companies)
          .where(eq(companies.id, contract.companyId))
          .limit(1);
        company = companyData;
      }

      return {
        ...contract,
        company,
      };
    }),

  /**
   * Create a new contract
   */
  create: protectedProcedure
    .input(
      z.object({
        templateId: z.string().uuid().optional(),
        proposalId: z.string().uuid().optional(),
        clientId: z.string().optional(),
        title: z.string().min(1).max(200),
        clientName: z.string().optional(),
        clientEmail: z.string().email().optional(),
        clientPhone: z.string().optional(),
        clientAddress: z.string().optional(),
        weddingDate: z.string().optional(),
        venue: z.string().optional(),
        content: z.string().min(1),
        totalAmount: z.number().optional(),
        depositAmount: z.number().optional(),
        depositDueDate: z.string().datetime().optional(),
        finalPaymentDueDate: z.string().datetime().optional(),
        paymentSchedule: z.array(paymentScheduleItemSchema).optional(),
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

      // Generate contract number
      const [countResult] = await ctx.db
        .select({ count: count() })
        .from(contracts)
        .where(eq(contracts.companyId, ctx.companyId));

      const contractNumber = `CONTRACT-${new Date().getFullYear()}-${String((Number(countResult?.count) || 0) + 1).padStart(4, '0')}`;

      // Generate public token
      const publicToken = nanoid(32);

      // Auto-populate from client if clientId provided
      let clientData = {
        clientName: input.clientName,
        clientEmail: input.clientEmail,
        clientPhone: input.clientPhone,
        clientAddress: input.clientAddress,
        weddingDate: input.weddingDate,
        venue: input.venue,
      };

      if (input.clientId) {
        const [client] = await ctx.db
          .select()
          .from(clients)
          .where(eq(clients.id, input.clientId))
          .limit(1);

        if (client) {
          clientData = {
            clientName: input.clientName || `${client.partner1FirstName} ${client.partner1LastName || ''}`.trim(),
            clientEmail: input.clientEmail || client.partner1Email || undefined,
            clientPhone: input.clientPhone || client.partner1Phone || undefined,
            clientAddress: input.clientAddress,
            weddingDate: input.weddingDate || client.weddingDate || undefined,
            venue: input.venue || client.venue || undefined,
          };
        }
      }

      const [contract] = await ctx.db
        .insert(contracts)
        .values({
          companyId: ctx.companyId,
          templateId: input.templateId,
          proposalId: input.proposalId,
          clientId: input.clientId,
          title: input.title,
          contractNumber,
          ...clientData,
          content: input.content,
          totalAmount: input.totalAmount?.toString(),
          depositAmount: input.depositAmount?.toString(),
          depositDueDate: input.depositDueDate ? new Date(input.depositDueDate) : null,
          finalPaymentDueDate: input.finalPaymentDueDate ? new Date(input.finalPaymentDueDate) : null,
          paymentSchedule: input.paymentSchedule,
          currency: input.currency || 'USD',
          validUntil: input.validUntil ? new Date(input.validUntil) : null,
          publicToken,
          publicUrl: `/contract/${publicToken}`,
          createdBy: currentUser?.id,
          status: 'draft',
        })
        .returning();

      return contract;
    }),

  /**
   * Create contract from accepted proposal
   */
  createFromProposal: protectedProcedure
    .input(
      z.object({
        proposalId: z.string().uuid(),
        templateId: z.string().uuid().optional(),
        content: z.string().min(1),
        depositAmount: z.number().optional(),
        depositDueDate: z.string().datetime().optional(),
        finalPaymentDueDate: z.string().datetime().optional(),
        paymentSchedule: z.array(paymentScheduleItemSchema).optional(),
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

      // Get proposal
      const [proposal] = await ctx.db
        .select()
        .from(proposals)
        .where(
          and(
            eq(proposals.id, input.proposalId),
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

      // Get current user
      const [currentUser] = await ctx.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.authId, ctx.userId))
        .limit(1);

      // Generate contract number
      const [countResult] = await ctx.db
        .select({ count: count() })
        .from(contracts)
        .where(eq(contracts.companyId, ctx.companyId));

      const contractNumber = `CONTRACT-${new Date().getFullYear()}-${String((Number(countResult?.count) || 0) + 1).padStart(4, '0')}`;
      const publicToken = nanoid(32);

      const [contract] = await ctx.db
        .insert(contracts)
        .values({
          companyId: ctx.companyId,
          templateId: input.templateId,
          proposalId: proposal.id,
          clientId: proposal.clientId,
          title: `Contract for ${proposal.title}`,
          contractNumber,
          clientName: proposal.recipientName,
          clientEmail: proposal.recipientEmail,
          clientPhone: proposal.recipientPhone,
          weddingDate: proposal.weddingDate,
          venue: proposal.venue,
          content: input.content,
          totalAmount: proposal.total,
          depositAmount: input.depositAmount?.toString(),
          depositDueDate: input.depositDueDate ? new Date(input.depositDueDate) : null,
          finalPaymentDueDate: input.finalPaymentDueDate ? new Date(input.finalPaymentDueDate) : null,
          paymentSchedule: input.paymentSchedule,
          currency: proposal.currency || 'USD',
          validUntil: input.validUntil ? new Date(input.validUntil) : null,
          publicToken,
          publicUrl: `/contract/${publicToken}`,
          createdBy: currentUser?.id,
          status: 'draft',
        })
        .returning();

      return contract;
    }),

  /**
   * Update a contract
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(1).max(200).optional(),
        clientName: z.string().optional(),
        clientEmail: z.string().email().optional(),
        clientPhone: z.string().optional(),
        clientAddress: z.string().optional(),
        weddingDate: z.string().optional(),
        venue: z.string().optional(),
        content: z.string().optional(),
        totalAmount: z.number().optional(),
        depositAmount: z.number().optional(),
        depositDueDate: z.string().datetime().optional().nullable(),
        finalPaymentDueDate: z.string().datetime().optional().nullable(),
        paymentSchedule: z.array(paymentScheduleItemSchema).optional(),
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
          if (['totalAmount', 'depositAmount'].includes(key)) {
            updateData[key] = value?.toString();
          } else if (['depositDueDate', 'finalPaymentDueDate', 'validUntil'].includes(key)) {
            updateData[key] = value ? new Date(value as string) : null;
          } else {
            updateData[key] = value;
          }
        }
      });

      const [contract] = await ctx.db
        .update(contracts)
        .set(updateData)
        .where(
          and(
            eq(contracts.id, id),
            eq(contracts.companyId, ctx.companyId),
            isNull(contracts.deletedAt)
          )
        )
        .returning();

      if (!contract) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Contract not found',
        });
      }

      return contract;
    }),

  /**
   * Send a contract for signing
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

      const [contract] = await ctx.db
        .select()
        .from(contracts)
        .where(
          and(
            eq(contracts.id, input.id),
            eq(contracts.companyId, ctx.companyId),
            isNull(contracts.deletedAt)
          )
        )
        .limit(1);

      if (!contract) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Contract not found',
        });
      }

      if (!contract.clientEmail) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Contract must have a client email to send',
        });
      }

      const [updated] = await ctx.db
        .update(contracts)
        .set({
          status: 'pending_signature',
          sentAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(contracts.id, input.id))
        .returning();

      // TODO: Send email via Resend
      console.log(`[Contracts] Would send contract ${contract.contractNumber} to ${contract.clientEmail}`);

      return updated;
    }),

  /**
   * Client signs contract - public endpoint
   */
  clientSign: publicProcedure
    .input(
      z.object({
        token: z.string(),
        signature: z.string(), // Base64 signature data
        name: z.string().min(1),
        ipAddress: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [contract] = await ctx.db
        .select()
        .from(contracts)
        .where(and(eq(contracts.publicToken, input.token), isNull(contracts.deletedAt)))
        .limit(1);

      if (!contract) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Contract not found',
        });
      }

      if (contract.clientSignedAt) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Contract has already been signed by client',
        });
      }

      if (contract.validUntil && new Date(contract.validUntil) < new Date()) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This contract has expired',
        });
      }

      const signatureData = {
        signature: input.signature,
        name: input.name,
        date: new Date().toISOString(),
        ipAddress: input.ipAddress,
      };

      // Determine if contract is fully executed
      const isFullyExecuted = contract.plannerSignedAt != null;

      const [updated] = await ctx.db
        .update(contracts)
        .set({
          clientSignatureData: signatureData,
          clientSignedAt: new Date(),
          status: isFullyExecuted ? 'signed' : 'pending_signature',
          fullyExecutedAt: isFullyExecuted ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(contracts.id, contract.id))
        .returning();

      // Notify team
      if (contract.companyId) {
        await notifyTeamMembers(ctx.db as any, {
          companyId: contract.companyId,
          type: 'contract_signed',
          title: `Contract signed: ${contract.title}`,
          message: `${input.name} has signed contract ${contract.contractNumber}`,
          metadata: {
            entityType: 'contract',
            entityId: contract.id,
            link: `/dashboard/contracts/${contract.id}`,
            signedBy: 'client',
          },
        });
      }

      return { success: true, contract: updated };
    }),

  /**
   * Planner signs contract
   */
  plannerSign: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        signature: z.string(), // Base64 signature data
        name: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID not found in session',
        });
      }

      const [contract] = await ctx.db
        .select()
        .from(contracts)
        .where(
          and(
            eq(contracts.id, input.id),
            eq(contracts.companyId, ctx.companyId),
            isNull(contracts.deletedAt)
          )
        )
        .limit(1);

      if (!contract) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Contract not found',
        });
      }

      if (contract.plannerSignedAt) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Contract has already been signed by planner',
        });
      }

      const signatureData = {
        signature: input.signature,
        name: input.name,
        date: new Date().toISOString(),
      };

      // Determine if contract is fully executed
      const isFullyExecuted = contract.clientSignedAt != null;

      const [updated] = await ctx.db
        .update(contracts)
        .set({
          plannerSignatureData: signatureData,
          plannerSignedAt: new Date(),
          status: isFullyExecuted ? 'signed' : 'pending_signature',
          fullyExecutedAt: isFullyExecuted ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(contracts.id, contract.id))
        .returning();

      return updated;
    }),

  /**
   * Cancel a contract
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

      const [updated] = await ctx.db
        .update(contracts)
        .set({ status: 'cancelled', updatedAt: new Date() })
        .where(and(eq(contracts.id, input.id), eq(contracts.companyId, ctx.companyId)));

      return { success: true };
    }),

  /**
   * Delete a contract
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
        .update(contracts)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(contracts.id, input.id), eq(contracts.companyId, ctx.companyId)));

      return { success: true };
    }),

  /**
   * Get contract stats
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.companyId) {
      return {
        total: 0,
        byStatus: {},
        pendingSignatures: 0,
        fullySigned: 0,
      };
    }

    const conditions = [eq(contracts.companyId, ctx.companyId), isNull(contracts.deletedAt)];

    // Total count
    const [totalResult] = await ctx.db
      .select({ count: count() })
      .from(contracts)
      .where(and(...conditions));

    // By status
    const statusCounts = await ctx.db
      .select({
        status: contracts.status,
        count: count(),
      })
      .from(contracts)
      .where(and(...conditions))
      .groupBy(contracts.status);

    return {
      total: Number(totalResult?.count || 0),
      byStatus: statusCounts.reduce(
        (acc, row) => {
          acc[row.status || 'unknown'] = Number(row.count);
          return acc;
        },
        {} as Record<string, number>
      ),
      pendingSignatures: Number(statusCounts.find((s) => s.status === 'pending_signature')?.count || 0),
      fullySigned: Number(statusCounts.find((s) => s.status === 'signed')?.count || 0),
    };
  }),
});
