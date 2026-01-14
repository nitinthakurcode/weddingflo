import { router, adminProcedure } from '@/server/trpc/trpc'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { eq, and, isNull, asc } from 'drizzle-orm'
import { accommodations, clients, hotels } from '@/lib/db/schema'

/**
 * Accommodations tRPC Router - Drizzle ORM
 *
 * Provides CRUD operations for accommodation properties (hotels) with multi-tenant security.
 * Accommodations are hotel definitions that can be used for guest room allotment.
 */
export const accommodationsRouter = router({
  getAll: adminProcedure
    .input(z.object({ clientId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      // Verify client belongs to company and is not soft-deleted
      const [client] = await ctx.db
        .select({ id: clients.id })
        .from(clients)
        .where(
          and(
            eq(clients.id, input.clientId),
            eq(clients.companyId, ctx.companyId),
            isNull(clients.deletedAt)
          )
        )
        .limit(1)

      if (!client) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      // Fetch accommodations (exclude soft-deleted)
      const accommodationList = await ctx.db
        .select()
        .from(accommodations)
        .where(
          and(
            eq(accommodations.clientId, input.clientId),
            isNull(accommodations.deletedAt)
          )
        )
        .orderBy(asc(accommodations.name))

      return accommodationList
    }),

  getById: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      const [accommodation] = await ctx.db
        .select()
        .from(accommodations)
        .where(
          and(
            eq(accommodations.id, input.id),
            isNull(accommodations.deletedAt)
          )
        )
        .limit(1)

      if (!accommodation) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return accommodation
    }),

  create: adminProcedure
    .input(z.object({
      clientId: z.string().uuid(),
      name: z.string().min(1, 'Hotel name is required'),
      address: z.string().optional(),
      city: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().email().optional().or(z.literal('')),
      website: z.string().url().optional().or(z.literal('')),
      checkInTime: z.string().optional(),
      checkOutTime: z.string().optional(),
      amenities: z.array(z.string()).optional(),
      roomTypes: z.array(z.object({
        type: z.string(),
        capacity: z.number().optional(),
        ratePerNight: z.number().optional(),
        totalRooms: z.number().optional(),
      })).optional(),
      notes: z.string().optional(),
      isDefault: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      // Verify client belongs to company and is not soft-deleted
      const [client] = await ctx.db
        .select({ id: clients.id })
        .from(clients)
        .where(
          and(
            eq(clients.id, input.clientId),
            eq(clients.companyId, ctx.companyId),
            isNull(clients.deletedAt)
          )
        )
        .limit(1)

      if (!client) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      // If this is set as default, unset other defaults
      if (input.isDefault) {
        await ctx.db
          .update(accommodations)
          .set({ isDefault: false })
          .where(eq(accommodations.clientId, input.clientId))
      }

      // Create accommodation record
      const [accommodation] = await ctx.db
        .insert(accommodations)
        .values({
          clientId: input.clientId,
          name: input.name,
          address: input.address || null,
          city: input.city || null,
          phone: input.phone || null,
          email: input.email || null,
          website: input.website || null,
          checkInTime: input.checkInTime || null,
          checkOutTime: input.checkOutTime || null,
          amenities: input.amenities || [],
          roomTypes: input.roomTypes || [],
          notes: input.notes || null,
          isDefault: input.isDefault || false,
        })
        .returning()

      if (!accommodation) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create accommodation record'
        })
      }

      return accommodation
    }),

  update: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      data: z.object({
        name: z.string().min(1).optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email().optional().or(z.literal('')),
        website: z.string().url().optional().or(z.literal('')),
        checkInTime: z.string().optional(),
        checkOutTime: z.string().optional(),
        amenities: z.array(z.string()).optional(),
        roomTypes: z.array(z.object({
          type: z.string(),
          capacity: z.number().optional(),
          ratePerNight: z.number().optional(),
          totalRooms: z.number().optional(),
        })).optional(),
        notes: z.string().optional(),
        isDefault: z.boolean().optional(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      // Get existing accommodation to verify it exists
      const [existing] = await ctx.db
        .select({ clientId: accommodations.clientId })
        .from(accommodations)
        .where(eq(accommodations.id, input.id))
        .limit(1)

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Accommodation not found' })
      }

      // If setting as default, unset other defaults
      if (input.data.isDefault) {
        await ctx.db
          .update(accommodations)
          .set({ isDefault: false })
          .where(eq(accommodations.clientId, existing.clientId))
      }

      // Build update object
      const updateData: Record<string, any> = {
        updatedAt: new Date(),
      }

      if (input.data.name !== undefined) updateData.name = input.data.name
      if (input.data.address !== undefined) updateData.address = input.data.address
      if (input.data.city !== undefined) updateData.city = input.data.city
      if (input.data.phone !== undefined) updateData.phone = input.data.phone
      if (input.data.email !== undefined) updateData.email = input.data.email || null
      if (input.data.website !== undefined) updateData.website = input.data.website || null
      if (input.data.checkInTime !== undefined) updateData.checkInTime = input.data.checkInTime
      if (input.data.checkOutTime !== undefined) updateData.checkOutTime = input.data.checkOutTime
      if (input.data.amenities !== undefined) updateData.amenities = input.data.amenities
      if (input.data.roomTypes !== undefined) updateData.roomTypes = input.data.roomTypes
      if (input.data.notes !== undefined) updateData.notes = input.data.notes
      if (input.data.isDefault !== undefined) updateData.isDefault = input.data.isDefault

      // Update accommodation
      const [accommodation] = await ctx.db
        .update(accommodations)
        .set(updateData)
        .where(eq(accommodations.id, input.id))
        .returning()

      if (!accommodation) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Accommodation record not found'
        })
      }

      return accommodation
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      // Get the accommodation name and clientId before deleting
      const [accommodation] = await ctx.db
        .select({ name: accommodations.name, clientId: accommodations.clientId })
        .from(accommodations)
        .where(eq(accommodations.id, input.id))
        .limit(1)

      if (!accommodation) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Accommodation not found' })
      }

      // Soft delete the accommodation
      await ctx.db
        .update(accommodations)
        .set({ deletedAt: new Date() })
        .where(eq(accommodations.id, input.id))

      // Clear hotel allotments that reference this accommodation name
      await ctx.db
        .update(hotels)
        .set({
          hotelName: null,
          roomNumber: null,
          roomAssignments: null,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(hotels.clientId, accommodation.clientId),
            eq(hotels.hotelName, accommodation.name)
          )
        )

      return { success: true }
    }),

  // Set a specific accommodation as default
  setDefault: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      clientId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      // Unset all defaults for this client
      await ctx.db
        .update(accommodations)
        .set({ isDefault: false })
        .where(eq(accommodations.clientId, input.clientId))

      // Set new default
      const [accommodation] = await ctx.db
        .update(accommodations)
        .set({ isDefault: true, updatedAt: new Date() })
        .where(eq(accommodations.id, input.id))
        .returning()

      return accommodation
    }),
})
