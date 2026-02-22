import { z } from 'zod'
import { router, protectedProcedure, superAdminProcedure } from '@/server/trpc/trpc'
import { db, eq, desc } from '@/lib/db'
import { companies } from '@/lib/db/schema'
import { TRPCError } from '@trpc/server'

export const companiesRouter = router({
  // Get all companies (super admin only)
  getAll: superAdminProcedure.query(async ({ ctx }) => {
    const allCompanies = await db
      .select()
      .from(companies)
      .orderBy(desc(companies.createdAt))

    // Transform to match expected format with snake_case for UI compatibility
    return allCompanies.map(company => ({
      id: company.id,
      company_name: company.name,
      subdomain: company.subdomain,
      logo_url: company.logoUrl,
      subscription: {
        tier: company.subscriptionTier,
        status: company.subscriptionStatus,
        ends_at: company.subscriptionEndsAt,
        stripe_customer_id: company.stripeCustomerId,
        stripe_subscription_id: company.stripeSubscriptionId,
      },
      usage_stats: null, // Not stored in schema, calculated on demand
      settings: company.settings,
      branding: company.branding,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
    }))
  }),

  // Create a new company (super admin only)
  create: superAdminProcedure
    .input(z.object({
      name: z.string().min(1),
      subdomain: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await db
        .insert(companies)
        .values({
          name: input.name,
          subdomain: input.subdomain,
        })
        .returning()

      return result[0]
    }),

  // Get current user's company
  getCurrent: protectedProcedure.query(async ({ ctx }) => {
    const { companyId } = ctx

    if (!companyId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Company ID required',
      })
    }

    const companyResult = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1)

    const company = companyResult[0]

    if (!company) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch company',
      })
    }

    return company
  }),

  // Update company information
  update: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).optional(),
        logo_url: z.string().optional(),
        subdomain: z.string().optional(),
        default_currency: z.string().optional(),
        supported_currencies: z.array(z.string()).optional(),
        settings: z.record(z.string(), z.any()).optional(),
        branding: z.record(z.string(), z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { companyId } = ctx

      if (!companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID required',
        })
      }

      try {
        // Map snake_case input to camelCase for Drizzle schema
        const updateData: Record<string, any> = {}
        if (input.name !== undefined) updateData.name = input.name
        if (input.logo_url !== undefined) updateData.logoUrl = input.logo_url
        if (input.subdomain !== undefined) updateData.subdomain = input.subdomain
        if (input.default_currency !== undefined) updateData.defaultCurrency = input.default_currency
        if (input.supported_currencies !== undefined) updateData.supportedCurrencies = input.supported_currencies
        if (input.settings !== undefined) updateData.settings = input.settings
        if (input.branding !== undefined) updateData.branding = input.branding

        const result = await db
          .update(companies)
          .set(updateData)
          .where(eq(companies.id, companyId))
          .returning()

        const company = result[0]

        if (!company) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to update company',
          })
        }

        return company
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update company',
        })
      }
    }),
})
