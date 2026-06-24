import { router, protectedProcedure, adminProcedure } from '@/server/trpc/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq, and, isNull, desc, ilike, or, inArray } from 'drizzle-orm';
import {
  clients, user as userTable, companies, events, clientUsers, budget, timeline, vendors, clientVendors,
  guests, hotels, guestTransport, documents, floorPlans, floorPlanTables, floorPlanGuests,
  gifts, giftsEnhanced, guestGifts, messages, payments, weddingWebsites, activity,
  documentAuditTrail, documentSignatureFields, documentSigners, documentSignatureRequests,
  teamClientAssignments,
  // Additional client-cascade child tables (must be hard-deleted here because the
  // client row is soft-deleted, so the DB FK onDelete:cascade never fires).
  vendorReviews, generatedReports, emailLogs, smsLogs, whatsappLogs, creativeJobs,
  websiteBuilderPages, qrCodes, invoices, accommodations
} from '@/lib/db/schema';
import { assertClientAccess } from '@/server/trpc/client-access';
import type { SubscriptionTier, SubscriptionStatus } from '@/lib/db/schema/enums';
import { withTransaction } from '@/features/chatbot/server/services/transaction-wrapper';
import { broadcastSync } from '@/lib/realtime/broadcast-sync';
import { recalcClientStats } from '@/lib/sync/client-stats-sync';
import { createEventWithTimeline, shiftEventTimelineForDateChange } from '@/lib/sync/event-timeline-sync';
import {
  CLIENT_CREATE_BASE_PATHS,
  CLIENT_CREATE_EVENT_PATHS,
  CLIENT_CREATE_VENDOR_PATHS,
  CLIENT_UPDATE_PATHS,
} from '@/lib/sync/cascade-query-paths';

