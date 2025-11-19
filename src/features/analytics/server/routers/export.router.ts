import { router, adminProcedure } from '@/server/trpc/trpc'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { exportToExcel, exportToPDF } from '@/lib/export/export-utils'

export const exportRouter = router({
  exportClientData: adminProcedure
    .input(z.object({
      clientId: z.string().uuid(),
      format: z.enum(['excel', 'pdf']),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

      // Verify client belongs to company
      const { data: client } = await ctx.supabase
        .from('clients')
        .select('*')
        .eq('id', input.clientId)
        .eq('company_id', ctx.companyId)
        .single()

      if (!client) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      // Get company info
      const { data: company } = await ctx.supabase
        .from('companies')
        .select('name, logo_url')
        .eq('id', ctx.companyId)
        .single()

      // Fetch all data in parallel
      const [guests, hotels, gifts, vendors, budget, events, timeline, documents] = await Promise.all([
        ctx.supabase.from('guests').select('*').eq('client_id', input.clientId),
        ctx.supabase.from('hotels').select('*').eq('client_id', input.clientId),
        ctx.supabase.from('gifts').select('*').eq('client_id', input.clientId),
        ctx.supabase.from('vendors').select('*').eq('client_id', input.clientId),
        ctx.supabase.from('budget').select('*').eq('client_id', input.clientId),
        ctx.supabase.from('events').select('*').eq('client_id', input.clientId),
        ctx.supabase.from('timeline').select('*').eq('client_id', input.clientId),
        ctx.supabase.from('documents').select('*').eq('client_id', input.clientId),
      ])

      const exportData = {
        company: {
          name: company!.name,
          logo_url: company!.logo_url || undefined,
        },
        client: {
          name: `${client.partner1_first_name} ${client.partner1_last_name}${client.partner2_first_name ? ` & ${client.partner2_first_name} ${client.partner2_last_name}` : ''}`,
          wedding_date: client.wedding_date || 'TBD',
        },
        guests: guests.data || [],
        hotels: hotels.data || [],
        gifts: gifts.data || [],
        vendors: vendors.data || [],
        budget: budget.data || [],
        events: events.data || [],
        timeline: timeline.data || [],
        documents: documents.data || [],
      }

      // Generate export
      let buffer: ArrayBuffer
      let filename: string
      let mimeType: string

      if (input.format === 'excel') {
        buffer = await exportToExcel(exportData)
        filename = `${exportData.client.name.replace(/\s/g, '_')}_Wedding_Data.xlsx`
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      } else {
        buffer = await exportToPDF(exportData)
        filename = `${exportData.client.name.replace(/\s/g, '_')}_Wedding_Data.pdf`
        mimeType = 'application/pdf'
      }

      // Convert to base64
      const base64 = Buffer.from(buffer).toString('base64')

      return {
        filename,
        mimeType,
        data: base64,
      }
    }),
})
