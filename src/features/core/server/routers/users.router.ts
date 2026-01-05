import { router, protectedProcedure, superAdminProcedure } from '@/server/trpc/trpc';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { eq, desc } from 'drizzle-orm';
import { users, companies } from '@/lib/db/schema';

/**
 * Users Router - Drizzle ORM Version
 *
 * Uses session claims for authorization (NO database queries for auth checks)
 * Migrated from Supabase to Drizzle - December 2025
 */
// Shared procedure for getting current user
const getCurrentUserProcedure = protectedProcedure.query(async ({ ctx }) => {
  if (!ctx.userId) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Not authenticated'
    });
  }

  const [user] = await ctx.db
    .select({
      id: users.id,
      authId: users.authId,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      avatarUrl: users.avatarUrl,
      role: users.role,
      companyId: users.companyId,
      preferredLanguage: users.preferredLanguage,
      preferredCurrency: users.preferredCurrency,
      timezone: users.timezone,
      autoDetectLocale: users.autoDetectLocale,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.authId, ctx.userId))
    .limit(1);

  if (!user) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'User not found'
    });
  }

  // Construct full name
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'User';

  return {
    id: user.id,
    auth_id: user.authId,
    name,
    first_name: user.firstName,
    last_name: user.lastName,
    email: user.email,
    avatar_url: user.avatarUrl,
    role: user.role,
    company_id: user.companyId,
    preferred_language: user.preferredLanguage,
    preferred_currency: user.preferredCurrency,
    timezone: user.timezone,
    auto_detect_locale: user.autoDetectLocale,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
});

export const usersRouter = router({
  /**
   * Get current user's database record
   * Alias: getCurrent (for backward compatibility)
   */
  getCurrentUser: getCurrentUserProcedure,
  getCurrent: getCurrentUserProcedure,

  /**
   * Get user preferences (currency, timezone, language)
   */
  getPreferences: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.userId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }

      const [data] = await ctx.db
        .select({
          preferredCurrency: users.preferredCurrency,
          preferredLanguage: users.preferredLanguage,
          timezone: users.timezone,
          autoDetectLocale: users.autoDetectLocale,
        })
        .from(users)
        .where(eq(users.authId, ctx.userId))
        .limit(1);

      if (!data) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found'
        });
      }

      return {
        preferred_currency: data.preferredCurrency,
        preferred_language: data.preferredLanguage,
        timezone: data.timezone,
        auto_detect_locale: data.autoDetectLocale,
      };
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

      const updateData: Record<string, any> = {
        updatedAt: new Date(),
      };

      if (input.preferred_currency !== undefined) updateData.preferredCurrency = input.preferred_currency;
      if (input.preferred_language !== undefined) updateData.preferredLanguage = input.preferred_language;
      if (input.timezone !== undefined) updateData.timezone = input.timezone;
      if (input.auto_detect_locale !== undefined) updateData.autoDetectLocale = input.auto_detect_locale;

      await ctx.db
        .update(users)
        .set(updateData)
        .where(eq(users.authId, ctx.userId));

      return { success: true };
    }),

  /**
   * Update language only (for language switcher)
   */
  updateLanguage: protectedProcedure
    .input(z.object({
      language: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }

      await ctx.db
        .update(users)
        .set({
          preferredLanguage: input.language,
          updatedAt: new Date(),
        })
        .where(eq(users.authId, ctx.userId));

      return { success: true };
    }),

  /**
   * Generic update mutation for user profile fields
   */
  update: protectedProcedure
    .input(z.object({
      first_name: z.string().optional(),
      last_name: z.string().optional(),
      avatar_url: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }

      const updateData: Record<string, any> = {
        updatedAt: new Date(),
      };

      if (input.first_name !== undefined) updateData.firstName = input.first_name;
      if (input.last_name !== undefined) updateData.lastName = input.last_name;
      if (input.avatar_url !== undefined) updateData.avatarUrl = input.avatar_url;

      await ctx.db
        .update(users)
        .set(updateData)
        .where(eq(users.authId, ctx.userId));

      return { success: true };
    }),

  /**
   * Get all users - Super Admin only
   * Used by superadmin users management page
   */
  getAllUsers: superAdminProcedure
    .query(async ({ ctx }) => {
      // Fetch all users with their company info
      const allUsers = await ctx.db
        .select({
          id: users.id,
          authId: users.authId,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          avatarUrl: users.avatarUrl,
          role: users.role,
          companyId: users.companyId,
          isActive: users.isActive,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        })
        .from(users)
        .orderBy(desc(users.createdAt));

      // Get company info for users with company_id
      const companyIds = [...new Set(allUsers.filter(u => u.companyId).map(u => u.companyId!))] as string[];

      let companyMap = new Map<string, { name: string | null; subscriptionTier: string | null }>();

      if (companyIds.length > 0) {
        const companiesData = await ctx.db
          .select({
            id: companies.id,
            name: companies.name,
            subscriptionTier: companies.subscriptionTier,
          })
          .from(companies);

        companyMap = new Map(companiesData.map(c => [c.id, { name: c.name, subscriptionTier: c.subscriptionTier }]));
      }

      return allUsers.map(u => ({
        id: u.id,
        email: u.email,
        first_name: u.firstName,
        last_name: u.lastName,
        role: u.role,
        avatar_url: u.avatarUrl,
        created_at: u.createdAt?.toISOString() || new Date().toISOString(),
        is_active: u.isActive ?? true,
        companies: u.companyId ? companyMap.get(u.companyId) || null : null,
      }));
    }),

  /**
   * Get user by client relationship - for portal pages
   */
  getClientUser: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.userId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }

      // Get user data with company info
      const [userData] = await ctx.db
        .select({
          id: users.id,
          authId: users.authId,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          avatarUrl: users.avatarUrl,
          role: users.role,
          companyId: users.companyId,
          preferredLanguage: users.preferredLanguage,
          timezone: users.timezone,
        })
        .from(users)
        .where(eq(users.authId, ctx.userId))
        .limit(1);

      if (!userData) {
        return null;
      }

      return {
        id: userData.id,
        auth_id: userData.authId,
        email: userData.email,
        first_name: userData.firstName,
        last_name: userData.lastName,
        avatar_url: userData.avatarUrl,
        role: userData.role,
        company_id: userData.companyId,
        preferred_language: userData.preferredLanguage,
        timezone: userData.timezone,
      };
    }),
});