// NOTE: The legacy `generateDefaultTimeline` helper and its TimelineTemplateItem
// interface were removed. Timeline generation now lives in the canonical
// `createEventWithTimeline` helper (@/lib/sync/event-timeline-sync), which every
// event-creation path (events router, this router, chatbot) shares.

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

      // Staff see ONLY clients they're assigned to (admins see all company clients)
      if (ctx.role === 'staff' && ctx.userId) {
        conditions.push(
          inArray(
            clients.id,
            ctx.db
              .select({ id: teamClientAssignments.clientId })
              .from(teamClientAssignments)
              .where(eq(teamClientAssignments.teamMemberId, ctx.userId))
          )
        );
      }

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

      // Staff may only open clients they're assigned to
      if (ctx.role === 'staff') {
        await assertClientAccess(ctx, input.id);
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
        // When true, skip auto-creating "Main Wedding" event and vendors in the router.
        // The form's onSuccess handles per-event creation from eventBriefs instead.
        skipAutoCreation: z.boolean().optional(),
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

      // Get user record from BetterAuth user table
      let [dbUser] = await ctx.db
        .select({ id: userTable.id })
        .from(userTable)
        .where(eq(userTable.id, ctx.userId))
        .limit(1);

      // Track if we did self-healing
      let usedSelfHeal = false;
      let effectiveCompanyId = ctx.companyId;

      // Self-healing: If user not found in BetterAuth user table, something is seriously wrong
      // The BetterAuth user table should always have the user record since auth creates it
      if (!dbUser) {
        usedSelfHeal = true;
        console.log('[Clients Router] User not found in BetterAuth user table, attempting self-heal...');

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

        // Update the BetterAuth user table with companyId if it was missing or changed
        await ctx.db
          .update(userTable)
          .set({ companyId: effectiveCompanyId })
          .where(eq(userTable.id, ctx.userId));

        console.log('[Clients Router] Self-heal complete - user updated with company_id:', effectiveCompanyId);

        // Re-fetch the user record
        const [refreshedUser] = await ctx.db
          .select({ id: userTable.id })
          .from(userTable)
          .where(eq(userTable.id, ctx.userId))
          .limit(1);

        if (!refreshedUser) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'User not found in BetterAuth user table after self-heal',
          });
        }

        dbUser = refreshedUser;
      }

      // Wrap all writes in a transaction for atomicity
      const data = await ctx.db.transaction(async (tx) => {
        // Create client
        const [client] = await tx
          .insert(clients)
          .values({
            id: crypto.randomUUID(),
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
            createdBy: dbUser.id,
            metadata: {},
          })
          .returning();

        if (!client) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create client',
          });
        }

        // If we used self-heal, remind user to refresh for new JWT
        if (usedSelfHeal) {
          console.log('[Clients Router] Client created via self-heal. User should refresh page to get new JWT.');
        }

        // Auto-create "Main Wedding" event and vendors unless the form handles per-event creation
        let mainEventId: string | null = null;
        if (!input.skipAutoCreation && input.wedding_date) {
          const eventTitle = input.wedding_name ||
            `${input.partner1_first_name}${input.partner2_first_name ? ` & ${input.partner2_first_name}` : ''}'s Wedding`;

          try {
            // Canonical create: event + template-generated timeline items, with
            // companyId set (fixes prior NULL-tenant + empty-timeline bugs).
            const { eventId } = await createEventWithTimeline(tx, {
              clientId: client.id,
              companyId: effectiveCompanyId,
              title: eventTitle,
              eventType: 'Wedding',
              eventDate: input.wedding_date,
              venueName: input.venue || null,
              guestCount: input.guest_count || null,
              status: 'planned',
              notes: input.notes || null,
              description: `Main wedding ceremony for ${eventTitle}`,
            });
            mainEventId = eventId;
            console.log('[Clients Router] Auto-created Main Wedding event + timeline for client:', client.id, 'eventId:', mainEventId);
          } catch (eventError) {
            // Log but don't fail - client creation succeeded
            console.error('[Clients Router] Failed to auto-create wedding event:', eventError);
          }
        }


      // NOTE: Timeline items are generated by createEventWithTimeline above (per-event templates).
      // They are now generated per-event when events are created via the events router.
      // This allows for date-specific and event-type-specific timelines.

        // Auto-create vendors from comma-separated list
        // Format: "Category: Vendor Name" or just "Vendor Name"
        // e.g., "Venue: Grand Hotel, Catering: Tasty Foods, Photography"
        if (!input.skipAutoCreation && input.vendors && input.vendors.trim()) {
          try {
            // Parse vendor entries - each can be "Category: Name" or just "Name"
            const vendorEntries = input.vendors
              .split(',')
              .map(entry => entry.trim())
              .filter(entry => entry.length > 0);

            // Use "Wedding" as category since this is the auto-created main wedding event
            const budgetCategory = mainEventId ? 'Wedding' : 'Unassigned';

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
                const [vendor] = await tx
                  .insert(vendors)
                  .values({
                    id: crypto.randomUUID(),
                    companyId: effectiveCompanyId,
                    name: vendorName,
                    category: category,
                    isPreferred: false,
                  })
                  .returning();

                if (vendor) {
                  // Create client_vendor relationship
                  await tx
                    .insert(clientVendors)
                    .values({
                      id: crypto.randomUUID(),
                      clientId: client.id,
                      vendorId: vendor.id,
                      companyId: effectiveCompanyId,
                      eventId: mainEventId,
                      paymentStatus: 'pending',
                      approvalStatus: 'pending',
                    });

                  // Auto-create budget item for this vendor (seamless module integration)
                  await tx.insert(budget).values({
                    id: crypto.randomUUID(),
                    clientId: client.id,
                    companyId: effectiveCompanyId,
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
            console.log('[Clients Router] Auto-created', createdVendors.length, 'vendors for client:', client.id, createdVendors);
          }
        } catch (vendorsError) {
          // Log but don't fail - client creation succeeded
          console.error('[Clients Router] Failed to auto-create vendors:', vendorsError);
        }
      }

        // Recalculate client cached budget total (from auto-generated budget categories)
        await recalcClientStats(tx, client.id);

        return client;
      });

      // Broadcast real-time sync after successful transaction.
      // Cascade paths sourced from the shared cascade-query-paths constants so
      // the chatbot's create_client invalidation set can never drift from this.
      const queryPaths = new Set<string>(CLIENT_CREATE_BASE_PATHS);
      if (!input.skipAutoCreation && input.wedding_date) {
        // Auto-created wedding event + its timeline
        CLIENT_CREATE_EVENT_PATHS.forEach((p) => queryPaths.add(p));
      }
      if (!input.skipAutoCreation && input.vendors?.trim()) {
        // Auto-created vendors + budget items (+ timeline)
        CLIENT_CREATE_VENDOR_PATHS.forEach((p) => queryPaths.add(p));
      }

      await broadcastSync({
        type: 'insert',
        module: 'clients',
        entityId: data.id,
        companyId: effectiveCompanyId,
        clientId: data.id,
        userId: ctx.userId,
        queryPaths: Array.from(queryPaths),
      });

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
      const updateData: Partial<typeof clients.$inferInsert> = {};
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

      // Capture companyId before callback (TS narrowing doesn't cross async boundaries)
      const companyId = ctx.companyId;

      // Wrap all writes in a transaction for atomicity
      const data = await ctx.db.transaction(async (tx) => {
        const [result] = await tx
          .update(clients)
          .set(updateData)
          .where(
            and(
              eq(clients.id, input.id),
              eq(clients.companyId, companyId)
            )
          )
          .returning();

        if (!result) {
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
          // Find the main wedding event (event_type = 'Wedding') for this client.
          // Capture old date/time so we can shift linked timeline items on a date change.
          const [mainEvent] = await tx
            .select({ id: events.id, eventDate: events.eventDate, startTime: events.startTime })
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
            const eventUpdate: Partial<typeof events.$inferInsert> = {};
            if (input.wedding_date !== undefined) eventUpdate.eventDate = input.wedding_date;
            if (input.venue !== undefined) eventUpdate.venueName = input.venue;
            if (input.guest_count !== undefined) eventUpdate.guestCount = input.guest_count;
            if (input.wedding_name !== undefined) {
              eventUpdate.title = input.wedding_name || result.weddingName ||
                `${result.partner1FirstName}${result.partner2FirstName ? ` & ${result.partner2FirstName}` : ''}'s Wedding`;
            }

            try {
              await tx
                .update(events)
                .set(eventUpdate)
                .where(eq(events.id, mainEvent.id));

              // Shift the linked timeline items when the wedding date changes so the
              // auto-generated wedding timeline moves with the wedding (preserves offsets).
              if (input.wedding_date !== undefined) {
                const shifted = await shiftEventTimelineForDateChange(tx, mainEvent.id, {
                  oldEventDate: mainEvent.eventDate,
                  oldStartTime: mainEvent.startTime,
                  newEventDate: input.wedding_date,
                });
                console.log('[Clients Router] Synced wedding details to main event:', mainEvent.id, '— timeline items shifted:', shifted);
              } else {
                console.log('[Clients Router] Synced wedding details to main event:', mainEvent.id);
              }
            } catch (eventUpdateError) {
              console.error('[Clients Router] Failed to sync wedding details to event:', eventUpdateError);
            }
          } else if (input.wedding_date) {
            // No main event exists but wedding_date was provided - create one
            // (+ its timeline) via the canonical helper, with companyId set.
            const eventTitle = input.wedding_name || result.weddingName ||
              `${result.partner1FirstName}${result.partner2FirstName ? ` & ${result.partner2FirstName}` : ''}'s Wedding`;

            try {
              await createEventWithTimeline(tx, {
                clientId: input.id,
                companyId: ctx.companyId!,
                title: eventTitle,
                eventType: 'Wedding',
                eventDate: input.wedding_date,
                venueName: input.venue || result.venue || null,
                guestCount: input.guest_count ?? result.guestCount ?? null,
                status: 'planned',
                description: `Main wedding ceremony for ${eventTitle}`,
              });

              console.log('[Clients Router] Created main wedding event + timeline during client update');
            } catch (eventCreateError) {
              console.error('[Clients Router] Failed to create wedding event during update:', eventCreateError);
            }
          }
        }

        return result;
      });

      // Broadcast real-time sync
      await broadcastSync({
        type: 'update',
        module: 'clients',
        entityId: input.id,
        companyId: ctx.companyId!,
        clientId: input.id,
        userId: ctx.userId!,
        queryPaths: [...CLIENT_UPDATE_PATHS],
      });

      return data;
    }),

  /**
   * Delete a client with comprehensive cascade cleanup (soft delete).
   *
   * This operation runs in a transaction to ensure atomic cleanup of:
   * - Client record (soft delete)
   * - All related module data (timeline, events, guests, hotels, transport, etc.)
   *
   * @requires adminProcedure - User must be company_admin or super_admin
   * @param id - Client UUID
   * @returns Success status with deletion counts
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

      // Execute cascade deletion in a transaction for atomicity
      const result = await withTransaction(async (tx) => {
        const deletionCounts = {
          floorPlanGuests: 0,
          floorPlanTables: 0,
          floorPlans: 0,
          timeline: 0,
          hotels: 0,
          guestTransport: 0,
          guestGifts: 0,
          guests: 0,
          clientVendors: 0,
          budget: 0,
          events: 0,
          documents: 0,
          gifts: 0,
          giftsEnhanced: 0,
          messages: 0,
          payments: 0,
          weddingWebsites: 0,
          activity: 0,
          clientUsers: 0,
          vendorReviews: 0,
          generatedReports: 0,
          emailLogs: 0,
          smsLogs: 0,
          whatsappLogs: 0,
          creativeJobs: 0,
          websiteBuilderPages: 0,
          qrCodes: 0,
          invoices: 0,
          teamClientAssignments: 0,
          accommodations: 0,
        };

        // 1. Get floor plan IDs for this client
        const clientFloorPlans = await tx
          .select({ id: floorPlans.id })
          .from(floorPlans)
          .where(eq(floorPlans.clientId, input.id));

        // 2. Delete floor plan guests and tables for each floor plan
        for (const fp of clientFloorPlans) {
          // Delete floor plan guests
          const guestsResult = await tx
            .delete(floorPlanGuests)
            .where(eq(floorPlanGuests.floorPlanId, fp.id))
            .returning({ id: floorPlanGuests.id });
          deletionCounts.floorPlanGuests += guestsResult.length;

          // Delete floor plan tables
          const tablesResult = await tx
            .delete(floorPlanTables)
            .where(eq(floorPlanTables.floorPlanId, fp.id))
            .returning({ id: floorPlanTables.id });
          deletionCounts.floorPlanTables += tablesResult.length;
        }

        // 3. Delete floor plans
        const floorPlansResult = await tx
          .delete(floorPlans)
          .where(eq(floorPlans.clientId, input.id))
          .returning({ id: floorPlans.id });
        deletionCounts.floorPlans = floorPlansResult.length;

        // 4. Delete timeline entries
        const timelineResult = await tx
          .delete(timeline)
          .where(eq(timeline.clientId, input.id))
          .returning({ id: timeline.id });
        deletionCounts.timeline = timelineResult.length;

        // 5. Delete hotel records
        const hotelsResult = await tx
          .delete(hotels)
          .where(eq(hotels.clientId, input.id))
          .returning({ id: hotels.id });
        deletionCounts.hotels = hotelsResult.length;

        // 6. Delete transport records
        const transportResult = await tx
          .delete(guestTransport)
          .where(eq(guestTransport.clientId, input.id))
          .returning({ id: guestTransport.id });
        deletionCounts.guestTransport = transportResult.length;

        // 7. Delete guest gifts
        const guestGiftsResult = await tx
          .delete(guestGifts)
          .where(eq(guestGifts.clientId, input.id))
          .returning({ id: guestGifts.id });
        deletionCounts.guestGifts = guestGiftsResult.length;

        // 8. Delete guests (after dependent records)
        const guestsResult = await tx
          .delete(guests)
          .where(eq(guests.clientId, input.id))
          .returning({ id: guests.id });
        deletionCounts.guests = guestsResult.length;

        // 9. Delete client-vendor relationships
        const clientVendorsResult = await tx
          .delete(clientVendors)
          .where(eq(clientVendors.clientId, input.id))
          .returning({ id: clientVendors.id });
        deletionCounts.clientVendors = clientVendorsResult.length;

        // 10. Delete budget items
        const budgetResult = await tx
          .delete(budget)
          .where(eq(budget.clientId, input.id))
          .returning({ id: budget.id });
        deletionCounts.budget = budgetResult.length;

        // 11. Delete events
        const eventsResult = await tx
          .delete(events)
          .where(eq(events.clientId, input.id))
          .returning({ id: events.id });
        deletionCounts.events = eventsResult.length;

        // 12a. Delete e-signature data (child of documents — must be deleted first)
        await tx.delete(documentAuditTrail).where(
          inArray(documentAuditTrail.requestId,
            tx.select({ id: documentSignatureRequests.id })
              .from(documentSignatureRequests)
              .where(eq(documentSignatureRequests.clientId, input.id))
          )
        );
        await tx.delete(documentSignatureFields).where(
          inArray(documentSignatureFields.requestId,
            tx.select({ id: documentSignatureRequests.id })
              .from(documentSignatureRequests)
              .where(eq(documentSignatureRequests.clientId, input.id))
          )
        );
        await tx.delete(documentSigners).where(
          inArray(documentSigners.requestId,
            tx.select({ id: documentSignatureRequests.id })
              .from(documentSignatureRequests)
              .where(eq(documentSignatureRequests.clientId, input.id))
          )
        );
        await tx.delete(documentSignatureRequests).where(eq(documentSignatureRequests.clientId, input.id));

        // 12b. Delete documents
        const documentsResult = await tx
          .delete(documents)
          .where(eq(documents.clientId, input.id))
          .returning({ id: documents.id });
        deletionCounts.documents = documentsResult.length;

        // 13. Delete gifts
        const giftsResult = await tx
          .delete(gifts)
          .where(eq(gifts.clientId, input.id))
          .returning({ id: gifts.id });
        deletionCounts.gifts = giftsResult.length;

        // 14. Delete enhanced gifts
        const giftsEnhancedResult = await tx
          .delete(giftsEnhanced)
          .where(eq(giftsEnhanced.clientId, input.id))
          .returning({ id: giftsEnhanced.id });
        deletionCounts.giftsEnhanced = giftsEnhancedResult.length;

        // 15. Delete messages
        const messagesResult = await tx
          .delete(messages)
          .where(eq(messages.clientId, input.id))
          .returning({ id: messages.id });
        deletionCounts.messages = messagesResult.length;

        // 16. Delete payments
        const paymentsResult = await tx
          .delete(payments)
          .where(eq(payments.clientId, input.id))
          .returning({ id: payments.id });
        deletionCounts.payments = paymentsResult.length;

        // 17. Delete wedding websites
        const websitesResult = await tx
          .delete(weddingWebsites)
          .where(eq(weddingWebsites.clientId, input.id))
          .returning({ id: weddingWebsites.id });
        deletionCounts.weddingWebsites = websitesResult.length;

        // 18. Delete activity logs
        const activityResult = await tx
          .delete(activity)
          .where(eq(activity.clientId, input.id))
          .returning({ id: activity.id });
        deletionCounts.activity = activityResult.length;

        // 19. Delete client-user relationships
        const clientUsersResult = await tx
          .delete(clientUsers)
          .where(eq(clientUsers.clientId, input.id))
          .returning({ id: clientUsers.id });
        deletionCounts.clientUsers = clientUsersResult.length;

        // 19b. Delete remaining client-cascade child tables.
        // These have FK onDelete:'cascade' to clients, but because the client row
        // is SOFT-deleted (deletedAt set, row kept), that DB cascade never fires.
        // Without these explicit deletes the rows become permanent orphans.
        const vendorReviewsResult = await tx
          .delete(vendorReviews)
          .where(eq(vendorReviews.clientId, input.id))
          .returning({ id: vendorReviews.id });
        deletionCounts.vendorReviews = vendorReviewsResult.length;

        const generatedReportsResult = await tx
          .delete(generatedReports)
          .where(eq(generatedReports.clientId, input.id))
          .returning({ id: generatedReports.id });
        deletionCounts.generatedReports = generatedReportsResult.length;

        const emailLogsResult = await tx
          .delete(emailLogs)
          .where(eq(emailLogs.clientId, input.id))
          .returning({ id: emailLogs.id });
        deletionCounts.emailLogs = emailLogsResult.length;

        const smsLogsResult = await tx
          .delete(smsLogs)
          .where(eq(smsLogs.clientId, input.id))
          .returning({ id: smsLogs.id });
        deletionCounts.smsLogs = smsLogsResult.length;

        const whatsappLogsResult = await tx
          .delete(whatsappLogs)
          .where(eq(whatsappLogs.clientId, input.id))
          .returning({ id: whatsappLogs.id });
        deletionCounts.whatsappLogs = whatsappLogsResult.length;

        const creativeJobsResult = await tx
          .delete(creativeJobs)
          .where(eq(creativeJobs.clientId, input.id))
          .returning({ id: creativeJobs.id });
        deletionCounts.creativeJobs = creativeJobsResult.length;

        // websiteBuilderPages — its website_builder_content rows cascade via the
        // page FK (onDelete:'cascade'), so deleting pages here removes content too.
        const websiteBuilderPagesResult = await tx
          .delete(websiteBuilderPages)
          .where(eq(websiteBuilderPages.clientId, input.id))
          .returning({ id: websiteBuilderPages.id });
        deletionCounts.websiteBuilderPages = websiteBuilderPagesResult.length;

        const qrCodesResult = await tx
          .delete(qrCodes)
          .where(eq(qrCodes.clientId, input.id))
          .returning({ id: qrCodes.id });
        deletionCounts.qrCodes = qrCodesResult.length;

        const invoicesResult = await tx
          .delete(invoices)
          .where(eq(invoices.clientId, input.id))
          .returning({ id: invoices.id });
        deletionCounts.invoices = invoicesResult.length;

        const teamClientAssignmentsResult = await tx
          .delete(teamClientAssignments)
          .where(eq(teamClientAssignments.clientId, input.id))
          .returning({ id: teamClientAssignments.id });
        deletionCounts.teamClientAssignments = teamClientAssignmentsResult.length;

        const accommodationsResult = await tx
          .delete(accommodations)
          .where(eq(accommodations.clientId, input.id))
          .returning({ id: accommodations.id });
        deletionCounts.accommodations = accommodationsResult.length;

        // 20. Finally, soft delete the client
        // Note: ctx.companyId is verified non-null above, use ! assertion
        await tx
          .update(clients)
          .set({ deletedAt: new Date() })
          .where(
            and(
              eq(clients.id, input.id),
              eq(clients.companyId, ctx.companyId!)
            )
          );

        console.log(`[Client Delete] Client ${input.id} deleted with cascade:`, deletionCounts);
        return deletionCounts;
      });

      // Broadcast real-time sync after successful transaction
      await broadcastSync({
        type: 'delete',
        module: 'clients',
        entityId: input.id,
        companyId: ctx.companyId!,
        clientId: input.id,
        userId: ctx.userId!,
        queryPaths: ['clients.list', 'clients.getAll'],
      });

      return { success: true, deleted: result };
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

      const getAllConditions = [
        eq(clients.companyId, ctx.companyId),
        isNull(clients.deletedAt)
      ];

      // Staff see ONLY clients they're assigned to
      if (ctx.role === 'staff' && ctx.userId) {
        getAllConditions.push(
          inArray(
            clients.id,
            ctx.db
              .select({ id: teamClientAssignments.clientId })
              .from(teamClientAssignments)
              .where(eq(teamClientAssignments.teamMemberId, ctx.userId))
          )
        );
      }

      const data = await ctx.db
        .select()
        .from(clients)
        .where(and(...getAllConditions))
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

      // OPTIMIZED: Single query with JOINs instead of 3 sequential queries
      // Uses BetterAuth `user` table (aliased as userTable) instead of deprecated `users` table
      const [result] = await ctx.db
        .select({
          // User fields
          userId: userTable.id,
          userEmail: userTable.email,
          userFirstName: userTable.firstName,
          userLastName: userTable.lastName,
          userAvatarUrl: userTable.avatarUrl,
          userPreferredLanguage: userTable.preferredLanguage,
          userTimezone: userTable.timezone,
          // Client user relationship fields
          cuRelationship: clientUsers.relationship,
          cuIsPrimary: clientUsers.isPrimary,
          // Client fields
          clientWeddingDate: clients.weddingDate,
          clientVenue: clients.venue,
          clientGuestCount: clients.guestCount,
          clientPartner1FirstName: clients.partner1FirstName,
          clientPartner1LastName: clients.partner1LastName,
          clientPartner1Email: clients.partner1Email,
          clientPartner2FirstName: clients.partner2FirstName,
          clientPartner2LastName: clients.partner2LastName,
          clientPartner2Email: clients.partner2Email,
        })
        .from(userTable)
        .leftJoin(clientUsers, eq(clientUsers.userId, userTable.id))
        .leftJoin(clients, eq(clients.id, clientUsers.clientId))
        .where(eq(userTable.id, ctx.userId))
        .limit(1);

      if (!result) {
        return null;
      }

      return {
        user: {
          id: result.userId,
          email: result.userEmail,
          first_name: result.userFirstName,
          last_name: result.userLastName,
          avatar_url: result.userAvatarUrl,
          preferred_language: result.userPreferredLanguage,
          timezone: result.userTimezone,
        },
        client: result.clientWeddingDate !== null || result.clientVenue !== null ? {
          wedding_date: result.clientWeddingDate,
          venue: result.clientVenue,
          guest_count: result.clientGuestCount,
          partner1_first_name: result.clientPartner1FirstName,
          partner1_last_name: result.clientPartner1LastName,
          partner1_email: result.clientPartner1Email,
          partner2_first_name: result.clientPartner2FirstName,
          partner2_last_name: result.clientPartner2LastName,
          partner2_email: result.clientPartner2Email,
        } : null,
        relationship: result.cuRelationship,
        isPrimary: result.cuIsPrimary ?? false,
      };
    }),
});
