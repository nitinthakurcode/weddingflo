import { router, protectedProcedure, adminProcedure } from '@/server/trpc/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq, and, isNull, desc, ilike, or } from 'drizzle-orm';
import { clients, users, companies, events, clientUsers, budget, timeline, vendors, clientVendors } from '@/lib/db/schema';
import type { UserRole, SubscriptionTier, SubscriptionStatus, WeddingType, BudgetSegment } from '@/lib/db/schema/enums';

/**
 * Budget category templates by wedding type
 * Percentages are industry-standard allocations of total budget
 */
const BUDGET_TEMPLATES: Record<WeddingType, Array<{
  category: string;
  item: string;
  segment: BudgetSegment;
  percentage: number;
}>> = {
  traditional: [
    { category: 'venue', item: 'Venue & Rentals', segment: 'vendors', percentage: 40 },
    { category: 'catering', item: 'Catering & Bar', segment: 'vendors', percentage: 25 },
    { category: 'photography', item: 'Photography', segment: 'vendors', percentage: 10 },
    { category: 'videography', item: 'Videography', segment: 'vendors', percentage: 5 },
    { category: 'florals', item: 'Florals & Decor', segment: 'vendors', percentage: 8 },
    { category: 'music', item: 'Music & Entertainment', segment: 'artists', percentage: 5 },
    { category: 'attire', item: 'Attire & Beauty', segment: 'other', percentage: 4 },
    { category: 'stationery', item: 'Invitations & Stationery', segment: 'creatives', percentage: 3 },
  ],
  destination: [
    { category: 'venue', item: 'Venue & Rentals', segment: 'vendors', percentage: 25 },
    { category: 'catering', item: 'Catering & Bar', segment: 'vendors', percentage: 15 },
    { category: 'photography', item: 'Photography', segment: 'vendors', percentage: 8 },
    { category: 'videography', item: 'Videography', segment: 'vendors', percentage: 4 },
    { category: 'florals', item: 'Florals & Decor', segment: 'vendors', percentage: 6 },
    { category: 'music', item: 'Music & Entertainment', segment: 'artists', percentage: 4 },
    { category: 'travel', item: 'Travel & Logistics', segment: 'travel', percentage: 20 },
    { category: 'accommodation', item: 'Guest Accommodations', segment: 'accommodation', percentage: 15 },
    { category: 'stationery', item: 'Invitations & Stationery', segment: 'creatives', percentage: 3 },
  ],
  intimate: [
    { category: 'venue', item: 'Venue & Rentals', segment: 'vendors', percentage: 35 },
    { category: 'catering', item: 'Catering & Bar', segment: 'vendors', percentage: 30 },
    { category: 'photography', item: 'Photography', segment: 'vendors', percentage: 15 },
    { category: 'florals', item: 'Florals & Decor', segment: 'vendors', percentage: 10 },
    { category: 'attire', item: 'Attire & Beauty', segment: 'other', percentage: 7 },
    { category: 'stationery', item: 'Invitations & Stationery', segment: 'creatives', percentage: 3 },
  ],
  elopement: [
    { category: 'photography', item: 'Photography', segment: 'vendors', percentage: 30 },
    { category: 'venue', item: 'Venue/Location', segment: 'vendors', percentage: 20 },
    { category: 'attire', item: 'Attire & Beauty', segment: 'other', percentage: 20 },
    { category: 'travel', item: 'Travel & Logistics', segment: 'travel', percentage: 20 },
    { category: 'officiant', item: 'Officiant', segment: 'vendors', percentage: 5 },
    { category: 'florals', item: 'Florals', segment: 'vendors', percentage: 5 },
  ],
  multi_day: [
    { category: 'venue', item: 'Venues (Multiple)', segment: 'vendors', percentage: 30 },
    { category: 'catering', item: 'Catering (Multiple Events)', segment: 'vendors', percentage: 20 },
    { category: 'photography', item: 'Photography', segment: 'vendors', percentage: 10 },
    { category: 'videography', item: 'Videography', segment: 'vendors', percentage: 5 },
    { category: 'florals', item: 'Florals & Decor', segment: 'vendors', percentage: 8 },
    { category: 'music', item: 'Music & Entertainment', segment: 'artists', percentage: 7 },
    { category: 'accommodation', item: 'Guest Accommodations', segment: 'accommodation', percentage: 12 },
    { category: 'stationery', item: 'Invitations & Stationery', segment: 'creatives', percentage: 3 },
    { category: 'other', item: 'Miscellaneous', segment: 'other', percentage: 5 },
  ],
  cultural: [
    { category: 'venue', item: 'Venue & Rentals', segment: 'vendors', percentage: 30 },
    { category: 'catering', item: 'Catering & Bar', segment: 'vendors', percentage: 20 },
    { category: 'photography', item: 'Photography', segment: 'vendors', percentage: 8 },
    { category: 'videography', item: 'Videography', segment: 'vendors', percentage: 5 },
    { category: 'florals', item: 'Florals & Decor', segment: 'vendors', percentage: 8 },
    { category: 'music', item: 'Music & Entertainment', segment: 'artists', percentage: 8 },
    { category: 'attire', item: 'Traditional Attire & Jewelry', segment: 'other', percentage: 10 },
    { category: 'cultural', item: 'Cultural Ceremonies & Rituals', segment: 'vendors', percentage: 8 },
    { category: 'stationery', item: 'Invitations & Stationery', segment: 'creatives', percentage: 3 },
  ],
};

