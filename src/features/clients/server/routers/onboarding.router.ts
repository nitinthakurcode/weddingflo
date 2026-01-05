import { z } from 'zod'
import { router, protectedProcedure } from '@/server/trpc/trpc'
import { db, eq } from '@/lib/db'
import { companies } from '@/lib/db/schema'
import { TRPCError } from '@trpc/server'

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

    const companyResult = await db
      .select({
        onboardingCompleted: companies.onboardingCompleted,
        onboardingStep: companies.onboardingStep,
        onboardingData: companies.onboardingData,
      })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1)

    const company = companyResult[0]

    if (!company) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch onboarding status',
      })
    }

    return {
      completed: company.onboardingCompleted,
      currentStep: company.onboardingStep,
      data: company.onboardingData || {},
    }
  }),

  // Update progress and save step data
  updateProgress: protectedProcedure
    .input(
      z.object({
        step: z.number().min(1).max(5),
        data: z.record(z.string(), z.any()),
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
        await db
          .update(companies)
          .set({
            onboardingStep: input.step,
            onboardingData: input.data,
            onboardingStartedAt: new Date(),
          })
          .where(eq(companies.id, companyId))

        return { success: true }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update onboarding progress',
        })
      }
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

    try {
      // Update database (source of truth)
      await db
        .update(companies)
        .set({
          onboardingCompleted: true,
          onboardingStep: 5,
          onboardingCompletedAt: new Date(),
        })
        .where(eq(companies.id, companyId))

      // With BetterAuth, user metadata is stored directly in the database
      // The onboarding_completed flag is already set in the companies table above
      console.log(`✅ Onboarding completed for user ${userId}`)

      return { success: true }
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to complete onboarding',
      })
    }
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

    try {
      // Update database (source of truth)
      await db
        .update(companies)
        .set({
          onboardingCompleted: true,
          onboardingStep: 0, // 0 means skipped
        })
        .where(eq(companies.id, companyId))

      // With BetterAuth, user metadata is stored directly in the database
      // The onboarding_completed flag is already set in the companies table above
      console.log(`✅ Onboarding skipped for user ${userId}`)

      return { success: true }
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to skip onboarding',
      })
    }
  }),
})
