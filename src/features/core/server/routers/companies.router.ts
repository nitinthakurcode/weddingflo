import { z } from 'zod'
import { router, protectedProcedure } from '@/server/trpc/trpc'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { TRPCError } from '@trpc/server'

export const companiesRouter = router({
  // Get current user's company
  getCurrent: protectedProcedure.query(async ({ ctx }) => {
    const { companyId } = ctx

    if (!companyId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Company ID required',
      })
    }

    const supabase = createServerSupabaseClient()

    const { data: company, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single()

    if (error) {
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
        settings: z.record(z.any()).optional(),
        branding: z.record(z.any()).optional(),
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

      const supabase = createServerSupabaseClient()

      const { data, error } = await supabase
        .from('companies')
        .update(input)
        .eq('id', companyId)
        .select()
        .single()

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update company',
        })
      }

      return data
    }),
})
