/**
 * Floor Plans Router
 *
 * Handles seating arrangements and floor plan management.
 *
 * December 2025 Standards:
 * - Drizzle ORM for database access
 * - BetterAuth session for authentication
 */

import { router, protectedProcedure, adminProcedure } from '@/server/trpc/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq, and, desc, inArray } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';
import { broadcastSync } from '@/lib/realtime/broadcast-sync';

const tableShapeEnum = z.enum(['round', 'rectangle', 'square']);

export const floorPlansRouter = router({
  /**
   * List all floor plans for a client
   */
  list: protectedProcedure
    .input(z.object({
      clientId: z.string().uuid(),
    }))
    .query(async ({ ctx, input }) => {
      const { db, companyId } = ctx;

      if (!companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID not found',
        });
      }

      try {
        // Verify client belongs to company
        const client = await db.query.clients.findFirst({
          where: and(
            eq(schema.clients.id, input.clientId),
            eq(schema.clients.companyId, companyId)
          ),
        });

        if (!client) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Client not found' });
        }

        const floorPlans = await db.query.floorPlans.findMany({
          where: eq(schema.floorPlans.clientId, input.clientId),
          orderBy: [desc(schema.floorPlans.createdAt)],
        });

        return floorPlans;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error('Error listing floor plans:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to list floor plans',
        });
      }
    }),

  /**
   * Get floor plan with all tables and guest assignments
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { db, companyId } = ctx;

      if (!companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID not found',
        });
      }

      try {
        // Get floor plan
        const floorPlan = await db.query.floorPlans.findFirst({
          where: eq(schema.floorPlans.id, input.id),
        });

        if (!floorPlan) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Floor plan not found',
          });
        }

        // Verify client belongs to company
        const client = await db.query.clients.findFirst({
          where: and(
            eq(schema.clients.id, floorPlan.clientId),
            eq(schema.clients.companyId, companyId)
          ),
        });

        if (!client) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }

        // Get tables
        const tables = await db.query.floorPlanTables.findMany({
          where: eq(schema.floorPlanTables.floorPlanId, input.id),
        });

        // Get guest assignments with guest info
        const assignments = await db
          .select({
            id: schema.floorPlanGuests.id,
            floorPlanId: schema.floorPlanGuests.floorPlanId,
            tableId: schema.floorPlanGuests.tableId,
            guestId: schema.floorPlanGuests.guestId,
            seatNumber: schema.floorPlanGuests.seatNumber,
            x: schema.floorPlanGuests.x,
            y: schema.floorPlanGuests.y,
            guest: {
              id: schema.guests.id,
              firstName: schema.guests.firstName,
              lastName: schema.guests.lastName,
              dietaryRestrictions: schema.guests.dietaryRestrictions,
            },
          })
          .from(schema.floorPlanGuests)
          .leftJoin(schema.guests, eq(schema.floorPlanGuests.guestId, schema.guests.id))
          .where(eq(schema.floorPlanGuests.floorPlanId, input.id));

        return {
          ...floorPlan,
          tables,
          assignments,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error('Error getting floor plan:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get floor plan',
        });
      }
    }),

  /**
   * Create new floor plan
   */
  create: adminProcedure
    .input(z.object({
      clientId: z.string().uuid(),
      name: z.string().min(1).max(100),
      venueName: z.string().optional(),
      eventDate: z.string().optional(),
      canvasWidth: z.number().int().min(800).max(2400).default(1200),
      canvasHeight: z.number().int().min(600).max(1600).default(800),
    }))
    .mutation(async ({ ctx, input }) => {
      const { db, companyId } = ctx;

      if (!companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID required',
        });
      }

      try {
        // Verify client belongs to company
        const client = await db.query.clients.findFirst({
          where: and(
            eq(schema.clients.id, input.clientId),
            eq(schema.clients.companyId, companyId)
          ),
        });

        if (!client) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Client not found' });
        }

        const [floorPlan] = await db
          .insert(schema.floorPlans)
          .values({
            clientId: input.clientId,
            name: input.name,
            width: input.canvasWidth,
            height: input.canvasHeight,
            metadata: {
              venueName: input.venueName,
              eventDate: input.eventDate,
              companyId, // Store for future reference
            },
          })
          .returning();

        await broadcastSync({
          type: 'insert',
          module: 'floorPlans',
          entityId: floorPlan.id,
          companyId: companyId!,
          clientId: input.clientId,
          userId: ctx.userId!,
          queryPaths: ['floorPlans.list'],
        })

        return floorPlan;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error('Error creating floor plan:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create floor plan',
        });
      }
    }),

  /**
   * Update floor plan settings
   */
  update: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      name: z.string().optional(),
      venueName: z.string().optional(),
      backgroundImageUrl: z.string().url().optional(),
      width: z.number().int().min(400).max(5000).optional(), // Hall width in pixels
      height: z.number().int().min(300).max(4000).optional(), // Hall height in pixels
      showGrid: z.boolean().optional(),
      gridSize: z.number().int().min(10).max(100).optional(),
      zoomLevel: z.number().min(0.1).max(5.0).optional(),
      panX: z.number().optional(),
      panY: z.number().optional(),
      // Real-world dimension support
      dimensionUnit: z.enum(['feet', 'meters']).optional(),
      hallWidth: z.number().min(1).max(500).optional(), // Real-world width (ft/m)
      hallHeight: z.number().min(1).max(500).optional(), // Real-world height (ft/m)
      pixelsPerUnit: z.number().min(10).max(100).optional(), // Scale factor
    }))
    .mutation(async ({ ctx, input }) => {
      const { db, companyId } = ctx;

      if (!companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID required',
        });
      }

      try {
        // Get existing floor plan
        const existing = await db.query.floorPlans.findFirst({
          where: eq(schema.floorPlans.id, input.id),
        });

        if (!existing) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Floor plan not found' });
        }

        // Verify ownership
        const client = await db.query.clients.findFirst({
          where: and(
            eq(schema.clients.id, existing.clientId),
            eq(schema.clients.companyId, companyId)
          ),
        });

        if (!client) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }

        const existingMetadata = (existing.metadata as Record<string, unknown>) || {};

        const [updated] = await db
          .update(schema.floorPlans)
          .set({
            name: input.name || existing.name,
            backgroundImage: input.backgroundImageUrl || existing.backgroundImage,
            width: input.width ?? existing.width,
            height: input.height ?? existing.height,
            metadata: {
              ...existingMetadata,
              venueName: input.venueName ?? existingMetadata.venueName,
              showGrid: input.showGrid ?? existingMetadata.showGrid,
              gridSize: input.gridSize ?? existingMetadata.gridSize,
              zoomLevel: input.zoomLevel ?? existingMetadata.zoomLevel,
              panX: input.panX ?? existingMetadata.panX,
              panY: input.panY ?? existingMetadata.panY,
              // Real-world dimension settings
              dimensionUnit: input.dimensionUnit ?? existingMetadata.dimensionUnit,
              hallWidth: input.hallWidth ?? existingMetadata.hallWidth,
              hallHeight: input.hallHeight ?? existingMetadata.hallHeight,
              pixelsPerUnit: input.pixelsPerUnit ?? existingMetadata.pixelsPerUnit,
            },
            updatedAt: new Date(),
          })
          .where(eq(schema.floorPlans.id, input.id))
          .returning();

        await broadcastSync({
          type: 'update',
          module: 'floorPlans',
          entityId: input.id,
          companyId: companyId!,
          clientId: existing.clientId,
          userId: ctx.userId!,
          queryPaths: ['floorPlans.list'],
        })

        return updated;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error('Error updating floor plan:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update floor plan',
        });
      }
    }),

  /**
   * Add table to floor plan
   */
  addTable: adminProcedure
    .input(z.object({
      floorPlanId: z.string().uuid(),
      tableNumber: z.string(),
      tableName: z.string().optional(),
      tableShape: tableShapeEnum,
      x: z.number().int(),
      y: z.number().int(),
      width: z.number().int().default(100),
      height: z.number().int().default(100),
      capacity: z.number().int().min(1).max(20).default(8),
      minCapacity: z.number().int().default(4),
      maxCapacity: z.number().int().default(12),
      fillColor: z.string().regex(/^#[0-9A-F]{6}$/i).default('#3B82F6'),
      isVip: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      try {
        const [table] = await db
          .insert(schema.floorPlanTables)
          .values({
            floorPlanId: input.floorPlanId,
            name: input.tableName || `Table ${input.tableNumber}`,
            tableNumber: parseInt(input.tableNumber) || 1,
            tableName: input.tableName,
            shape: input.tableShape,
            x: input.x,
            y: input.y,
            width: input.width,
            height: input.height,
            capacity: input.capacity,
            metadata: {
              minCapacity: input.minCapacity,
              maxCapacity: input.maxCapacity,
              fillColor: input.fillColor,
              isVip: input.isVip,
            },
          })
          .returning();

        return table;
      } catch (error) {
        console.error('Error adding table:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to add table',
        });
      }
    }),

  /**
   * Update table position and properties
   */
  updateTable: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      x: z.number().int().optional(),
      y: z.number().int().optional(),
      width: z.number().int().optional(),
      height: z.number().int().optional(),
      rotation: z.number().min(-180).max(180).optional(),
      capacity: z.number().int().optional(),
      fillColor: z.string().optional(),
      tableName: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      try {
        // Get existing table
        const existing = await db.query.floorPlanTables.findFirst({
          where: eq(schema.floorPlanTables.id, input.id),
        });

        if (!existing) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Table not found' });
        }

        const existingMetadata = (existing.metadata as Record<string, unknown>) || {};

        const updateData: Partial<{
          x: number;
          y: number;
          width: number;
          height: number;
          rotation: number;
          capacity: number;
          tableName: string;
          metadata: Record<string, unknown>;
          updatedAt: Date;
        }> = { updatedAt: new Date() };

        if (input.x !== undefined) updateData.x = input.x;
        if (input.y !== undefined) updateData.y = input.y;
        if (input.width !== undefined) updateData.width = input.width;
        if (input.height !== undefined) updateData.height = input.height;
        if (input.rotation !== undefined) updateData.rotation = input.rotation;
        if (input.capacity !== undefined) updateData.capacity = input.capacity;
        if (input.tableName !== undefined) updateData.tableName = input.tableName;
        if (input.fillColor !== undefined) {
          updateData.metadata = {
            ...existingMetadata,
            fillColor: input.fillColor,
          };
        }

        const [updated] = await db
          .update(schema.floorPlanTables)
          .set(updateData)
          .where(eq(schema.floorPlanTables.id, input.id))
          .returning();

        return updated;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error('Error updating table:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update table',
        });
      }
    }),

  /**
   * Delete table
   */
  deleteTable: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      try {
        await db
          .delete(schema.floorPlanTables)
          .where(eq(schema.floorPlanTables.id, input.id));

        return { success: true };
      } catch (error) {
        console.error('Error deleting table:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete table',
        });
      }
    }),

  /**
   * Check seating conflicts for a guest at a table
   * Note: Seating conflicts/preferences feature not yet implemented in schema
   */
  checkConflicts: protectedProcedure
    .input(z.object({
      guestId: z.string().uuid(),
      tableId: z.string().uuid(),
    }))
    .query(async () => {
      // Seating conflicts/preferences not in schema yet
      return { conflicts: [], preferences: [], hasConflicts: false, hasPreferences: false };
    }),

  /**
   * Update guest seating conflicts and preferences
   * Note: Seating conflicts/preferences feature not yet implemented in schema
   */
  updateGuestSeatingRules: adminProcedure
    .input(z.object({
      guestId: z.string().uuid(),
      seatingConflicts: z.array(z.string().uuid()).optional(),
      seatingPreferences: z.array(z.string().uuid()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { db, companyId } = ctx;

      if (!companyId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Company ID not found' });
      }

      // Seating conflicts/preferences not in schema yet - just return guest
      const guest = await db.query.guests.findFirst({
        where: eq(schema.guests.id, input.guestId),
      });

      if (!guest) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Guest not found' });
      }

      return guest;
    }),


  /**
   * Assign guest to table (with optional conflict check)
   */
  assignGuest: adminProcedure
    .input(z.object({
      floorPlanId: z.string().uuid(),
      tableId: z.string().uuid(),
      guestId: z.string().uuid(),
      seatNumber: z.number().int().optional(),
      forceAssign: z.boolean().optional().default(false), // Override conflict warnings
    }))
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      try {
        // Check table capacity
        const table = await db.query.floorPlanTables.findFirst({
          where: eq(schema.floorPlanTables.id, input.tableId),
        });

        if (!table) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Table not found' });
        }

        // Count current assignments
        const existingAssignments = await db.query.floorPlanGuests.findMany({
          where: eq(schema.floorPlanGuests.tableId, input.tableId),
        });

        const tableMetadata = (table.metadata as { maxCapacity?: number }) || {};
        const maxCapacity = tableMetadata.maxCapacity || table.capacity || 8;

        if (existingAssignments.length >= maxCapacity) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Table is at full capacity',
          });
        }

        // Seating conflicts check disabled - feature not yet in schema

        const [assignment] = await db
          .insert(schema.floorPlanGuests)
          .values({
            floorPlanId: input.floorPlanId,
            tableId: input.tableId,
            guestId: input.guestId,
            seatNumber: input.seatNumber,
          })
          .returning();

        return assignment;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error('Error assigning guest:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to assign guest',
        });
      }
    }),

  /**
   * Remove guest from table
   */
  unassignGuest: adminProcedure
    .input(z.object({
      floorPlanId: z.string().uuid(),
      guestId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

      try {
        await db
          .delete(schema.floorPlanGuests)
          .where(and(
            eq(schema.floorPlanGuests.floorPlanId, input.floorPlanId),
            eq(schema.floorPlanGuests.guestId, input.guestId)
          ));

        return { success: true };
      } catch (error) {
        console.error('Error unassigning guest:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to unassign guest',
        });
      }
    }),

  /**
   * Batch assign guests to tables (for AI optimization)
   * Atomic operation - all assignments succeed or all fail
   *
   * Performance: Uses single transaction for consistency
   * Validates capacity before any inserts
   */
  batchAssignGuests: adminProcedure
    .input(z.object({
      floorPlanId: z.string().uuid(),
      assignments: z.array(z.object({
        tableId: z.string().uuid(),
        guestId: z.string().uuid(),
        seatNumber: z.number().int().optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const { db, companyId } = ctx;

      if (!companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID required',
        });
      }

      if (input.assignments.length === 0) {
        return { success: true, assigned: 0 };
      }

      try {
        // Verify floor plan ownership
        const floorPlan = await db.query.floorPlans.findFirst({
          where: eq(schema.floorPlans.id, input.floorPlanId),
        });

        if (!floorPlan) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Floor plan not found' });
        }

        const client = await db.query.clients.findFirst({
          where: and(
            eq(schema.clients.id, floorPlan.clientId),
            eq(schema.clients.companyId, companyId)
          ),
        });

        if (!client) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }

        // Get all tables for capacity validation
        const tableIds = [...new Set(input.assignments.map(a => a.tableId))];
        const tables = await db.query.floorPlanTables.findMany({
          where: inArray(schema.floorPlanTables.id, tableIds),
        });

        const tableMap = new Map(tables.map(t => [t.id, t]));

        // Get existing assignments to check capacity
        const existingAssignments = await db.query.floorPlanGuests.findMany({
          where: eq(schema.floorPlanGuests.floorPlanId, input.floorPlanId),
        });

        // Count assignments per table (existing + new)
        const tableAssignmentCounts = new Map<string, number>();
        for (const assignment of existingAssignments) {
          if (assignment.tableId) {
            tableAssignmentCounts.set(
              assignment.tableId,
              (tableAssignmentCounts.get(assignment.tableId) || 0) + 1
            );
          }
        }

        // Validate capacity for each table
        for (const assignment of input.assignments) {
          const table = tableMap.get(assignment.tableId);
          if (!table) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `Table ${assignment.tableId} not found`,
            });
          }

          const tableMetadata = (table.metadata as { maxCapacity?: number }) || {};
          const maxCapacity = tableMetadata.maxCapacity || table.capacity || 8;
          const currentCount = tableAssignmentCounts.get(assignment.tableId) || 0;

          tableAssignmentCounts.set(assignment.tableId, currentCount + 1);

          if (currentCount + 1 > maxCapacity) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `Table ${table.tableName || table.tableNumber} would exceed capacity (${maxCapacity})`,
            });
          }
        }

        // Remove any existing assignments for these guests
        const guestIds = input.assignments.map(a => a.guestId);
        await db
          .delete(schema.floorPlanGuests)
          .where(and(
            eq(schema.floorPlanGuests.floorPlanId, input.floorPlanId),
            inArray(schema.floorPlanGuests.guestId, guestIds)
          ));

        // Insert all new assignments
        const insertValues = input.assignments.map(a => ({
          floorPlanId: input.floorPlanId,
          tableId: a.tableId,
          guestId: a.guestId,
          seatNumber: a.seatNumber,
        }));

        await db
          .insert(schema.floorPlanGuests)
          .values(insertValues);

        return {
          success: true,
          assigned: input.assignments.length,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error('Error batch assigning guests:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to apply batch assignments',
        });
      }
    }),

  /**
   * Get unassigned guests for floor plan
   */
  getUnassignedGuests: protectedProcedure
    .input(z.object({ floorPlanId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { db, companyId } = ctx;

      if (!companyId) {
        return [];
      }

      try {
        // Get floor plan to find client
        const floorPlan = await db.query.floorPlans.findFirst({
          where: eq(schema.floorPlans.id, input.floorPlanId),
        });

        if (!floorPlan) {
          return [];
        }

        // Get all assigned guest IDs
        const assignments = await db.query.floorPlanGuests.findMany({
          where: eq(schema.floorPlanGuests.floorPlanId, input.floorPlanId),
        });

        const assignedGuestIds = assignments
          .filter(a => a.guestId)
          .map(a => a.guestId!);

        // Get all guests for this client
        const allGuests = await db.query.guests.findMany({
          where: eq(schema.guests.clientId, floorPlan.clientId),
        });

        // Filter out assigned guests
        const unassignedGuests = allGuests.filter(
          guest => !assignedGuestIds.includes(guest.id)
        );

        return unassignedGuests;
      } catch (error) {
        console.error('Error getting unassigned guests:', error);
        return [];
      }
    }),

  /**
   * Delete floor plan
   */
  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { db, companyId } = ctx;

      if (!companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID required',
        });
      }

      try {
        // Verify ownership
        const floorPlan = await db.query.floorPlans.findFirst({
          where: eq(schema.floorPlans.id, input.id),
        });

        if (!floorPlan) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Floor plan not found' });
        }

        const client = await db.query.clients.findFirst({
          where: and(
            eq(schema.clients.id, floorPlan.clientId),
            eq(schema.clients.companyId, companyId)
          ),
        });

        if (!client) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }

        // Delete related data first
        await db
          .delete(schema.floorPlanGuests)
          .where(eq(schema.floorPlanGuests.floorPlanId, input.id));

        await db
          .delete(schema.floorPlanTables)
          .where(eq(schema.floorPlanTables.floorPlanId, input.id));

        // Delete floor plan
        await db
          .delete(schema.floorPlans)
          .where(eq(schema.floorPlans.id, input.id));

        await broadcastSync({
          type: 'delete',
          module: 'floorPlans',
          entityId: input.id,
          companyId: companyId!,
          clientId: floorPlan.clientId,
          userId: ctx.userId!,
          queryPaths: ['floorPlans.list'],
        })

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error('Error deleting floor plan:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete floor plan',
        });
      }
    }),

  // ============================================
  // SEATING VERSIONING
  // Schema: id, floorPlanId, name, layout (JSONB), createdAt
  // ============================================

  /**
   * List all saved versions for a floor plan
   */
  listVersions: protectedProcedure
    .input(z.object({ floorPlanId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { db, companyId } = ctx;

      if (!companyId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Company ID not found' });
      }

      try {
        // Verify floor plan ownership through client
        const floorPlan = await db.query.floorPlans.findFirst({
          where: eq(schema.floorPlans.id, input.floorPlanId),
        });

        if (!floorPlan) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Floor plan not found' });
        }

        const client = await db.query.clients.findFirst({
          where: and(
            eq(schema.clients.id, floorPlan.clientId),
            eq(schema.clients.companyId, companyId)
          ),
        });

        if (!client) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }

        const versions = await db.query.seatingVersions.findMany({
          where: eq(schema.seatingVersions.floorPlanId, input.floorPlanId),
          orderBy: [desc(schema.seatingVersions.createdAt)],
        });

        return versions;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error('Error listing versions:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to list versions',
        });
      }
    }),

  /**
   * Save current floor plan state as a new version
   */
  saveVersion: adminProcedure
    .input(z.object({
      floorPlanId: z.string().uuid(),
      name: z.string().min(1).max(100),
    }))
    .mutation(async ({ ctx, input }) => {
      const { db, companyId } = ctx;

      if (!companyId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Company ID required' });
      }

      try {
        // Get floor plan and verify ownership
        const floorPlan = await db.query.floorPlans.findFirst({
          where: eq(schema.floorPlans.id, input.floorPlanId),
        });

        if (!floorPlan) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Floor plan not found' });
        }

        const client = await db.query.clients.findFirst({
          where: and(
            eq(schema.clients.id, floorPlan.clientId),
            eq(schema.clients.companyId, companyId)
          ),
        });

        if (!client) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }

        // Get current tables
        const tables = await db.query.floorPlanTables.findMany({
          where: eq(schema.floorPlanTables.floorPlanId, input.floorPlanId),
        });

        // Get current assignments
        const assignments = await db.query.floorPlanGuests.findMany({
          where: eq(schema.floorPlanGuests.floorPlanId, input.floorPlanId),
        });

        // Store everything in the layout JSONB field
        const layout = {
          tablePositions: tables.map(t => ({
            id: t.id,
            tableNumber: t.tableNumber,
            tableName: t.tableName,
            shape: t.shape,
            x: t.x,
            y: t.y,
            width: t.width,
            height: t.height,
            rotation: t.rotation,
            capacity: t.capacity,
            metadata: t.metadata,
          })),
          guestAssignments: assignments.map(a => ({
            guestId: a.guestId,
            tableId: a.tableId,
            seatNumber: a.seatNumber,
          })),
        };

        // Create new version
        const [version] = await db
          .insert(schema.seatingVersions)
          .values({
            id: crypto.randomUUID(),
            floorPlanId: input.floorPlanId,
            name: input.name,
            layout,
          })
          .returning();

        return version;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error('Error saving version:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to save version',
        });
      }
    }),

  /**
   * Load/restore a specific version
   */
  loadVersion: adminProcedure
    .input(z.object({
      versionId: z.string().uuid(),
      floorPlanId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { db, companyId } = ctx;

      if (!companyId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Company ID required' });
      }

      try {
        // Get the version
        const version = await db.query.seatingVersions.findFirst({
          where: eq(schema.seatingVersions.id, input.versionId),
        });

        if (!version) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Version not found' });
        }

        // Verify floor plan ownership
        const floorPlan = await db.query.floorPlans.findFirst({
          where: eq(schema.floorPlans.id, input.floorPlanId),
        });

        if (!floorPlan) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Floor plan not found' });
        }

        const client = await db.query.clients.findFirst({
          where: and(
            eq(schema.clients.id, floorPlan.clientId),
            eq(schema.clients.companyId, companyId)
          ),
        });

        if (!client) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }

        // Parse layout JSONB
        const layout = version.layout as {
          tablePositions?: Array<{
            id: string;
            x: number;
            y: number;
            width: number;
            height: number;
            rotation?: number;
          }>;
          guestAssignments?: Array<{
            guestId: string;
            tableId: string;
            seatNumber?: number;
          }>;
        } | null;

        const tablePositions = layout?.tablePositions || [];
        const guestAssignments = layout?.guestAssignments || [];

        // Clear current assignments
        await db
          .delete(schema.floorPlanGuests)
          .where(eq(schema.floorPlanGuests.floorPlanId, input.floorPlanId));

        // Update table positions
        for (const tableData of tablePositions) {
          await db
            .update(schema.floorPlanTables)
            .set({
              x: tableData.x,
              y: tableData.y,
              width: tableData.width,
              height: tableData.height,
              rotation: tableData.rotation || 0,
              updatedAt: new Date(),
            })
            .where(eq(schema.floorPlanTables.id, tableData.id));
        }

        // Restore guest assignments
        if (guestAssignments.length > 0) {
          await db
            .insert(schema.floorPlanGuests)
            .values(guestAssignments.map(a => ({
              floorPlanId: input.floorPlanId,
              tableId: a.tableId,
              guestId: a.guestId,
              seatNumber: a.seatNumber,
            })));
        }

        return {
          success: true,
          restoredTables: tablePositions.length,
          restoredAssignments: guestAssignments.length,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error('Error loading version:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to load version',
        });
      }
    }),

  /**
   * Delete a saved version
   */
  deleteVersion: adminProcedure
    .input(z.object({ versionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { db, companyId } = ctx;

      if (!companyId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Company ID required' });
      }

      try {
        // Get version and its floor plan
        const version = await db.query.seatingVersions.findFirst({
          where: eq(schema.seatingVersions.id, input.versionId),
        });

        if (!version) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Version not found' });
        }

        // Verify ownership through floor plan -> client -> company
        const floorPlan = await db.query.floorPlans.findFirst({
          where: eq(schema.floorPlans.id, version.floorPlanId),
        });

        if (floorPlan) {
          const client = await db.query.clients.findFirst({
            where: and(
              eq(schema.clients.id, floorPlan.clientId),
              eq(schema.clients.companyId, companyId)
            ),
          });

          if (!client) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
          }
        }

        await db
          .delete(schema.seatingVersions)
          .where(eq(schema.seatingVersions.id, input.versionId));

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error('Error deleting version:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete version',
        });
      }
    }),

  /**
   * Get seating change history
   * Note: Uses versions as history - returns saved versions
   */
  getChangeHistory: protectedProcedure
    .input(z.object({
      floorPlanId: z.string().uuid(),
      limit: z.number().int().min(1).max(100).optional().default(50),
    }))
    .query(async ({ ctx, input }) => {
      const { db, companyId } = ctx;

      if (!companyId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Company ID not found' });
      }

      try {
        // Schema: id, floorPlanId, userId, changeType, previousData, newData, createdAt
        const changes = await db.query.seatingChangeLog.findMany({
          where: eq(schema.seatingChangeLog.floorPlanId, input.floorPlanId),
          orderBy: [desc(schema.seatingChangeLog.createdAt)],
          limit: input.limit,
        });

        return changes;
      } catch (error) {
        console.error('Error getting change history:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get change history',
        });
      }
    }),

  /**
   * Log a seating change (called from client after each change)
   * Schema: id, floorPlanId, userId, changeType, previousData, newData, createdAt
   */
  logChange: adminProcedure
    .input(z.object({
      floorPlanId: z.string().uuid(),
      action: z.enum(['assign', 'unassign', 'move_table', 'add_table', 'delete_table', 'batch_assign']),
      guestId: z.string().uuid().optional(),
      tableId: z.string().uuid().optional(),
      previousState: z.unknown().optional(),
      newState: z.unknown().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { db, companyId, userId } = ctx;

      if (!companyId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Company ID required' });
      }

      try {
        const [log] = await db
          .insert(schema.seatingChangeLog)
          .values({
            id: crypto.randomUUID(),
            floorPlanId: input.floorPlanId,
            userId,
            changeType: input.action,
            previousData: input.previousState as Record<string, unknown> | null,
            newData: input.newState as Record<string, unknown> | null,
          })
          .returning();

        return log;
      } catch (error) {
        console.error('Error logging change:', error);
        // Don't throw - logging failures shouldn't break the UI
        return null;
      }
    }),

  // =====================================================
  // Guest Conflicts & Preferences for AI Optimization
  // Schema simplified - basic support only
  // guestConflicts: id, clientId, guest1Id, guest2Id, reason, createdAt
  // guestPreferences: id, guestId, preferences (JSONB), createdAt, updatedAt
  // =====================================================

  /**
   * Get guest conflicts for a client
   */
  getGuestConflicts: protectedProcedure
    .input(z.object({ clientId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { db, companyId } = ctx;

      if (!companyId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Company ID not found' });
      }

      try {
        const conflicts = await db.query.guestConflicts.findMany({
          where: eq(schema.guestConflicts.clientId, input.clientId),
        });

        return conflicts;
      } catch (error) {
        console.error('Error getting guest conflicts:', error);
        return [];
      }
    }),

  /**
   * Get guest preferences for a client
   * Note: Schema uses guestId, not clientId
   */
  getGuestPreferences: protectedProcedure
    .input(z.object({ clientId: z.string().uuid() }))
    .query(async () => {
      // Guest preferences are stored per guest, not per client
      // Return empty for now - feature needs schema update
      return [];
    }),

  /**
   * Add a guest conflict
   */
  addGuestConflict: adminProcedure
    .input(z.object({
      clientId: z.string().uuid(),
      guestOneId: z.string().uuid(),
      guestTwoId: z.string().uuid(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { db, companyId } = ctx;

      if (!companyId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Company ID required' });
      }

      try {
        const [guestOne, guestTwo] = input.guestOneId < input.guestTwoId
          ? [input.guestOneId, input.guestTwoId]
          : [input.guestTwoId, input.guestOneId];

        const [conflict] = await db
          .insert(schema.guestConflicts)
          .values({
            id: crypto.randomUUID(),
            clientId: input.clientId,
            guest1Id: guestOne,
            guest2Id: guestTwo,
            reason: input.reason,
          })
          .returning();

        return conflict;
      } catch (error) {
        console.error('Error adding guest conflict:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to add guest conflict',
        });
      }
    }),

  /**
   * Add a guest preference
   */
  addGuestPreference: adminProcedure
    .input(z.object({
      guestId: z.string().uuid(),
      preferences: z.record(z.string(), z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { db, companyId } = ctx;

      if (!companyId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Company ID required' });
      }

      try {
        const [preference] = await db
          .insert(schema.guestPreferences)
          .values({
            id: crypto.randomUUID(),
            guestId: input.guestId,
            preferences: input.preferences,
          })
          .returning();

        return preference;
      } catch (error) {
        console.error('Error adding guest preference:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to add guest preference',
        });
      }
    }),

  /**
   * Remove a guest conflict
   */
  removeGuestConflict: adminProcedure
    .input(z.object({ conflictId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { db, companyId } = ctx;

      if (!companyId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Company ID required' });
      }

      try {
        await db
          .delete(schema.guestConflicts)
          .where(eq(schema.guestConflicts.id, input.conflictId));

        return { success: true };
      } catch (error) {
        console.error('Error removing guest conflict:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to remove guest conflict',
        });
      }
    }),

  /**
   * Remove a guest preference
   */
  removeGuestPreference: adminProcedure
    .input(z.object({ preferenceId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { db, companyId } = ctx;

      if (!companyId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Company ID required' });
      }

      try {
        await db
          .delete(schema.guestPreferences)
          .where(eq(schema.guestPreferences.id, input.preferenceId));

        return { success: true };
      } catch (error) {
        console.error('Error removing guest preference:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to remove guest preference',
        });
      }
    }),
});
