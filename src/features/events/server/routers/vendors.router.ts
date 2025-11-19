import { router, adminProcedure } from '@/server/trpc/trpc'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'

export const vendorsRouter = router({
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

      // Fetch client_vendors with vendor details
      const { data: clientVendors, error } = await ctx.supabase
        .from('client_vendors')
        .select(`
          *,
          vendor:vendors (
            id,
            name,
            category,
            contact_name,
            email,
            phone,
            website,
            contract_signed,
            contract_date,
            deposit_paid,
            payment_status,
            notes
          )
        `)
        .eq('client_id', input.clientId)

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message
        })
      }

      // Flatten the response to combine client_vendors and vendor data
      const vendors = clientVendors?.map(cv => ({
        id: cv.id,
        vendor_id: cv.vendor_id,
        client_id: cv.client_id,
        // From vendors table
        name: cv.vendor?.name,
        category: cv.vendor?.category,
        contact_name: cv.vendor?.contact_name,
        email: cv.vendor?.email,
        phone: cv.vendor?.phone,
        website: cv.vendor?.website,
        contract_signed: cv.vendor?.contract_signed,
        contract_date: cv.vendor?.contract_date,
        deposit_paid: cv.deposit_paid,
        payment_status: cv.payment_status,
        notes: cv.notes || cv.vendor?.notes,
        // From client_vendors table
        contract_amount: cv.contract_amount,
        deposit_amount: cv.deposit_amount,
        service_date: cv.service_date,
        contract_signed_at: cv.contract_signed_at,
      })) || []

      return vendors
    }),

  getById: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      const { data: clientVendor, error } = await ctx.supabase
        .from('client_vendors')
        .select(`
          *,
          vendor:vendors (*)
        `)
        .eq('id', input.id)
        .single()

      if (error || !clientVendor) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return {
        ...clientVendor,
        ...clientVendor.vendor
      }
    }),

  create: adminProcedure
    .input(z.object({
      clientId: z.string().uuid(),
      vendorName: z.string().min(1),
      category: z.string().min(1),
      contactName: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      website: z.string().url().optional(),
      contractSigned: z.boolean().optional(),
      contractDate: z.string().optional(),
      cost: z.number().optional(),
      depositAmount: z.number().optional(),
      depositPaid: z.boolean().optional(),
      paymentStatus: z.enum(['pending', 'paid', 'overdue']).optional(),
      serviceDate: z.string().optional(),
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

      // First, create or get vendor in vendors table
      const { data: vendor, error: vendorError } = await ctx.supabase
        .from('vendors')
        .insert({
          company_id: ctx.companyId,
          name: input.vendorName,
          category: input.category as any,
          contact_name: input.contactName,
          email: input.email,
          phone: input.phone,
          website: input.website,
          contract_signed: input.contractSigned || false,
          contract_date: input.contractDate,
          deposit_paid: input.depositPaid || false,
          payment_status: input.paymentStatus || 'pending',
          notes: input.notes,
        })
        .select()
        .single()

      if (vendorError || !vendor) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: vendorError?.message || 'Failed to create vendor'
        })
      }

      // Then create client_vendor relationship
      const { data: clientVendor, error: cvError } = await ctx.supabase
        .from('client_vendors')
        .insert({
          client_id: input.clientId,
          vendor_id: vendor.id,
          contract_amount: input.cost,
          deposit_amount: input.depositAmount,
          service_date: input.serviceDate,
          deposit_paid: input.depositPaid || false,
          payment_status: input.paymentStatus || 'pending',
          notes: input.notes,
        })
        .select()
        .single()

      if (cvError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: cvError.message
        })
      }

      return {
        ...clientVendor,
        ...vendor
      }
    }),

  update: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      data: z.object({
        vendorName: z.string().optional(),
        category: z.string().optional(),
        contactName: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        website: z.string().url().optional(),
        contractSigned: z.boolean().optional(),
        contractDate: z.string().optional(),
        cost: z.number().optional(),
        depositAmount: z.number().optional(),
        depositPaid: z.boolean().optional(),
        paymentStatus: z.enum(['pending', 'paid', 'overdue']).optional(),
        serviceDate: z.string().optional(),
        notes: z.string().optional(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      // Get the client_vendor record to find the vendor_id
      const { data: clientVendor } = await ctx.supabase
        .from('client_vendors')
        .select('vendor_id, client_id')
        .eq('id', input.id)
        .single()

      if (!clientVendor) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      // Update vendor table fields
      const vendorUpdateData: any = {}
      if (input.data.vendorName !== undefined) vendorUpdateData.name = input.data.vendorName
      if (input.data.category !== undefined) vendorUpdateData.category = input.data.category
      if (input.data.contactName !== undefined) vendorUpdateData.contact_name = input.data.contactName
      if (input.data.email !== undefined) vendorUpdateData.email = input.data.email
      if (input.data.phone !== undefined) vendorUpdateData.phone = input.data.phone
      if (input.data.website !== undefined) vendorUpdateData.website = input.data.website
      if (input.data.contractSigned !== undefined) vendorUpdateData.contract_signed = input.data.contractSigned
      if (input.data.contractDate !== undefined) vendorUpdateData.contract_date = input.data.contractDate

      if (Object.keys(vendorUpdateData).length > 0) {
        await ctx.supabase
          .from('vendors')
          .update(vendorUpdateData)
          .eq('id', clientVendor.vendor_id)
      }

      // Update client_vendors table fields
      const cvUpdateData: any = {}
      if (input.data.cost !== undefined) cvUpdateData.contract_amount = input.data.cost
      if (input.data.depositAmount !== undefined) cvUpdateData.deposit_amount = input.data.depositAmount
      if (input.data.depositPaid !== undefined) cvUpdateData.deposit_paid = input.data.depositPaid
      if (input.data.paymentStatus !== undefined) cvUpdateData.payment_status = input.data.paymentStatus
      if (input.data.serviceDate !== undefined) cvUpdateData.service_date = input.data.serviceDate
      if (input.data.notes !== undefined) cvUpdateData.notes = input.data.notes

      if (Object.keys(cvUpdateData).length > 0) {
        const { error } = await ctx.supabase
          .from('client_vendors')
          .update(cvUpdateData)
          .eq('id', input.id)

        if (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message
          })
        }
      }

      return { success: true }
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      // Delete from client_vendors (vendor remains in vendors table for reuse)
      const { error } = await ctx.supabase
        .from('client_vendors')
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

  updatePaymentStatus: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      paymentStatus: z.enum(['pending', 'paid', 'overdue']),
      depositPaid: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      const updateData: any = {
        payment_status: input.paymentStatus,
      }

      if (input.depositPaid !== undefined) {
        updateData.deposit_paid = input.depositPaid
      }

      const { data: clientVendor, error } = await ctx.supabase
        .from('client_vendors')
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

      return clientVendor
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

      // Fetch vendors by category
      const { data: clientVendors, error } = await ctx.supabase
        .from('client_vendors')
        .select(`
          *,
          vendor:vendors!inner (*)
        `)
        .eq('client_id', input.clientId)
        .eq('vendor.category', input.category)

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message
        })
      }

      return clientVendors || []
    }),

  getStats: adminProcedure
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

      // Get client_vendors with vendor data
      const { data: clientVendors } = await ctx.supabase
        .from('client_vendors')
        .select(`
          contract_amount,
          payment_status,
          deposit_paid,
          vendor:vendors (contract_signed)
        `)
        .eq('client_id', input.clientId)

      const totalCost = clientVendors?.reduce((sum, v) => sum + (v.contract_amount || 0), 0) || 0
      const paidAmount = clientVendors?.filter(v => v.payment_status === 'paid').reduce((sum, v) => sum + (v.contract_amount || 0), 0) || 0
      const pendingAmount = totalCost - paidAmount

      const stats = {
        total: clientVendors?.length || 0,
        totalCost,
        paidAmount,
        pendingAmount,
        contractsSigned: clientVendors?.filter(v => v.vendor?.contract_signed).length || 0,
        contractsPending: clientVendors?.filter(v => !v.vendor?.contract_signed).length || 0,
        paymentPending: clientVendors?.filter(v => v.payment_status === 'pending').length || 0,
        paymentOverdue: clientVendors?.filter(v => v.payment_status === 'overdue').length || 0,
      }

      return stats
    }),
})
