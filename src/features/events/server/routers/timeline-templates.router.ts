import { router, adminProcedure } from '@/server/trpc/trpc'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { eq, and, asc } from 'drizzle-orm'
import { timelineTemplates } from '@/lib/db/schema'
import {
  eventTypeTemplates,
  defaultTemplate,
  eventTypeDisplayNames,
  getAllEventTypes,
  type TimelineTemplateItem,
} from '@/lib/templates/timeline-defaults'

/**
 * Timeline Templates Router
 *
 * January 2026 - Company-customizable timeline templates
 *
 * Allows companies to:
 * - View default templates by event type
 * - Initialize custom templates from defaults
 * - Edit template items (rename, change descriptions, timing)
 * - Add/remove template items
 * - Reset to defaults
 */
export const timelineTemplatesRouter = router({
  /**
   * Get available event types with display names
   */
  getEventTypes: adminProcedure.query(() => {
    return {
      types: getAllEventTypes(),
      displayNames: eventTypeDisplayNames,
    }
  }),

  /**
   * Get default template for an event type (read-only)
   */
  getDefaults: adminProcedure
    .input(z.object({ eventType: z.string() }))
    .query(({ input }) => {
      const normalizedType = input.eventType.toLowerCase().replace(/[^a-z_]/g, '_')
      const template = eventTypeTemplates[normalizedType] || defaultTemplate

      return {
        eventType: normalizedType,
        displayName: eventTypeDisplayNames[normalizedType] || input.eventType,
        items: template.map((item, index) => ({
          ...item,
          sortOrder: index,
        })),
      }
    }),

  /**
   * Get company's custom templates for an event type
   * Returns defaults if no customization exists
   */
  getByEventType: adminProcedure
    .input(z.object({ eventType: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found' })
      }

      const normalizedType = input.eventType.toLowerCase().replace(/[^a-z_]/g, '_')

      // Check for custom templates
      const customTemplates = await ctx.db
        .select()
        .from(timelineTemplates)
        .where(
          and(
            eq(timelineTemplates.companyId, ctx.companyId),
            eq(timelineTemplates.eventType, normalizedType)
          )
        )
        .orderBy(asc(timelineTemplates.sortOrder))

      // If custom templates exist, return them
      if (customTemplates.length > 0) {
        return {
          eventType: normalizedType,
          displayName: eventTypeDisplayNames[normalizedType] || input.eventType,
          isCustomized: true,
          items: customTemplates,
        }
      }

      // Otherwise return defaults
      const defaultItems = eventTypeTemplates[normalizedType] || defaultTemplate
      return {
        eventType: normalizedType,
        displayName: eventTypeDisplayNames[normalizedType] || input.eventType,
        isCustomized: false,
        items: defaultItems.map((item, index) => ({
          id: `default-${index}`,
          companyId: ctx.companyId,
          eventType: normalizedType,
          ...item,
          sortOrder: index,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      }
    }),

  /**
   * Get all company's customized event types
   */
  getCustomizedTypes: adminProcedure.query(async ({ ctx }) => {
    if (!ctx.companyId) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found' })
    }

    // Get distinct event types that have been customized
    const result = await ctx.db
      .selectDistinct({ eventType: timelineTemplates.eventType })
      .from(timelineTemplates)
      .where(eq(timelineTemplates.companyId, ctx.companyId))

    return result.map((r) => ({
      eventType: r.eventType,
      displayName: eventTypeDisplayNames[r.eventType] || r.eventType,
    }))
  }),

  /**
   * Initialize custom templates from defaults for an event type
   * Creates editable copies of the default template items
   */
  initializeFromDefaults: adminProcedure
    .input(z.object({ eventType: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found' })
      }

      const { v4: uuidv4 } = await import('uuid')
      const normalizedType = input.eventType.toLowerCase().replace(/[^a-z_]/g, '_')

      // Check if already initialized
      const existing = await ctx.db
        .select({ id: timelineTemplates.id })
        .from(timelineTemplates)
        .where(
          and(
            eq(timelineTemplates.companyId, ctx.companyId),
            eq(timelineTemplates.eventType, normalizedType)
          )
        )
        .limit(1)

      if (existing.length > 0) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Templates already initialized for this event type',
        })
      }

      // Get default templates
      const defaultItems = eventTypeTemplates[normalizedType] || defaultTemplate

      // Create custom copies
      const templateItems = defaultItems.map((item, index) => ({
        id: uuidv4(),
        companyId: ctx.companyId!,
        eventType: normalizedType,
        title: item.title,
        description: item.description,
        offsetMinutes: item.offsetMinutes,
        durationMinutes: item.durationMinutes,
        location: item.location || null,
        phase: item.phase,
        sortOrder: index,
        isActive: true,
      }))

      await ctx.db.insert(timelineTemplates).values(templateItems)

      return {
        eventType: normalizedType,
        itemsCreated: templateItems.length,
      }
    }),

  /**
   * Update a template item
   */
  updateItem: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        offsetMinutes: z.number().int().optional(),
        durationMinutes: z.number().int().positive().optional(),
        location: z.string().optional().nullable(),
        phase: z.enum(['setup', 'showtime', 'wrapup']).optional(),
        sortOrder: z.number().int().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found' })
      }

      const { id, ...updates } = input

      // Verify ownership
      const [existing] = await ctx.db
        .select()
        .from(timelineTemplates)
        .where(
          and(eq(timelineTemplates.id, id), eq(timelineTemplates.companyId, ctx.companyId))
        )
        .limit(1)

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Template item not found' })
      }

      // Update
      const [updated] = await ctx.db
        .update(timelineTemplates)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(timelineTemplates.id, id))
        .returning()

      return updated
    }),

  /**
   * Add a new template item
   */
  addItem: adminProcedure
    .input(
      z.object({
        eventType: z.string(),
        title: z.string().min(1),
        description: z.string().optional(),
        offsetMinutes: z.number().int(),
        durationMinutes: z.number().int().positive(),
        location: z.string().optional(),
        phase: z.enum(['setup', 'showtime', 'wrapup']),
        sortOrder: z.number().int().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found' })
      }

      const { v4: uuidv4 } = await import('uuid')
      const normalizedType = input.eventType.toLowerCase().replace(/[^a-z_]/g, '_')

      // If no sort order provided, get the max and add 1
      let sortOrder = input.sortOrder
      if (sortOrder === undefined) {
        const [maxSort] = await ctx.db
          .select({ sortOrder: timelineTemplates.sortOrder })
          .from(timelineTemplates)
          .where(
            and(
              eq(timelineTemplates.companyId, ctx.companyId),
              eq(timelineTemplates.eventType, normalizedType)
            )
          )
          .orderBy(asc(timelineTemplates.sortOrder))
          .limit(1)

        sortOrder = (maxSort?.sortOrder ?? -1) + 1
      }

      const [created] = await ctx.db
        .insert(timelineTemplates)
        .values({
          id: uuidv4(),
          companyId: ctx.companyId,
          eventType: normalizedType,
          title: input.title,
          description: input.description || null,
          offsetMinutes: input.offsetMinutes,
          durationMinutes: input.durationMinutes,
          location: input.location || null,
          phase: input.phase,
          sortOrder,
          isActive: true,
        })
        .returning()

      return created
    }),

  /**
   * Delete a template item
   */
  deleteItem: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found' })
      }

      // Verify ownership
      const [existing] = await ctx.db
        .select()
        .from(timelineTemplates)
        .where(
          and(
            eq(timelineTemplates.id, input.id),
            eq(timelineTemplates.companyId, ctx.companyId)
          )
        )
        .limit(1)

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Template item not found' })
      }

      await ctx.db
        .delete(timelineTemplates)
        .where(eq(timelineTemplates.id, input.id))

      return { success: true }
    }),

  /**
   * Reset templates for an event type to defaults
   * Deletes all custom templates and reinitializes from defaults
   */
  resetToDefaults: adminProcedure
    .input(z.object({ eventType: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found' })
      }

      const normalizedType = input.eventType.toLowerCase().replace(/[^a-z_]/g, '_')

      // Delete all custom templates for this event type
      await ctx.db
        .delete(timelineTemplates)
        .where(
          and(
            eq(timelineTemplates.companyId, ctx.companyId),
            eq(timelineTemplates.eventType, normalizedType)
          )
        )

      return { success: true, eventType: normalizedType }
    }),

  /**
   * Bulk update sort order for template items
   */
  updateSortOrder: adminProcedure
    .input(
      z.object({
        items: z.array(
          z.object({
            id: z.string().uuid(),
            sortOrder: z.number().int(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found' })
      }

      // Update each item's sort order
      await Promise.all(
        input.items.map((item) =>
          ctx.db
            .update(timelineTemplates)
            .set({ sortOrder: item.sortOrder, updatedAt: new Date() })
            .where(
              and(
                eq(timelineTemplates.id, item.id),
                eq(timelineTemplates.companyId, ctx.companyId!)
              )
            )
        )
      )

      return { success: true }
    }),
})
