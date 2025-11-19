import { z } from 'zod'
import { router, protectedProcedure } from '@/server/trpc/trpc'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { TRPCError } from '@trpc/server'
import { clerkClient } from '@clerk/nextjs/server'

export const onboardingRouter = router({
  // Get current onboarding status
  getStatus: protectedProcedure.query(async ({ ctx }) => {
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
      .select('onboarding_completed, onboarding_step, onboarding_data')
      .eq('id', companyId)
      .single()

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch onboarding status',
      })
    }

    return {
      completed: company.onboarding_completed,
      currentStep: company.onboarding_step,
      data: company.onboarding_data || {},
    }
  }),

  // Update progress and save step data
  updateProgress: protectedProcedure
    .input(
      z.object({
        step: z.number().min(1).max(5),
        data: z.record(z.any()),
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

      const { error } = await supabase
        .from('companies')
        .update({
          onboarding_step: input.step,
          onboarding_data: input.data,
          onboarding_started_at: new Date().toISOString(),
        })
        .eq('id', companyId)

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update onboarding progress',
        })
      }

      return { success: true }
    }),

  // Mark onboarding as complete
  complete: protectedProcedure.mutation(async ({ ctx }) => {
    const { companyId, userId } = ctx

    if (!companyId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Company ID required',
      })
    }

    if (!userId) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'User ID required',
      })
    }

    const supabase = createServerSupabaseClient()

    // 1. Update database (source of truth)
    const { error } = await supabase
      .from('companies')
      .update({
        onboarding_completed: true,
        onboarding_step: 5,
        onboarding_completed_at: new Date().toISOString(),
      })
      .eq('id', companyId)

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to complete onboarding',
      })
    }

    // 2. ✅ CRITICAL: Update Clerk metadata (dual sync pattern)
    try {
      const client = await clerkClient()
      await client.users.updateUserMetadata(userId, {
        publicMetadata: {
          onboarding_completed: true,
        },
      })
      console.log(`✅ Updated Clerk metadata: onboarding_completed = true for user ${userId}`)
    } catch (metadataError) {
      console.error('⚠️  Error updating Clerk metadata:', metadataError)
      // Don't fail the entire operation - user can still proceed, metadata will sync eventually
    }

    return { success: true }
  }),

  // Skip onboarding
  skip: protectedProcedure.mutation(async ({ ctx }) => {
    const { companyId, userId } = ctx

    if (!companyId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Company ID required',
      })
    }

    if (!userId) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'User ID required',
      })
    }

    const supabase = createServerSupabaseClient()

    // 1. Update database (source of truth)
    const { error } = await supabase
      .from('companies')
      .update({
        onboarding_completed: true,
        onboarding_step: 0, // 0 means skipped
      })
      .eq('id', companyId)

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to skip onboarding',
      })
    }

    // 2. ✅ CRITICAL: Update Clerk metadata (dual sync pattern)
    try {
      const client = await clerkClient()
      await client.users.updateUserMetadata(userId, {
        publicMetadata: {
          onboarding_completed: true,
        },
      })
      console.log(`✅ Updated Clerk metadata: onboarding_completed = true (skipped) for user ${userId}`)
    } catch (metadataError) {
      console.error('⚠️  Error updating Clerk metadata:', metadataError)
      // Don't fail the entire operation - user can still proceed, metadata will sync eventually
    }

    return { success: true }
  }),
})
