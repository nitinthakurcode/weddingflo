import { z } from 'zod'
import { router, protectedProcedure } from '@/server/trpc/trpc'
import { db, eq, and, isNotNull, sql } from '@/lib/db'
import { companies, clients, teamInvitations, timeline, user as userTable } from '@/lib/db/schema'
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

  // Get checklist status for onboarding progress widget
  getChecklistStatus: protectedProcedure.query(async ({ ctx }) => {
    const { companyId, userId } = ctx

    if (!companyId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Company ID required',
      })
    }

    try {
      // Check if company has any clients
      const clientsResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(clients)
        .where(eq(clients.companyId, companyId))

      const hasClients = (clientsResult[0]?.count ?? 0) > 0

      // Check if company has team members (staff invitations accepted)
      const teamResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(userTable)
        .where(
          and(
            eq(userTable.companyId, companyId),
            eq(userTable.role, 'staff')
          )
        )

      const hasTeamMembers = (teamResult[0]?.count ?? 0) > 0

      // Check if calendar is connected
      // TODO: Implement proper calendar integration check when calendar feature is added
      const hasCalendarConnected = false

      // For email templates, we'll check if any client has received an email
      // For now, mark as complete if company has been set up (simplified)
      const hasEmailTemplates = true // TODO: Check actual email template configuration

      // Check if any timeline items exist for any of the company's clients
      const timelineResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(timeline)
        .innerJoin(clients, eq(timeline.clientId, clients.id))
        .where(eq(clients.companyId, companyId))

      const hasTimeline = (timelineResult[0]?.count ?? 0) > 0

      return {
        hasClients,
        hasTeamMembers,
        hasCalendarConnected,
        hasEmailTemplates,
        hasTimeline,
      }
    } catch (error) {
      console.error('Error getting checklist status:', error)
      // Return all false on error to not block UI
      return {
        hasClients: false,
        hasTeamMembers: false,
        hasCalendarConnected: false,
        hasEmailTemplates: false,
        hasTimeline: false,
      }
    }
  }),
})
