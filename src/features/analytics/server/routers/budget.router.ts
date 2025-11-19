import { router, adminProcedure } from '@/server/trpc/trpc'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'

export const budgetRouter = router({
  getAll: adminProcedure
    .input(z.object({ clientId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      // Verify client belongs to company
      const { data: client } = await ctx.supabase
        .from('clients')
        .select('id')
        .eq('id', input.clientId)
        .eq('company_id', ctx.companyId)
        .single()

      if (!client) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      // Fetch budget items
      const { data: budgetItems, error } = await ctx.supabase
        .from('budget')
        .select('*')
        .eq('client_id', input.clientId)
        .order('category', { ascending: true })

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message
        })
      }

      return budgetItems || []
    }),

  getById: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      const { data: budgetItem, error } = await ctx.supabase
        .from('budget')
        .select('*')
        .eq('id', input.id)
        .single()

      if (error || !budgetItem) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return budgetItem
    }),

  create: adminProcedure
    .input(z.object({
      clientId: z.string().uuid(),
      category: z.string().min(1),
      itemName: z.string().min(1),
      estimatedCost: z.number().min(0),
      actualCost: z.number().optional(),
      vendorId: z.string().uuid().optional(),
      paymentStatus: z.enum(['pending', 'paid', 'overdue']).default('pending'),
      paymentDate: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      // Verify client
      const { data: client } = await ctx.supabase
        .from('clients')
        .select('id')
        .eq('id', input.clientId)
        .eq('company_id', ctx.companyId)
        .single()

      if (!client) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      // Create budget item
      const { data: budgetItem, error } = await ctx.supabase
        .from('budget')
        .insert({
          client_id: input.clientId,
          category: input.category,
          item: input.itemName,
          estimated_cost: input.estimatedCost,
          actual_cost: input.actualCost,
          vendor_id: input.vendorId,
          payment_status: input.paymentStatus,
          payment_date: input.paymentDate,
          notes: input.notes,
        })
        .select()
        .single()

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message
        })
      }

      return budgetItem
    }),

  update: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      data: z.object({
        category: z.string().optional(),
        itemName: z.string().optional(),
        estimatedCost: z.number().optional(),
        actualCost: z.number().optional(),
        vendorId: z.string().uuid().optional(),
        paymentStatus: z.enum(['pending', 'paid', 'overdue']).optional(),
        paymentDate: z.string().optional(),
        notes: z.string().optional(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      // Build update object
      const updateData: any = {
        updated_at: new Date().toISOString(),
      }

      if (input.data.category !== undefined) updateData.category = input.data.category
      if (input.data.itemName !== undefined) updateData.item = input.data.itemName
      if (input.data.estimatedCost !== undefined) updateData.estimated_cost = input.data.estimatedCost
      if (input.data.actualCost !== undefined) updateData.actual_cost = input.data.actualCost
      if (input.data.vendorId !== undefined) updateData.vendor_id = input.data.vendorId
      if (input.data.paymentStatus !== undefined) updateData.payment_status = input.data.paymentStatus
      if (input.data.paymentDate !== undefined) updateData.payment_date = input.data.paymentDate
      if (input.data.notes !== undefined) updateData.notes = input.data.notes

      // Update budget item
      const { data: budgetItem, error } = await ctx.supabase
        .from('budget')
        .update(updateData)
        .eq('id', input.id)
        .select()
        .single()

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message
        })
      }

      return budgetItem
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      const { error } = await ctx.supabase
        .from('budget')
        .delete()
        .eq('id', input.id)

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message
        })
      }

      return { success: true }
    }),

  getSummary: adminProcedure
    .input(z.object({ clientId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      // Verify client
      const { data: client } = await ctx.supabase
        .from('clients')
        .select('id')
        .eq('id', input.clientId)
        .eq('company_id', ctx.companyId)
        .single()

      if (!client) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      // Get all budget items
      const { data: budgetItems } = await ctx.supabase
        .from('budget')
        .select('estimated_cost, actual_cost, payment_status')
        .eq('client_id', input.clientId)

      const totalEstimated = budgetItems?.reduce((sum, item) => sum + (item.estimated_cost || 0), 0) || 0
      const totalActual = budgetItems?.reduce((sum, item) => sum + (item.actual_cost || 0), 0) || 0
      const difference = totalActual - totalEstimated
      const percentageSpent = totalEstimated > 0 ? (totalActual / totalEstimated) * 100 : 0

      const summary = {
        totalEstimated,
        totalActual,
        difference, // positive = over budget, negative = under budget
        percentageSpent,
        totalItems: budgetItems?.length || 0,
        itemsPaid: budgetItems?.filter(item => item.payment_status === 'paid').length || 0,
        itemsPending: budgetItems?.filter(item => item.payment_status === 'pending').length || 0,
        itemsOverdue: budgetItems?.filter(item => item.payment_status === 'overdue').length || 0,
      }

      return summary
    }),

  getByCategory: adminProcedure
    .input(z.object({
      clientId: z.string().uuid(),
      category: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      // Verify client
      const { data: client } = await ctx.supabase
        .from('clients')
        .select('id')
        .eq('id', input.clientId)
        .eq('company_id', ctx.companyId)
        .single()

      if (!client) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      // Fetch budget items by category
      const { data: budgetItems, error } = await ctx.supabase
        .from('budget')
        .select('*')
        .eq('client_id', input.clientId)
        .eq('category', input.category)
        .order('item', { ascending: true })

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message
        })
      }

      const totalEstimated = budgetItems?.reduce((sum, item) => sum + (item.estimated_cost || 0), 0) || 0
      const totalActual = budgetItems?.reduce((sum, item) => sum + (item.actual_cost || 0), 0) || 0

      return {
        items: budgetItems || [],
        totalEstimated,
        totalActual,
        difference: totalActual - totalEstimated,
      }
    }),

  getCategorySummary: adminProcedure
    .input(z.object({ clientId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      // Verify client
      const { data: client } = await ctx.supabase
        .from('clients')
        .select('id')
        .eq('id', input.clientId)
        .eq('company_id', ctx.companyId)
        .single()

      if (!client) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      // Get all budget items
      const { data: budgetItems } = await ctx.supabase
        .from('budget')
        .select('category, estimated_cost, actual_cost')
        .eq('client_id', input.clientId)

      // Group by category
      const categoryMap = new Map<string, { estimated: number; actual: number; count: number }>()

      budgetItems?.forEach(item => {
        const existing = categoryMap.get(item.category) || { estimated: 0, actual: 0, count: 0 }
        existing.estimated += item.estimated_cost || 0
        existing.actual += item.actual_cost || 0
        existing.count += 1
        categoryMap.set(item.category, existing)
      })

      // Convert to array
      const categorySummary = Array.from(categoryMap.entries()).map(([category, data]) => ({
        category,
        totalEstimated: data.estimated,
        totalActual: data.actual,
        difference: data.actual - data.estimated,
        itemCount: data.count,
        percentageOfTotal: 0, // Will calculate after we have grand total
      }))

      // Calculate percentages
      const grandTotalEstimated = categorySummary.reduce((sum, cat) => sum + cat.totalEstimated, 0)
      categorySummary.forEach(cat => {
        cat.percentageOfTotal = grandTotalEstimated > 0 ? (cat.totalEstimated / grandTotalEstimated) * 100 : 0
      })

      return categorySummary.sort((a, b) => b.totalEstimated - a.totalEstimated)
    }),
})
