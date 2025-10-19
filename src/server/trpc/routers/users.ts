import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

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
});
