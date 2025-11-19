import { router, protectedProcedure } from '@/server/trpc/trpc';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

/**
 * Users Router
 *
 * Uses session claims for authorization (NO database queries for auth checks)
 * - ctx.userId - from Clerk user ID
 * - ctx.companyId - from sessionClaims.metadata.company_id
 */
export const usersRouter = router({
  /**
   * Get current user's database record
   * Returns user info for the authenticated Clerk user
   */
  getCurrentUser: protectedProcedure.query(async ({ ctx }) => {
    const { data: user } = await ctx.supabase
      .from('users')
      .select('id, clerk_id, email, first_name, last_name, avatar_url, role, company_id')
      .eq('clerk_id', ctx.userId)
      .single() as { data: any; error: any };

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found'
      });
    }

    // Construct full name
    const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'User';

    return {
      id: user.id,
      clerk_id: user.clerk_id,
      name,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      avatar_url: user.avatar_url,
      role: user.role,
      company_id: user.company_id,
    };
  }),

  /**
   * Get user preferences (currency, timezone, language)
   */
  getPreferences: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.userId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }

      const { data, error } = await ctx.supabase
        .from('users')
        .select('preferred_currency, preferred_language, timezone, auto_detect_locale')
        .eq('clerk_user_id', ctx.userId)
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch preferences'
        });
      }

      return data;
    }),

  /**
   * Update user preferences
   */
  updatePreferences: protectedProcedure
    .input(z.object({
      preferred_currency: z.string().optional(),
      preferred_language: z.string().optional(),
      timezone: z.string().optional(),
      auto_detect_locale: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }

      const { error } = await ctx.supabase
        .from('users')
        .update({
          ...input,
          updated_at: new Date().toISOString(),
        })
        .eq('clerk_user_id', ctx.userId);

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update preferences'
        });
      }

      return { success: true };
    }),

  /**
   * Update language only (for language switcher in Session 37)
   */
  updateLanguage: protectedProcedure
    .input(z.object({
      language: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }

      const { error } = await ctx.supabase
        .from('users')
        .update({
          preferred_language: input.language,
          updated_at: new Date().toISOString(),
        })
        .eq('clerk_user_id', ctx.userId);

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update language'
        });
      }

      return { success: true };
    }),
});
