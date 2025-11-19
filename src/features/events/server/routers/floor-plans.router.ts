import { router, protectedProcedure, adminProcedure } from '@/server/trpc/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';

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
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID not found',
        });
      }

      const { data, error } = await ctx.supabase
        .from('floor_plans')
        .select('*')
        .eq('client_id', input.clientId)
        .eq('company_id', ctx.companyId)
        .order('created_at', { ascending: false });

      if (error) throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });

      return data || [];
    }),

  /**
   * Get floor plan with all tables and guest assignments
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID not found',
        });
      }

      // Get floor plan
      const { data: floorPlan, error: fpError } = await ctx.supabase
        .from('floor_plans')
        .select('*')
        .eq('id', input.id)
        .eq('company_id', ctx.companyId)
        .maybeSingle();

      if (fpError) throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: fpError.message,
      });

      if (!floorPlan) throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Floor plan not found',
      });

      // Get tables
      const { data: tables, error: tablesError } = await ctx.supabase
        .from('floor_plan_tables')
        .select('*')
        .eq('floor_plan_id', input.id);

      if (tablesError) throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: tablesError.message,
      });

      // Get guest assignments
      const { data: assignments, error: assignError } = await ctx.supabase
        .from('floor_plan_guests')
        .select(`
          *,
          guests!inner(
            id,
            first_name,
            last_name,
            dietary_restrictions,
            has_plus_one
          )
        `)
        .eq('floor_plan_id', input.id);

      if (assignError) throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: assignError.message,
      });

      return {
        ...floorPlan,
        tables: tables || [],
        assignments: assignments || [],
      };
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
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID required',
        });
      }

      const { data, error } = await ctx.supabase
        .from('floor_plans')
        .insert({
          client_id: input.clientId,
          company_id: ctx.companyId,
          name: input.name,
          venue_name: input.venueName,
          event_date: input.eventDate,
          canvas_width: input.canvasWidth,
          canvas_height: input.canvasHeight,
        })
        .select()
        .single();

      if (error) throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });

      return data;
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
      showGrid: z.boolean().optional(),
      gridSize: z.number().int().min(10).max(100).optional(),
      zoomLevel: z.number().min(0.1).max(5.0).optional(),
      panX: z.number().optional(),
      panY: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID required',
        });
      }

      const { id, ...updates } = input;

      const { data, error } = await ctx.supabase
        .from('floor_plans')
        .update({
          name: updates.name,
          venue_name: updates.venueName,
          background_image_url: updates.backgroundImageUrl,
          show_grid: updates.showGrid,
          grid_size: updates.gridSize,
          zoom_level: updates.zoomLevel,
          pan_x: updates.panX,
          pan_y: updates.panY,
        })
        .eq('id', id)
        .eq('company_id', ctx.companyId)
        .select()
        .single();

      if (error) throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });

      return data;
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
      const { data, error } = await ctx.supabase
        .from('floor_plan_tables')
        .insert({
          floor_plan_id: input.floorPlanId,
          table_number: input.tableNumber,
          table_name: input.tableName,
          table_shape: input.tableShape,
          x: input.x,
          y: input.y,
          width: input.width,
          height: input.height,
          capacity: input.capacity,
          min_capacity: input.minCapacity,
          max_capacity: input.maxCapacity,
          fill_color: input.fillColor,
          is_vip: input.isVip,
        })
        .select()
        .single();

      if (error) throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });

      return data;
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
      const { id, ...updates } = input;

      const { data, error } = await ctx.supabase
        .from('floor_plan_tables')
        .update({
          x: updates.x,
          y: updates.y,
          width: updates.width,
          height: updates.height,
          rotation: updates.rotation,
          capacity: updates.capacity,
          fill_color: updates.fillColor,
          table_name: updates.tableName,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });

      return data;
    }),

  /**
   * Delete table
   */
  deleteTable: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('floor_plan_tables')
        .delete()
        .eq('id', input.id);

      if (error) throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });

      return { success: true };
    }),

  /**
   * Assign guest to table
   */
  assignGuest: adminProcedure
    .input(z.object({
      floorPlanId: z.string().uuid(),
      tableId: z.string().uuid(),
      guestId: z.string().uuid(),
      seatNumber: z.number().int().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('floor_plan_guests')
        .insert({
          floor_plan_id: input.floorPlanId,
          table_id: input.tableId,
          guest_id: input.guestId,
          seat_number: input.seatNumber,
        })
        .select()
        .single();

      if (error) {
        if (error.message.includes('capacity exceeded')) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Table is at full capacity',
          });
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        });
      }

      return data;
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
      const { error } = await ctx.supabase
        .from('floor_plan_guests')
        .delete()
        .eq('floor_plan_id', input.floorPlanId)
        .eq('guest_id', input.guestId);

      if (error) throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });

      return { success: true };
    }),

  /**
   * Get unassigned guests for floor plan
   */
  getUnassignedGuests: protectedProcedure
    .input(z.object({ floorPlanId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .rpc('get_unassigned_guests', {
          p_floor_plan_id: input.floorPlanId,
        });

      if (error) throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });

      return data || [];
    }),

  /**
   * Delete floor plan
   */
  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID required',
        });
      }

      const { error } = await ctx.supabase
        .from('floor_plans')
        .delete()
        .eq('id', input.id)
        .eq('company_id', ctx.companyId);

      if (error) throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });

      return { success: true };
    }),
});
