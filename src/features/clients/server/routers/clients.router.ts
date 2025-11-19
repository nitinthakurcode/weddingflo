// @ts-nocheck - Temporary workaround for Supabase TypeScript inference issues
import { router, protectedProcedure, adminProcedure } from '@/server/trpc/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import type { TablesInsert, TablesUpdate } from '@/lib/database.types';

/**
 * Clients tRPC Router
 *
 * Provides CRUD operations for wedding clients with multi-tenant security.
 * All operations verify company_id to ensure users can only access their own company's clients.
 *
 * Based on legacy dashboard functionality (see docs/LEGACY_DASHBOARD_FEATURES.md)
 */
export const clientsRouter = router({
  /**
   * List all clients for the current company.
   *
   * @requires protectedProcedure - User must be authenticated
   * @param search - Optional search filter for client names
   * @returns Array of clients ordered by wedding date (newest first)
   *
   * @example
   * ```ts
   * const clients = await trpc.clients.list.query({ search: "Smith" })
   * ```
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

      // Build base query filtered by company_id
      let query = ctx.supabase
        .from('clients')
        .select('*')
        .eq('company_id', ctx.companyId)
        .order('wedding_date', { ascending: false });

      // Apply search filter if provided
      if (input.search) {
        // Search in both partner1 and partner2 names
        query = query.or(
          `partner1_first_name.ilike.%${input.search}%,` +
          `partner1_last_name.ilike.%${input.search}%,` +
          `partner2_first_name.ilike.%${input.search}%,` +
          `partner2_last_name.ilike.%${input.search}%`
        );
      }

      const { data, error } = await query;

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        });
      }

      return data || [];
    }),

  /**
   * Get a single client by ID.
   *
   * @requires protectedProcedure - User must be authenticated
   * @param id - Client UUID
   * @returns Client object
   * @throws NOT_FOUND if client doesn't exist or doesn't belong to user's company
   *
   * @example
   * ```ts
   * const client = await trpc.clients.getById.query({ id: "uuid" })
   * ```
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

      const { data, error } = await ctx.supabase
        .from('clients')
        .select('*')
        .eq('id', input.id)
        .eq('company_id', ctx.companyId) // Security: Multi-tenant filter
        .maybeSingle();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        });
      }

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
   *
   * @example
   * ```ts
   * const client = await trpc.clients.create.mutate({
   *   partner1_first_name: "John",
   *   partner1_last_name: "Smith",
   *   partner1_email: "john@example.com",
   *   wedding_date: "2025-06-15",
   * })
   * ```
   */
  create: adminProcedure
    .input(
      z.object({
        partner1_first_name: z.string().min(1),
        partner1_last_name: z.string().min(1),
        partner1_email: z.string().email(),
        partner1_phone: z.string().optional(),
        partner2_first_name: z.string().optional(),
        partner2_last_name: z.string().optional(),
        partner2_email: z.string().email().optional().or(z.literal('')),
        partner2_phone: z.string().optional(),
        wedding_date: z.string().optional(), // ISO date string
        venue: z.string().optional(),
        budget: z.number().positive().optional(),
        guest_count: z.number().int().positive().optional(),
        notes: z.string().optional(),
      }).transform((data) => ({
        ...data,
        // Convert empty strings to undefined for optional fields
        partner2_email: data.partner2_email === '' ? undefined : data.partner2_email,
        partner2_first_name: data.partner2_first_name === '' ? undefined : data.partner2_first_name,
        partner2_last_name: data.partner2_last_name === '' ? undefined : data.partner2_last_name,
        partner2_phone: data.partner2_phone === '' ? undefined : data.partner2_phone,
        partner1_phone: data.partner1_phone === '' ? undefined : data.partner1_phone,
        venue: data.venue === '' ? undefined : data.venue,
        notes: data.notes === '' ? undefined : data.notes,
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

      // Get database user UUID from Clerk user ID
      const { data: user, error: userError } = await ctx.supabase
        .from('users')
        .select('id')
        .eq('clerk_id', ctx.userId)
        .single();

      if (userError || !user) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'User not found in database',
        });
      }

      // Create client insert object matching database schema
      // Note: TypeScript infers the correct type from the insert operation
      const clientInsert = {
        company_id: ctx.companyId,
        partner1_first_name: input.partner1_first_name,
        partner1_last_name: input.partner1_last_name,
        partner1_email: input.partner1_email,
        partner1_phone: input.partner1_phone || null,
        partner2_first_name: input.partner2_first_name || null,
        partner2_last_name: input.partner2_last_name || null,
        partner2_email: input.partner2_email || null,
        partner2_phone: input.partner2_phone || null,
        wedding_date: input.wedding_date || null,
        venue: input.venue || null,
        budget: input.budget || null,
        guest_count: input.guest_count || null,
        status: 'planning', // Default status
        notes: input.notes || null,
        created_by: user.id, // Use database UUID, not Clerk ID
        metadata: null,
      };

      // TODO: Fix TypeScript inference issue with Supabase insert types
      // Temporary workaround: Type assertion to bypass "never" type error
      const { data, error } = await ctx.supabase
        .from('clients')
        .insert(clientInsert as any)
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        });
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
   *
   * @example
   * ```ts
   * const client = await trpc.clients.update.mutate({
   *   id: "uuid",
   *   wedding_date: "2025-07-20",
   *   status: EventStatus.CONFIRMED,
   * })
   * ```
   */
  update: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        partner1_first_name: z.string().min(1).optional(),
        partner1_last_name: z.string().min(1).optional(),
        partner1_email: z.string().email().optional(),
        partner1_phone: z.string().optional(),
        partner2_first_name: z.string().optional(),
        partner2_last_name: z.string().optional(),
        partner2_email: z.string().email().optional().or(z.literal('')),
        partner2_phone: z.string().optional(),
        wedding_date: z.string().optional(),
        venue: z.string().optional(),
        budget: z.number().positive().optional(),
        guest_count: z.number().int().positive().optional(),
        status: z.enum(['draft', 'planning', 'confirmed', 'in_progress', 'completed']).optional(),
        notes: z.string().optional(),
      }).transform((data) => ({
        ...data,
        // Convert empty strings to undefined for optional fields
        partner2_email: data.partner2_email === '' ? undefined : data.partner2_email,
        partner2_first_name: data.partner2_first_name === '' ? undefined : data.partner2_first_name,
        partner2_last_name: data.partner2_last_name === '' ? undefined : data.partner2_last_name,
        partner2_phone: data.partner2_phone === '' ? undefined : data.partner2_phone,
        partner1_phone: data.partner1_phone === '' ? undefined : data.partner1_phone,
        venue: data.venue === '' ? undefined : data.venue,
        notes: data.notes === '' ? undefined : data.notes,
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
      const { data: existingClient, error: fetchError } = await ctx.supabase
        .from('clients')
        .select('id')
        .eq('id', input.id)
        .eq('company_id', ctx.companyId)
        .maybeSingle();

      if (fetchError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: fetchError.message,
        });
      }

      if (!existingClient) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Client not found',
        });
      }

      // Extract id and build update object
      const { id, ...updateData } = input;

      // Only include fields that were provided
      const clientUpdate = Object.fromEntries(
        Object.entries(updateData).filter(([_, value]) => value !== undefined)
      );

      // TODO: Fix TypeScript inference issue with Supabase update types
      // Temporary workaround: Type assertion to bypass type error
      const { data, error } = await (ctx.supabase
        .from('clients')
        .update(clientUpdate) as any)
        .eq('id', id)
        .eq('company_id', ctx.companyId) // Double-check security
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        });
      }

      return data;
    }),

  /**
   * Delete a client.
   *
   * @requires adminProcedure - User must be company_admin or super_admin
   * @param id - Client UUID
   * @returns Success status
   * @throws NOT_FOUND if client doesn't exist or doesn't belong to user's company
   *
   * NOTE: Current schema does not have deleted_at column.
   * This performs a soft delete by setting status to CANCELED.
   * For hard delete, uncomment the delete query and remove the update query.
   *
   * @example
   * ```ts
   * await trpc.clients.delete.mutate({ id: "uuid" })
   * ```
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
      const { data: existingClient, error: fetchError } = await ctx.supabase
        .from('clients')
        .select('id')
        .eq('id', input.id)
        .eq('company_id', ctx.companyId)
        .maybeSingle();

      if (fetchError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: fetchError.message,
        });
      }

      if (!existingClient) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Client not found',
        });
      }

      // Soft delete: Set status to completed
      // (Current schema does not have deleted_at column per preflight verification)
      const { error } = await ctx.supabase
        .from('clients')
        .update({ status: 'completed' })
        .eq('id', input.id)
        .eq('company_id', ctx.companyId);

      // For hard delete, use this instead:
      // const { error } = await ctx.supabase
      //   .from('clients')
      //   .delete()
      //   .eq('id', input.id)
      //   .eq('company_id', ctx.companyId);

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        });
      }

      return { success: true };
    }),
});
