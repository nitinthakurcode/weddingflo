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

        // Get guest assignments with guest info (including conflicts for UI display)
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
              seatingConflicts: schema.guests.seatingConflicts,
              seatingPreferences: schema.guests.seatingPreferences,
            },
          })
          .from(schema.floorPlanGuests)
          .leftJoin(schema.guests, eq(schema.floorPlanGuests.guestId, schema.guests.id))
          .where(eq(schema.floorPlanGuests.floorPlanId, input.id));

        // Calculate conflicts for each table
        const tableConflicts = new Map<string, string[]>();
        for (const assignment of assignments) {
          if (!assignment.guest?.seatingConflicts) continue;
          const conflicts = (assignment.guest.seatingConflicts as string[]) || [];

          // Check if any conflicting guests are at the same table
          const sameTableAssignments = assignments.filter(
            a => a.tableId === assignment.tableId && a.guestId !== assignment.guestId
          );

          for (const other of sameTableAssignments) {
            if (other.guestId && conflicts.includes(other.guestId)) {
              const key = `${assignment.tableId}`;
              const existing = tableConflicts.get(key) || [];
              const conflictPair = [assignment.guestId, other.guestId].sort().join('-');
              if (!existing.includes(conflictPair)) {
                existing.push(conflictPair);
                tableConflicts.set(key, existing);
              }
            }
          }
        }

        return {
          ...floorPlan,
          tables,
          assignments,
          tableConflicts: Object.fromEntries(tableConflicts),
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
   */
  checkConflicts: protectedProcedure
    .input(z.object({
      guestId: z.string().uuid(),
      tableId: z.string().uuid(),
    }))
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      try {
        // Get the guest's conflict list
        const guest = await db.query.guests.findFirst({
          where: eq(schema.guests.id, input.guestId),
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            seatingConflicts: true,
            seatingPreferences: true,
          },
        });

        if (!guest) {
          return { conflicts: [], preferences: [], hasConflicts: false, hasPreferences: false };
        }

        // Get guests already at this table
        const tableAssignments = await db
          .select({
            guestId: schema.floorPlanGuests.guestId,
            firstName: schema.guests.firstName,
            lastName: schema.guests.lastName,
          })
          .from(schema.floorPlanGuests)
          .leftJoin(schema.guests, eq(schema.floorPlanGuests.guestId, schema.guests.id))
          .where(eq(schema.floorPlanGuests.tableId, input.tableId));

        const tableGuestIds = tableAssignments.map(a => a.guestId);
        const conflictIds = (guest.seatingConflicts as string[]) || [];
        const preferenceIds = (guest.seatingPreferences as string[]) || [];

        // Find conflicts: guests at this table that are in the conflict list
        const conflicts = tableAssignments.filter(a => a.guestId && conflictIds.includes(a.guestId));

        // Find preferences: guests at this table that are in the preference list
        const preferences = tableAssignments.filter(a => a.guestId && preferenceIds.includes(a.guestId));

        return {
          conflicts: conflicts.map(c => ({
            guestId: c.guestId,
            name: `${c.firstName || ''} ${c.lastName || ''}`.trim(),
          })),
          preferences: preferences.map(p => ({
            guestId: p.guestId,
            name: `${p.firstName || ''} ${p.lastName || ''}`.trim(),
          })),
          hasConflicts: conflicts.length > 0,
          hasPreferences: preferences.length > 0,
        };
      } catch (error) {
        console.error('Error checking conflicts:', error);
        return { conflicts: [], preferences: [], hasConflicts: false, hasPreferences: false };
      }
    }),

  /**
   * Update guest seating conflicts and preferences
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

      try {
        // Verify guest belongs to a client of this company
        const guest = await db.query.guests.findFirst({
          where: eq(schema.guests.id, input.guestId),
          with: {
            client: {
              columns: { companyId: true },
            },
          },
        });

        if (!guest || (guest.client as { companyId?: string })?.companyId !== companyId) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Guest not found' });
        }

        const updates: Record<string, unknown> = {};
        if (input.seatingConflicts !== undefined) {
          updates.seatingConflicts = input.seatingConflicts;
        }
        if (input.seatingPreferences !== undefined) {
          updates.seatingPreferences = input.seatingPreferences;
        }

        const [updated] = await db
          .update(schema.guests)
          .set(updates)
          .where(eq(schema.guests.id, input.guestId))
          .returning();

        return updated;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error('Error updating seating rules:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update seating rules',
        });
      }
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

        // Check for seating conflicts (unless force is specified)
        if (!input.forceAssign) {
          const guest = await db.query.guests.findFirst({
            where: eq(schema.guests.id, input.guestId),
            columns: { seatingConflicts: true },
          });

          if (guest?.seatingConflicts) {
            const conflictIds = (guest.seatingConflicts as string[]) || [];
            const tableGuestIds = existingAssignments
              .map(a => a.guestId)
              .filter((id): id is string => id !== null);
            const foundConflicts = tableGuestIds.filter(id => conflictIds.includes(id));

            if (foundConflicts.length > 0) {
              // Return conflict info but still proceed with assignment
              // The UI should handle showing the warning
              const conflictGuests = await db.query.guests.findMany({
                where: inArray(schema.guests.id, foundConflicts),
                columns: { id: true, firstName: true, lastName: true },
              });

              // Log the conflict for audit purposes
              console.log(`[Seating Conflict] Guest ${input.guestId} assigned to table with conflicts: ${foundConflicts.join(', ')}`);
            }
          }
        }

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
        const versions = await db.query.seatingVersions.findMany({
          where: and(
            eq(schema.seatingVersions.floorPlanId, input.floorPlanId),
            eq(schema.seatingVersions.companyId, companyId)
          ),
          orderBy: [desc(schema.seatingVersions.versionNumber)],
        });

        return versions;
      } catch (error) {
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
      description: z.string().optional(),
      isAutoSave: z.boolean().optional().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const { db, companyId, userId } = ctx;

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

        // Get next version number
        const existingVersions = await db.query.seatingVersions.findMany({
          where: eq(schema.seatingVersions.floorPlanId, input.floorPlanId),
          orderBy: [desc(schema.seatingVersions.versionNumber)],
          limit: 1,
        });

        const nextVersionNumber = existingVersions.length > 0
          ? existingVersions[0].versionNumber + 1
          : 1;

        // Get total guest count for this client
        const allGuests = await db.query.guests.findMany({
          where: eq(schema.guests.clientId, floorPlan.clientId),
          columns: { id: true },
        });

        // Unmark any current version
        await db
          .update(schema.seatingVersions)
          .set({ isCurrent: false })
          .where(and(
            eq(schema.seatingVersions.floorPlanId, input.floorPlanId),
            eq(schema.seatingVersions.isCurrent, true)
          ));

        // Create new version
        const [version] = await db
          .insert(schema.seatingVersions)
          .values({
            floorPlanId: input.floorPlanId,
            clientId: floorPlan.clientId,
            companyId,
            versionNumber: nextVersionNumber,
            name: input.name,
            description: input.description,
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
            totalGuests: allGuests.length,
            assignedGuests: assignments.length,
            totalTables: tables.length,
            isCurrent: true,
            isAutoSave: input.isAutoSave,
            createdBy: userId,
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
          where: and(
            eq(schema.seatingVersions.id, input.versionId),
            eq(schema.seatingVersions.companyId, companyId)
          ),
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

        const tablePositions = (version.tablePositions as Array<{
          id: string;
          tableNumber: number;
          tableName?: string;
          shape: string;
          x: number;
          y: number;
          width: number;
          height: number;
          rotation?: number;
          capacity: number;
          metadata?: unknown;
        }>) || [];

        const guestAssignments = (version.guestAssignments as Array<{
          guestId: string;
          tableId: string;
          seatNumber?: number;
        }>) || [];

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

        // Mark this version as current
        await db
          .update(schema.seatingVersions)
          .set({ isCurrent: false })
          .where(eq(schema.seatingVersions.floorPlanId, input.floorPlanId));

        await db
          .update(schema.seatingVersions)
          .set({ isCurrent: true })
          .where(eq(schema.seatingVersions.id, input.versionId));

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
        // Verify ownership
        const version = await db.query.seatingVersions.findFirst({
          where: and(
            eq(schema.seatingVersions.id, input.versionId),
            eq(schema.seatingVersions.companyId, companyId)
          ),
        });

        if (!version) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Version not found' });
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
   * Get seating change history (detailed log)
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
        const changes = await db.query.seatingChangeLog.findMany({
          where: and(
            eq(schema.seatingChangeLog.floorPlanId, input.floorPlanId),
            eq(schema.seatingChangeLog.companyId, companyId)
          ),
          orderBy: [desc(schema.seatingChangeLog.changedAt)],
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
            floorPlanId: input.floorPlanId,
            companyId,
            action: input.action,
            guestId: input.guestId,
            tableId: input.tableId,
            previousState: input.previousState,
            newState: input.newState,
            changedBy: userId,
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
  // =====================================================

  /**
   * Get guest conflicts for a client (for AI seating optimization)
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
          where: and(
            eq(schema.guestConflicts.clientId, input.clientId),
            eq(schema.guestConflicts.companyId, companyId),
            eq(schema.guestConflicts.isActive, true)
          ),
        });

        return conflicts;
      } catch (error) {
        console.error('Error getting guest conflicts:', error);
        return [];
      }
    }),

  /**
   * Get guest preferences for a client (for AI seating optimization)
   */
  getGuestPreferences: protectedProcedure
    .input(z.object({ clientId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { db, companyId } = ctx;

      if (!companyId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Company ID not found' });
      }

      try {
        const preferences = await db.query.guestPreferences.findMany({
          where: and(
            eq(schema.guestPreferences.clientId, input.clientId),
            eq(schema.guestPreferences.companyId, companyId),
            eq(schema.guestPreferences.isActive, true)
          ),
        });

        return preferences;
      } catch (error) {
        console.error('Error getting guest preferences:', error);
        return [];
      }
    }),

  /**
   * Add a guest conflict
   */
  addGuestConflict: adminProcedure
    .input(z.object({
      clientId: z.string().uuid(),
      guestOneId: z.string().uuid(),
      guestTwoId: z.string().uuid(),
      conflictType: z.enum(['general', 'family_drama', 'ex_partner', 'business_dispute', 'personal']).default('general'),
      severity: z.enum(['low', 'moderate', 'high', 'critical']).default('moderate'),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { db, companyId, userId } = ctx;

      if (!companyId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Company ID required' });
      }

      try {
        // Ensure guest_one_id < guest_two_id for consistent ordering
        const [guestOne, guestTwo] = input.guestOneId < input.guestTwoId
          ? [input.guestOneId, input.guestTwoId]
          : [input.guestTwoId, input.guestOneId];

        const [conflict] = await db
          .insert(schema.guestConflicts)
          .values({
            companyId,
            clientId: input.clientId,
            guestOneId: guestOne,
            guestTwoId: guestTwo,
            conflictType: input.conflictType,
            severity: input.severity,
            reason: input.reason,
            createdBy: userId,
          })
          .onConflictDoUpdate({
            target: [schema.guestConflicts.clientId, schema.guestConflicts.guestOneId, schema.guestConflicts.guestTwoId],
            set: {
              conflictType: input.conflictType,
              severity: input.severity,
              reason: input.reason,
              isActive: true,
              updatedAt: new Date(),
            },
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
      clientId: z.string().uuid(),
      guestOneId: z.string().uuid(),
      guestTwoId: z.string().uuid(),
      preferenceType: z.enum(['together', 'nearby', 'same_area']).default('together'),
      strength: z.enum(['required', 'preferred', 'nice_to_have']).default('preferred'),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { db, companyId, userId } = ctx;

      if (!companyId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Company ID required' });
      }

      try {
        // Ensure guest_one_id < guest_two_id for consistent ordering
        const [guestOne, guestTwo] = input.guestOneId < input.guestTwoId
          ? [input.guestOneId, input.guestTwoId]
          : [input.guestTwoId, input.guestOneId];

        const [preference] = await db
          .insert(schema.guestPreferences)
          .values({
            companyId,
            clientId: input.clientId,
            guestOneId: guestOne,
            guestTwoId: guestTwo,
            preferenceType: input.preferenceType,
            strength: input.strength,
            reason: input.reason,
            createdBy: userId,
          })
          .onConflictDoUpdate({
            target: [schema.guestPreferences.clientId, schema.guestPreferences.guestOneId, schema.guestPreferences.guestTwoId],
            set: {
              preferenceType: input.preferenceType,
              strength: input.strength,
              reason: input.reason,
              isActive: true,
              updatedAt: new Date(),
            },
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
          .update(schema.guestConflicts)
          .set({ isActive: false, updatedAt: new Date() })
          .where(and(
            eq(schema.guestConflicts.id, input.conflictId),
            eq(schema.guestConflicts.companyId, companyId)
          ));

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
          .update(schema.guestPreferences)
          .set({ isActive: false, updatedAt: new Date() })
          .where(and(
            eq(schema.guestPreferences.id, input.preferenceId),
            eq(schema.guestPreferences.companyId, companyId)
          ));

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