/**
 * Timeline item type for template generation
 */
interface TimelineTemplateItem {
  title: string;
  description?: string;
  startTime: Date;
  durationMinutes: number;
  location?: string;
}

/**
 * Default timeline templates based on wedding type
 * Generates a day-of timeline for the wedding
 */
function generateDefaultTimeline(weddingDate: string, weddingType: WeddingType, venue?: string | null): Array<{
  title: string;
  description?: string;
  startTime: Date;
  endTime?: Date;
  durationMinutes: number;
  location?: string;
}> {
  const baseDate = new Date(weddingDate);

  // Helper to create time on wedding day
  const createTime = (hours: number, minutes: number = 0) => {
    const date = new Date(baseDate);
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const templates: Record<WeddingType, TimelineTemplateItem[]> = {
    traditional: [
      { title: 'Bride Getting Ready', description: 'Hair, makeup, and dress', startTime: createTime(9, 0), durationMinutes: 180, location: 'Bridal Suite' },
      { title: 'Groom Getting Ready', description: 'Suit and preparation', startTime: createTime(11, 0), durationMinutes: 120, location: 'Groom Suite' },
      { title: 'First Look (Optional)', description: 'Private moment before ceremony', startTime: createTime(13, 0), durationMinutes: 30, location: venue || undefined },
      { title: 'Wedding Party Photos', description: 'Bridesmaids, groomsmen, family', startTime: createTime(13, 30), durationMinutes: 90, location: venue || undefined },
      { title: 'Ceremony', description: 'Exchange of vows', startTime: createTime(16, 0), durationMinutes: 45, location: venue || undefined },
      { title: 'Cocktail Hour', description: 'Drinks and appetizers', startTime: createTime(17, 0), durationMinutes: 60, location: venue || undefined },
      { title: 'Reception Entrance', description: 'Grand entrance announcement', startTime: createTime(18, 0), durationMinutes: 15, location: venue || undefined },
      { title: 'First Dance', description: 'Couple\'s first dance', startTime: createTime(18, 15), durationMinutes: 5, location: venue || undefined },
      { title: 'Dinner Service', description: 'Main meal', startTime: createTime(18, 30), durationMinutes: 90, location: venue || undefined },
      { title: 'Speeches & Toasts', description: 'Best man, maid of honor, parents', startTime: createTime(20, 0), durationMinutes: 30, location: venue || undefined },
      { title: 'Cake Cutting', description: 'Traditional cake cutting', startTime: createTime(20, 30), durationMinutes: 15, location: venue || undefined },
      { title: 'Dancing & Party', description: 'Open dance floor', startTime: createTime(20, 45), durationMinutes: 135, location: venue || undefined },
      { title: 'Last Dance & Send Off', description: 'Final dance and farewell', startTime: createTime(23, 0), durationMinutes: 30, location: venue || undefined },
    ],
    destination: [
      { title: 'Welcome Breakfast', description: 'Meet & greet with guests', startTime: createTime(9, 0), durationMinutes: 120, location: 'Hotel Restaurant' },
      { title: 'Bride Getting Ready', description: 'Hair, makeup, and dress', startTime: createTime(12, 0), durationMinutes: 180, location: 'Bridal Suite' },
      { title: 'Groom Getting Ready', description: 'Suit and preparation', startTime: createTime(14, 0), durationMinutes: 120, location: 'Groom Suite' },
      { title: 'Ceremony', description: 'Beach/destination ceremony', startTime: createTime(17, 0), durationMinutes: 45, location: venue || undefined },
      { title: 'Sunset Photos', description: 'Couple photos during golden hour', startTime: createTime(17, 45), durationMinutes: 45, location: venue || undefined },
      { title: 'Reception Dinner', description: 'Outdoor reception', startTime: createTime(19, 0), durationMinutes: 180, location: venue || undefined },
      { title: 'Dancing Under Stars', description: 'Evening celebration', startTime: createTime(22, 0), durationMinutes: 120, location: venue || undefined },
    ],
    intimate: [
      { title: 'Getting Ready Together', description: 'Couple preparation', startTime: createTime(11, 0), durationMinutes: 180 },
      { title: 'Ceremony', description: 'Intimate vow exchange', startTime: createTime(15, 0), durationMinutes: 30, location: venue || undefined },
      { title: 'Photos', description: 'Couple and small group photos', startTime: createTime(15, 30), durationMinutes: 60, location: venue || undefined },
      { title: 'Intimate Dinner', description: 'Private dinner celebration', startTime: createTime(17, 0), durationMinutes: 180, location: venue || undefined },
    ],
    elopement: [
      { title: 'Getting Ready', description: 'Couple preparation', startTime: createTime(8, 0), durationMinutes: 120 },
      { title: 'Travel to Location', description: 'Journey to ceremony spot', startTime: createTime(10, 0), durationMinutes: 60 },
      { title: 'Private Ceremony', description: 'Just the two of you', startTime: createTime(11, 0), durationMinutes: 30, location: venue || undefined },
      { title: 'Adventure Photos', description: 'Exploration and photos', startTime: createTime(11, 30), durationMinutes: 180, location: venue || undefined },
      { title: 'Celebration Dinner', description: 'Private dinner', startTime: createTime(18, 0), durationMinutes: 120 },
    ],
    multi_day: [
      { title: 'Day 1: Welcome Event', description: 'Guest arrival and welcome party', startTime: createTime(18, 0), durationMinutes: 180, location: 'Welcome Venue' },
      { title: 'Day 2: Pre-Wedding Ceremonies', description: 'Traditional ceremonies', startTime: createTime(10, 0), durationMinutes: 480 },
      { title: 'Day 3: Main Wedding', description: 'Main ceremony and reception', startTime: createTime(16, 0), durationMinutes: 420, location: venue || undefined },
      { title: 'Day 4: Farewell Brunch', description: 'Guest farewell', startTime: createTime(10, 0), durationMinutes: 180 },
    ],
    cultural: [
      { title: 'Religious/Cultural Ceremony', description: 'Traditional ceremony', startTime: createTime(10, 0), durationMinutes: 120, location: venue || undefined },
      { title: 'Traditional Lunch', description: 'Cultural meal with family', startTime: createTime(12, 30), durationMinutes: 150 },
      { title: 'Bride Getting Ready', description: 'Traditional attire preparation', startTime: createTime(15, 0), durationMinutes: 180, location: 'Bridal Suite' },
      { title: 'Groom Getting Ready', description: 'Traditional attire preparation', startTime: createTime(16, 0), durationMinutes: 120, location: 'Groom Suite' },
      { title: 'Reception Ceremony', description: 'Evening celebration ceremony', startTime: createTime(18, 30), durationMinutes: 60, location: venue || undefined },
      { title: 'Reception & Dinner', description: 'Celebration dinner', startTime: createTime(19, 30), durationMinutes: 180, location: venue || undefined },
      { title: 'Cultural Performances', description: 'Traditional music and dance', startTime: createTime(22, 30), durationMinutes: 90, location: venue || undefined },
    ],
  };

  const result = templates[weddingType] || templates.traditional;
  return result.map((item: TimelineTemplateItem) => ({
    ...item,
    endTime: new Date(item.startTime.getTime() + item.durationMinutes * 60000),
  }));
}

/**
 * Clients tRPC Router - Drizzle ORM Version
 *
 * Provides CRUD operations for wedding clients with multi-tenant security.
 * All operations verify company_id to ensure users can only access their own company's clients.
 *
 * Migrated from Supabase to Drizzle - December 2025
 */
export const clientsRouter = router({
  /**
   * List all clients for the current company.
   *
   * @requires protectedProcedure - User must be authenticated
   * @param search - Optional search filter for client names
   * @returns Array of clients ordered by wedding date (newest first)
   */
  list: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Security: Verify user has company_id from session claims
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID not found in session',
        });
      }

      // Build base conditions
      const conditions = [
        eq(clients.companyId, ctx.companyId),
        isNull(clients.deletedAt)
      ];

      // Add search filter if provided
      if (input.search) {
        const searchPattern = `%${input.search}%`;
        conditions.push(
          or(
            ilike(clients.partner1FirstName, searchPattern),
            ilike(clients.partner1LastName, searchPattern),
            ilike(clients.partner2FirstName, searchPattern),
            ilike(clients.partner2LastName, searchPattern)
          )!
        );
      }

      const data = await ctx.db
        .select()
        .from(clients)
        .where(and(...conditions))
        .orderBy(desc(clients.weddingDate));

      return data;
    }),

  /**
   * Get a single client by ID.
   *
   * @requires protectedProcedure - User must be authenticated
   * @param id - Client UUID
   * @returns Client object
   * @throws NOT_FOUND if client doesn't exist or doesn't belong to user's company
   */
  getById: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Security: Verify user has company_id
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID not found in session',
        });
      }

      const [data] = await ctx.db
        .select()
        .from(clients)
        .where(
          and(
            eq(clients.id, input.id),
            eq(clients.companyId, ctx.companyId),
            isNull(clients.deletedAt)
          )
        )
        .limit(1);

      if (!data) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Client not found',
        });
      }

      return data;
    }),

  /**
   * Create a new wedding client.
   *
   * @requires adminProcedure - User must be company_admin or super_admin
   * @param input - Client creation data
   * @returns Created client object
   */
  create: adminProcedure
    .input(
      z.object({
        // Partner 1 (Bride) details
        partner1_first_name: z.string().min(1),
        partner1_last_name: z.string().optional(), // Allow empty/missing last name for single-name entries
        partner1_email: z.string().email(),
        partner1_phone: z.string().optional(),
        partner1_father_name: z.string().optional(),
        partner1_mother_name: z.string().optional(),
        // Partner 2 (Groom) details
        partner2_first_name: z.string().optional(),
        partner2_last_name: z.string().optional(),
        partner2_email: z.string().email().optional().or(z.literal('')),
        partner2_phone: z.string().optional(),
        partner2_father_name: z.string().optional(),
        partner2_mother_name: z.string().optional(),
        // Wedding details
        wedding_name: z.string().optional(),
        wedding_date: z.string().optional(),
        venue: z.string().optional(),
        budget: z.number().positive().optional(),
        guest_count: z.number().int().positive().optional(),
        notes: z.string().optional(),
        // Planning context
        planning_side: z.enum(['bride_side', 'groom_side', 'both']).optional(),
        wedding_type: z.enum(['traditional', 'destination', 'intimate', 'elopement', 'multi_day', 'cultural']).optional(),
        // Vendors - comma-separated list with optional category prefix
        // Format: "Category: Vendor Name" or just "Vendor Name"
        // e.g., "Venue: Grand Hotel, Catering: Tasty Foods, Photography: Picture Perfect"
        vendors: z.string().optional(),
      }).transform((data) => ({
        ...data,
        partner1_last_name: data.partner1_last_name === '' ? null : data.partner1_last_name,
        partner2_email: data.partner2_email === '' ? null : data.partner2_email,
        partner2_phone: data.partner2_phone === '' ? null : data.partner2_phone,
        partner1_phone: data.partner1_phone === '' ? null : data.partner1_phone,
        partner1_father_name: data.partner1_father_name === '' ? null : data.partner1_father_name,
        partner1_mother_name: data.partner1_mother_name === '' ? null : data.partner1_mother_name,
        partner2_father_name: data.partner2_father_name === '' ? null : data.partner2_father_name,
        partner2_mother_name: data.partner2_mother_name === '' ? null : data.partner2_mother_name,
        wedding_name: data.wedding_name === '' ? null : data.wedding_name,
        venue: data.venue === '' ? null : data.venue,
        notes: data.notes === '' ? null : data.notes,
      }))
    )
    .mutation(async ({ ctx, input }) => {
      // Security: Verify user has company_id
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID not found in session',
        });
      }

      if (!ctx.userId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'User ID not found',
        });
      }

      // Get database user UUID from auth user ID
      let [user] = await ctx.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.authId, ctx.userId))
        .limit(1);

      // Track if we did self-healing
      let usedSelfHeal = false;
      let effectiveCompanyId = ctx.companyId;

      // Self-healing: If user not found in custom users table, create from BetterAuth session
      // With BetterAuth, user exists in the 'user' table but may need sync to custom 'users' table
      if (!user) {
        usedSelfHeal = true;
        console.log('[Clients Router] User not found in custom users table, syncing from BetterAuth session...');

        // Get user details from BetterAuth session (ctx.user is set in tRPC context)
        const sessionUser = ctx.user;
        if (!sessionUser) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Session user not available for self-heal',
          });
        }

        const email = sessionUser.email || '';
        const firstName = sessionUser.name?.split(' ')[0] || 'User';

        // Determine role from session or default
        const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
        const isSuperAdmin = email === superAdminEmail;
        const role: UserRole = (sessionUser as any).role || (isSuperAdmin ? 'super_admin' : 'company_admin');

        // Check if company_id from session claims exists
        if (effectiveCompanyId) {
          const [existingCompany] = await ctx.db
            .select({ id: companies.id })
            .from(companies)
            .where(eq(companies.id, effectiveCompanyId))
            .limit(1);

          if (!existingCompany) {
            console.log('[Clients Router] Company from session does not exist, creating new one...');
            effectiveCompanyId = ''; // Will create new company below
          }
        }

        // Create company if needed
        if (!effectiveCompanyId) {
          const companyName = `${firstName}'s Company`;
          const subdomain = `company${ctx.userId.replace(/[^a-z0-9]/gi, '').slice(0, 8).toLowerCase()}`;

          const [newCompany] = await ctx.db
            .insert(companies)
            .values({
              name: companyName,
              subdomain,
              subscriptionTier: 'free' as SubscriptionTier,
              subscriptionStatus: 'trialing' as SubscriptionStatus,
              trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            })
            .returning({ id: companies.id });

          if (!newCompany) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Failed to create company for user',
            });
          }

          effectiveCompanyId = newCompany.id;
          console.log('[Clients Router] Created new company:', effectiveCompanyId);
        }

        // Create user in custom users table (sync from BetterAuth)
        await ctx.db
          .insert(users)
          .values({
            authId: ctx.userId, // BetterAuth user ID
            email,
            firstName: firstName,
            lastName: sessionUser.name?.split(' ').slice(1).join(' ') || null,
            avatarUrl: sessionUser.image || null,
            role,
            companyId: effectiveCompanyId,
            isActive: true,
          });

        console.log('[Clients Router] Self-heal complete - user synced with company_id:', effectiveCompanyId);

        // Get the newly created user
        const [newUser] = await ctx.db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.authId, ctx.userId))
          .limit(1);

        if (!newUser) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to retrieve newly synced user',
          });
        }

        user = newUser;
      }

      // Create client
      const [data] = await ctx.db
        .insert(clients)
        .values({
          companyId: effectiveCompanyId,
          partner1FirstName: input.partner1_first_name,
          partner1LastName: input.partner1_last_name || null,
          partner1Email: input.partner1_email,
          partner1Phone: input.partner1_phone || null,
          partner1FatherName: input.partner1_father_name || null,
          partner1MotherName: input.partner1_mother_name || null,
          partner2FirstName: input.partner2_first_name || null,
          partner2LastName: input.partner2_last_name || null,
          partner2Email: input.partner2_email || null,
          partner2Phone: input.partner2_phone || null,
          partner2FatherName: input.partner2_father_name || null,
          partner2MotherName: input.partner2_mother_name || null,
          weddingName: input.wedding_name || null,
          weddingDate: input.wedding_date || null,
          venue: input.venue || null,
          budget: input.budget?.toString() || null,
          guestCount: input.guest_count || null,
          status: 'planning',
          notes: input.notes || null,
          planningSide: input.planning_side || 'both',
          weddingType: input.wedding_type || 'traditional',
          createdBy: user.id,
          metadata: {},
        })
        .returning();

      if (!data) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create client',
        });
      }

      // If we used self-heal, remind user to refresh for new JWT
      if (usedSelfHeal) {
        console.log('[Clients Router] Client created via self-heal. User should refresh page to get new JWT.');
      }

      // Auto-create "Main Wedding" event if wedding_date is provided
      let mainEventId: string | null = null;
      if (data && input.wedding_date) {
        const eventTitle = input.wedding_name ||
          `${input.partner1_first_name}${input.partner2_first_name ? ` & ${input.partner2_first_name}` : ''}'s Wedding`;

        try {
          const [createdEvent] = await ctx.db
            .insert(events)
            .values({
              clientId: data.id,
              title: eventTitle,
              eventType: 'Wedding',
              eventDate: input.wedding_date,
              venueName: input.venue || null,
              guestCount: input.guest_count || null,
              status: 'planned',
              notes: input.notes || null,
              description: `Main wedding ceremony for ${eventTitle}`,
            })
            .returning({ id: events.id });

          if (createdEvent) {
            mainEventId = createdEvent.id;
          }
          console.log('[Clients Router] Auto-created Main Wedding event for client:', data.id, 'eventId:', mainEventId);
        } catch (eventError) {
          // Log but don't fail - client creation succeeded
          console.error('[Clients Router] Failed to auto-create wedding event:', eventError);
        }
      }

      // Auto-populate budget categories based on wedding type and budget amount
      if (data && input.budget && input.budget > 0) {
        const weddingType = (input.wedding_type || 'traditional') as WeddingType;
        const budgetTemplate = BUDGET_TEMPLATES[weddingType] || BUDGET_TEMPLATES.traditional;

        try {
          const budgetItems = budgetTemplate.map((item, index) => ({
            clientId: data.id,
            category: item.category,
            segment: item.segment,
            item: item.item,
            estimatedCost: ((input.budget! * item.percentage) / 100).toFixed(2),
            paidAmount: '0',
            paymentStatus: 'pending',
            clientVisible: true,
            notes: `Auto-generated based on ${weddingType} wedding budget allocation`,
          }));

          await ctx.db.insert(budget).values(budgetItems);
          console.log('[Clients Router] Auto-created', budgetItems.length, 'budget categories for client:', data.id);
        } catch (budgetError) {
          // Log but don't fail - client creation succeeded
          console.error('[Clients Router] Failed to auto-create budget categories:', budgetError);
        }
      }

      // Auto-generate timeline based on wedding type and date
      if (data && input.wedding_date) {
        const weddingType = (input.wedding_type || 'traditional') as WeddingType;

        try {
          const timelineItems = generateDefaultTimeline(input.wedding_date, weddingType, input.venue);

          const timelineEntries = timelineItems.map((item, index) => ({
            clientId: data.id,
            title: item.title,
            description: item.description || null,
            startTime: item.startTime,
            endTime: item.endTime || null,
            durationMinutes: item.durationMinutes,
            location: item.location || null,
            completed: false,
            sortOrder: index,
            notes: `Auto-generated ${weddingType} wedding timeline`,
          }));

          await ctx.db.insert(timeline).values(timelineEntries);
          console.log('[Clients Router] Auto-created', timelineEntries.length, 'timeline items for client:', data.id);
        } catch (timelineError) {
          // Log but don't fail - client creation succeeded
          console.error('[Clients Router] Failed to auto-create timeline:', timelineError);
        }
      }

      // Auto-create vendors from comma-separated list
      // Format: "Category: Vendor Name" or just "Vendor Name"
      // e.g., "Venue: Grand Hotel, Catering: Tasty Foods, Photography"
      if (data && input.vendors && input.vendors.trim()) {
        try {
          // Parse vendor entries - each can be "Category: Name" or just "Name"
          const vendorEntries = input.vendors
            .split(',')
            .map(entry => entry.trim())
            .filter(entry => entry.length > 0);

          // Get event title for budget category
          const budgetCategory = mainEventId
            ? (input.wedding_name || `${input.partner1_first_name}'s Wedding`)
            : 'Unassigned';

          // Category mapping for recognized keywords
          const categoryKeywords: Record<string, string> = {
            'venue': 'venue',
            'catering': 'catering',
            'caterer': 'catering',
            'food': 'catering',
            'photo': 'photography',
            'photography': 'photography',
            'photographer': 'photography',
            'video': 'videography',
            'videography': 'videography',
            'videographer': 'videography',
            'floral': 'florals',
            'florals': 'florals',
            'florist': 'florals',
            'flowers': 'florals',
            'decor': 'decor',
            'decoration': 'decor',
            'music': 'music',
            'band': 'music',
            'dj': 'dj',
            'transport': 'transportation',
            'transportation': 'transportation',
            'car': 'transportation',
            'hotel': 'accommodation',
            'accommodation': 'accommodation',
            'beauty': 'beauty',
            'makeup': 'beauty',
            'hair': 'beauty',
            'cake': 'bakery',
            'bakery': 'bakery',
            'entertainment': 'entertainment',
            'rentals': 'rentals',
            'stationery': 'stationery',
            'invitation': 'stationery',
          };

          const createdVendors: string[] = [];

          for (const entry of vendorEntries) {
            let category = 'other';
            let vendorName = entry;

            // Check if entry has "Category: Name" format
            if (entry.includes(':')) {
              const [catPart, namePart] = entry.split(':').map(s => s.trim());
              vendorName = namePart || catPart;

              // Try to match category
              const catLower = catPart.toLowerCase();
              for (const [keyword, cat] of Object.entries(categoryKeywords)) {
                if (catLower.includes(keyword)) {
                  category = cat;
                  break;
                }
              }
            } else {
              // Try to infer category from vendor name
              const nameLower = entry.toLowerCase();
              for (const [keyword, cat] of Object.entries(categoryKeywords)) {
                if (nameLower.includes(keyword)) {
                  category = cat;
                  break;
                }
              }
            }

            if (!vendorName) continue;

            try {
              // Create vendor in vendors table
              const [vendor] = await ctx.db
                .insert(vendors)
                .values({
                  companyId: effectiveCompanyId,
                  name: vendorName,
                  category: category,
                  isPreferred: false,
                })
                .returning();

              if (vendor) {
                // Create client_vendor relationship
                await ctx.db
                  .insert(clientVendors)
                  .values({
                    clientId: data.id,
                    vendorId: vendor.id,
                    eventId: mainEventId,
                    paymentStatus: 'pending',
                    approvalStatus: 'pending',
                  });

                // Auto-create budget item for this vendor (seamless module integration)
                await ctx.db.insert(budget).values({
                  clientId: data.id,
                  vendorId: vendor.id,
                  eventId: mainEventId,
                  category: budgetCategory,
                  segment: 'vendors',
                  item: vendorName,
                  estimatedCost: '0',
                  actualCost: null,
                  paidAmount: '0',
                  paymentStatus: 'pending',
                  clientVisible: true,
                  isLumpSum: false,
                  notes: `Auto-created from vendor: ${vendorName}`,
                });

                createdVendors.push(vendorName);
              }
            } catch (vendorErr) {
              console.warn(`[Clients Router] Failed to create vendor "${vendorName}":`, vendorErr);
            }
          }

          if (createdVendors.length > 0) {
            console.log('[Clients Router] Auto-created', createdVendors.length, 'vendors for client:', data.id, createdVendors);
          }
        } catch (vendorsError) {
          // Log but don't fail - client creation succeeded
          console.error('[Clients Router] Failed to auto-create vendors:', vendorsError);
        }
      }

      return data;
    }),

  /**
   * Update an existing client.
   *
   * @requires adminProcedure - User must be company_admin or super_admin
   * @param input - Client update data
   * @returns Updated client object
   * @throws NOT_FOUND if client doesn't exist or doesn't belong to user's company
   */
  update: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        partner1_first_name: z.string().min(1).optional(),
        partner1_last_name: z.string().optional(),
        partner1_email: z.string().email().optional(),
        partner1_phone: z.string().optional(),
        partner1_father_name: z.string().optional(),
        partner1_mother_name: z.string().optional(),
        partner2_first_name: z.string().optional(),
        partner2_last_name: z.string().optional(),
        partner2_email: z.string().email().optional().or(z.literal('')),
        partner2_phone: z.string().optional(),
        partner2_father_name: z.string().optional(),
        partner2_mother_name: z.string().optional(),
        wedding_name: z.string().optional(),
        wedding_date: z.string().optional(),
        venue: z.string().optional(),
        budget: z.number().positive().optional(),
        guest_count: z.number().int().positive().optional(),
        status: z.enum(['draft', 'planning', 'confirmed', 'in_progress', 'completed']).optional(),
        notes: z.string().optional(),
        // Planning context
        planning_side: z.enum(['bride_side', 'groom_side', 'both']).optional(),
        wedding_type: z.enum(['traditional', 'destination', 'intimate', 'elopement', 'multi_day', 'cultural']).optional(),
      }).transform((data) => ({
        ...data,
        partner2_email: data.partner2_email === '' ? null : data.partner2_email,
        partner2_phone: data.partner2_phone === '' ? null : data.partner2_phone,
        partner1_phone: data.partner1_phone === '' ? null : data.partner1_phone,
        partner1_father_name: data.partner1_father_name === '' ? null : data.partner1_father_name,
        partner1_mother_name: data.partner1_mother_name === '' ? null : data.partner1_mother_name,
        partner2_father_name: data.partner2_father_name === '' ? null : data.partner2_father_name,
        partner2_mother_name: data.partner2_mother_name === '' ? null : data.partner2_mother_name,
        wedding_name: data.wedding_name === '' ? null : data.wedding_name,
        venue: data.venue === '' ? null : data.venue,
        notes: data.notes === '' ? null : data.notes,
      }))
    )
    .mutation(async ({ ctx, input }) => {
      // Security: Verify user has company_id
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID not found in session',
        });
      }

      // First verify client exists and belongs to user's company
      const [existingClient] = await ctx.db
        .select({ id: clients.id })
        .from(clients)
        .where(
          and(
            eq(clients.id, input.id),
            eq(clients.companyId, ctx.companyId)
          )
        )
        .limit(1);

      if (!existingClient) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Client not found',
        });
      }

      // Build update object with only provided fields
      const updateData: Record<string, any> = {};
      if (input.partner1_first_name !== undefined) updateData.partner1FirstName = input.partner1_first_name;
      if (input.partner1_last_name !== undefined) updateData.partner1LastName = input.partner1_last_name;
      if (input.partner1_email !== undefined) updateData.partner1Email = input.partner1_email;
      if (input.partner1_phone !== undefined) updateData.partner1Phone = input.partner1_phone;
      if (input.partner1_father_name !== undefined) updateData.partner1FatherName = input.partner1_father_name;
      if (input.partner1_mother_name !== undefined) updateData.partner1MotherName = input.partner1_mother_name;
      if (input.partner2_first_name !== undefined) updateData.partner2FirstName = input.partner2_first_name;
      if (input.partner2_last_name !== undefined) updateData.partner2LastName = input.partner2_last_name;
      if (input.partner2_email !== undefined) updateData.partner2Email = input.partner2_email;
      if (input.partner2_phone !== undefined) updateData.partner2Phone = input.partner2_phone;
      if (input.partner2_father_name !== undefined) updateData.partner2FatherName = input.partner2_father_name;
      if (input.partner2_mother_name !== undefined) updateData.partner2MotherName = input.partner2_mother_name;
      if (input.wedding_name !== undefined) updateData.weddingName = input.wedding_name;
      if (input.wedding_date !== undefined) updateData.weddingDate = input.wedding_date;
      if (input.venue !== undefined) updateData.venue = input.venue;
      if (input.budget !== undefined) updateData.budget = input.budget.toString();
      if (input.guest_count !== undefined) updateData.guestCount = input.guest_count;
      if (input.status !== undefined) updateData.status = input.status;
      if (input.notes !== undefined) updateData.notes = input.notes;
      if (input.planning_side !== undefined) updateData.planningSide = input.planning_side;
      if (input.wedding_type !== undefined) updateData.weddingType = input.wedding_type;
      updateData.updatedAt = new Date();

      const [data] = await ctx.db
        .update(clients)
        .set(updateData)
        .where(
          and(
            eq(clients.id, input.id),
            eq(clients.companyId, ctx.companyId)
          )
        )
        .returning();

      if (!data) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update client',
        });
      }

      // Sync wedding details to main event if wedding-related fields were updated
      const weddingFieldsUpdated = input.wedding_date !== undefined ||
        input.venue !== undefined ||
        input.guest_count !== undefined ||
        input.wedding_name !== undefined;

      if (weddingFieldsUpdated) {
        // Find the main wedding event (event_type = 'Wedding') for this client
        const [mainEvent] = await ctx.db
          .select({ id: events.id })
          .from(events)
          .where(
            and(
              eq(events.clientId, input.id),
              eq(events.eventType, 'Wedding'),
              isNull(events.deletedAt)
            )
          )
          .limit(1);

        if (mainEvent) {
          // Update existing main event with new wedding details
          const eventUpdate: Record<string, any> = {};
          if (input.wedding_date !== undefined) eventUpdate.eventDate = input.wedding_date;
          if (input.venue !== undefined) eventUpdate.venueName = input.venue;
          if (input.guest_count !== undefined) eventUpdate.guestCount = input.guest_count;
          if (input.wedding_name !== undefined) {
            eventUpdate.title = input.wedding_name || data.weddingName ||
              `${data.partner1FirstName}${data.partner2FirstName ? ` & ${data.partner2FirstName}` : ''}'s Wedding`;
          }

          try {
            await ctx.db
              .update(events)
              .set(eventUpdate)
              .where(eq(events.id, mainEvent.id));

            console.log('[Clients Router] Synced wedding details to main event:', mainEvent.id);
          } catch (eventUpdateError) {
            console.error('[Clients Router] Failed to sync wedding details to event:', eventUpdateError);
          }
        } else if (input.wedding_date) {
          // No main event exists but wedding_date was provided - create one
          const eventTitle = input.wedding_name || data.weddingName ||
            `${data.partner1FirstName}${data.partner2FirstName ? ` & ${data.partner2FirstName}` : ''}'s Wedding`;

          try {
            await ctx.db
              .insert(events)
              .values({
                clientId: input.id,
                title: eventTitle,
                eventType: 'Wedding',
                eventDate: input.wedding_date, // Already checked that input.wedding_date is defined above
                venueName: input.venue || data.venue || undefined,
                guestCount: input.guest_count || data.guestCount || undefined,
                status: 'planned',
                description: `Main wedding ceremony for ${eventTitle}`,
              });

            console.log('[Clients Router] Created main wedding event during client update');
          } catch (eventCreateError) {
            console.error('[Clients Router] Failed to create wedding event during update:', eventCreateError);
          }
        }
      }

      return data;
    }),

  /**
   * Delete a client (soft delete).
   *
   * @requires adminProcedure - User must be company_admin or super_admin
   * @param id - Client UUID
   * @returns Success status
   * @throws NOT_FOUND if client doesn't exist or doesn't belong to user's company
   */
  delete: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Security: Verify user has company_id
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID not found in session',
        });
      }

      // First verify client exists and belongs to user's company
      const [existingClient] = await ctx.db
        .select({ id: clients.id })
        .from(clients)
        .where(
          and(
            eq(clients.id, input.id),
            eq(clients.companyId, ctx.companyId)
          )
        )
        .limit(1);

      if (!existingClient) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Client not found',
        });
      }

      // Soft delete: Set deleted_at timestamp
      await ctx.db
        .update(clients)
        .set({ deletedAt: new Date() })
        .where(
          and(
            eq(clients.id, input.id),
            eq(clients.companyId, ctx.companyId)
          )
        );

      return { success: true };
    }),

  /**
   * Alias for list - for backward compatibility and convention
   */
  getAll: protectedProcedure
    .query(async ({ ctx }) => {
      // Security: Verify user has company_id from session claims
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID not found in session',
        });
      }

      const data = await ctx.db
        .select()
        .from(clients)
        .where(
          and(
            eq(clients.companyId, ctx.companyId),
            isNull(clients.deletedAt)
          )
        )
        .orderBy(desc(clients.weddingDate));

      return data;
    }),

  /**
   * Get portal profile - for client_user role
   * Returns user info, client relationship, and client details
   */
  getPortalProfile: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.userId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }

      // Get user record
      const [user] = await ctx.db
        .select({
          id: users.id,
          authId: users.authId,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          avatarUrl: users.avatarUrl,
          role: users.role,
          preferredLanguage: users.preferredLanguage,
          timezone: users.timezone,
        })
        .from(users)
        .where(eq(users.authId, ctx.userId))
        .limit(1);

      if (!user) {
        return null;
      }

      // Get client_user relationship
      const [clientUserLink] = await ctx.db
        .select({
          clientId: clientUsers.clientId,
          relationship: clientUsers.relationship,
          isPrimary: clientUsers.isPrimary,
        })
        .from(clientUsers)
        .where(eq(clientUsers.userId, user.id))
        .limit(1);

      if (!clientUserLink) {
        return {
          user: {
            id: user.id,
            email: user.email,
            first_name: user.firstName,
            last_name: user.lastName,
            avatar_url: user.avatarUrl,
            preferred_language: user.preferredLanguage,
            timezone: user.timezone,
          },
          client: null,
          relationship: null,
          isPrimary: false,
        };
      }

      // Get client details
      const [client] = await ctx.db
        .select()
        .from(clients)
        .where(eq(clients.id, clientUserLink.clientId))
        .limit(1);

      return {
        user: {
          id: user.id,
          email: user.email,
          first_name: user.firstName,
          last_name: user.lastName,
          avatar_url: user.avatarUrl,
          preferred_language: user.preferredLanguage,
          timezone: user.timezone,
        },
        client: client ? {
          wedding_date: client.weddingDate,
          venue: client.venue,
          guest_count: client.guestCount,
          partner1_first_name: client.partner1FirstName,
          partner1_last_name: client.partner1LastName,
          partner1_email: client.partner1Email,
          partner2_first_name: client.partner2FirstName,
          partner2_last_name: client.partner2LastName,
          partner2_email: client.partner2Email,
        } : null,
        relationship: clientUserLink.relationship,
        isPrimary: clientUserLink.isPrimary,
      };
    }),
});
