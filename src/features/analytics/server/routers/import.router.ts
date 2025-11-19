import { router, adminProcedure } from '@/server/trpc/trpc'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import * as XLSX from 'xlsx'

export const importRouter = router({
  // Download template with existing data
  downloadTemplate: adminProcedure
    .input(z.object({
      module: z.enum(['guests', 'vendors', 'budget', 'gifts']),
      clientId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

      // Verify client access
      const { data: client } = await ctx.supabase
        .from('clients')
        .select('id, partner1_first_name, partner1_last_name')
        .eq('id', input.clientId)
        .eq('company_id', ctx.companyId)
        .single()

      if (!client) throw new TRPCError({ code: 'FORBIDDEN' })

      // Fetch existing data
      const { data: existingData } = await ctx.supabase
        .from(input.module)
        .select('*')
        .eq('client_id', input.clientId)

      // Create Excel template
      const workbook = XLSX.utils.book_new()

      let templateData: any[] = []
      let sheetName = ''

      switch (input.module) {
        case 'guests':
          sheetName = 'Guests'
          templateData = existingData?.map((g: any) => ({
            'ID (Do not modify)': g.id,
            'First Name *': g.first_name,
            'Last Name *': g.last_name,
            'Email': g.email || '',
            'Phone': g.phone || '',
            'Group': g.group_name || '',
            'RSVP Status': g.rsvp_status || 'pending',
            'Dietary Restrictions': g.dietary_restrictions || '',
            'Plus One Allowed (TRUE/FALSE)': g.plus_one_allowed ? 'TRUE' : 'FALSE',
            'Notes': g.notes || '',
          })) || []
          break

        case 'vendors':
          sheetName = 'Vendors'
          templateData = existingData?.map((v: any) => ({
            'ID (Do not modify)': v.id,
            'Vendor Name *': v.name,
            'Category *': v.category,
            'Contact Name': v.contact_name || '',
            'Phone': v.phone || '',
            'Email': v.email || '',
            'Rating': v.rating || '',
            'Notes': v.notes || '',
          })) || []
          break

        case 'budget':
          sheetName = 'Budget'
          templateData = existingData?.map((b: any) => ({
            'ID (Do not modify)': b.id,
            'Item *': b.item,
            'Category *': b.category,
            'Estimated Cost *': b.estimated_cost || 0,
            'Actual Cost': b.actual_cost || '',
            'Payment Status': b.payment_status || '',
            'Notes': b.notes || '',
          })) || []
          break

        case 'gifts':
          sheetName = 'Gifts'
          templateData = existingData?.map((g: any) => ({
            'ID (Do not modify)': g.id,
            'Gift Name *': g.gift_name,
            'From Name': g.from_name || '',
            'From Email': g.from_email || '',
            'Delivery Status': g.delivery_status || '',
            'Thank You Sent (TRUE/FALSE)': g.thank_you_sent ? 'TRUE' : 'FALSE',
          })) || []
          break
      }

      const worksheet = XLSX.utils.json_to_sheet(templateData)
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
      const base64 = Buffer.from(buffer).toString('base64')

      const clientName = `${client.partner1_first_name}_${client.partner1_last_name}`;
      return {
        filename: `${clientName}_${sheetName}_Template.xlsx`,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        data: base64,
      }
    }),

  // Upload and import data
  importData: adminProcedure
    .input(z.object({
      module: z.enum(['guests', 'vendors', 'budget', 'gifts']),
      clientId: z.string().uuid(),
      fileData: z.string(), // base64 encoded Excel/CSV
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

      // Verify client access
      const { data: client } = await ctx.supabase
        .from('clients')
        .select('id')
        .eq('id', input.clientId)
        .eq('company_id', ctx.companyId)
        .single()

      if (!client) throw new TRPCError({ code: 'FORBIDDEN' })

      // Parse uploaded file (SECURE: using xlsx 0.20.2)
      const buffer = Buffer.from(input.fileData, 'base64')
      const workbook = XLSX.read(buffer, { type: 'buffer' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet)

      // Import results
      const results = {
        updated: 0,
        created: 0,
        errors: [] as string[]
      }

      // Process each row
      for (const [index, row] of jsonData.entries()) {
        const rowNum = index + 2 // Excel row (1-indexed + header)

        try {
          switch (input.module) {
            case 'guests':
              await importGuest(ctx, input.clientId, row as any, results, rowNum)
              break
            case 'vendors':
              await importVendor(ctx, input.clientId, row as any, results, rowNum)
              break
            case 'budget':
              await importBudget(ctx, input.clientId, row as any, results, rowNum)
              break
            case 'gifts':
              await importGift(ctx, input.clientId, row as any, results, rowNum)
              break
          }
        } catch (error: any) {
          results.errors.push(`Row ${rowNum}: ${error.message}`)
        }
      }

      return results
    }),
})

// Helper: Import Guest
async function importGuest(ctx: any, clientId: string, row: any, results: any, rowNum: number) {
  const id = row['ID (Do not modify)']
  const name = row['Name *']

  if (!name) throw new Error('Name is required')

  const guestData = {
    name,
    email: row['Email'] || null,
    phone: row['Phone'] || null,
    group: row['Group'] || null,
    rsvp_status: row['RSVP Status'] || 'pending',
    dietary_restrictions: row['Dietary Restrictions'] || null,
    plus_one: row['Plus One (TRUE/FALSE)'] === 'TRUE',
    notes: row['Notes'] || null,
  }

  if (id) {
    // Update existing
    const { error } = await ctx.supabase
      .from('guests')
      .update(guestData)
      .eq('id', id)
      .eq('client_id', clientId)

    if (error) throw new Error(error.message)
    results.updated++
  } else {
    // Create new
    const { error } = await ctx.supabase
      .from('guests')
      .insert({ ...guestData, client_id: clientId, company_id: ctx.companyId })

    if (error) throw new Error(error.message)
    results.created++
  }
}

// Helper: Import Vendor
async function importVendor(ctx: any, clientId: string, row: any, results: any, rowNum: number) {
  const id = row['ID (Do not modify)']
  const vendorName = row['Vendor Name *']
  const category = row['Category *']

  if (!vendorName || !category) throw new Error('Vendor Name and Category are required')

  const vendorData = {
    vendor_name: vendorName,
    category,
    contact_name: row['Contact Name'] || null,
    phone: row['Phone'] || null,
    email: row['Email'] || null,
    cost: row['Cost'] ? parseFloat(row['Cost'].toString().replace(/[^0-9.-]/g, '')) : null,
    payment_status: row['Payment Status'] || 'pending',
  }

  if (id) {
    const { error } = await ctx.supabase
      .from('vendors')
      .update(vendorData)
      .eq('id', id)
      .eq('client_id', clientId)

    if (error) throw new Error(error.message)
    results.updated++
  } else {
    const { error } = await ctx.supabase
      .from('vendors')
      .insert({ ...vendorData, client_id: clientId, company_id: ctx.companyId })

    if (error) throw new Error(error.message)
    results.created++
  }
}

// Helper: Import Budget
async function importBudget(ctx: any, clientId: string, row: any, results: any, rowNum: number) {
  const id = row['ID (Do not modify)']
  const category = row['Category *']
  const estimatedCost = row['Estimated Cost *']

  if (!category || !estimatedCost) throw new Error('Category and Estimated Cost are required')

  const budgetData = {
    category,
    estimated_cost: parseFloat(estimatedCost.toString().replace(/[^0-9.-]/g, '')),
    actual_cost: row['Actual Cost'] ? parseFloat(row['Actual Cost'].toString().replace(/[^0-9.-]/g, '')) : null,
    payment_status: row['Payment Status'] || 'pending',
    notes: row['Notes'] || null,
  }

  if (id) {
    const { error } = await ctx.supabase
      .from('budget')
      .update(budgetData)
      .eq('id', id)
      .eq('client_id', clientId)

    if (error) throw new Error(error.message)
    results.updated++
  } else {
    const { error } = await ctx.supabase
      .from('budget')
      .insert({ ...budgetData, client_id: clientId, company_id: ctx.companyId })

    if (error) throw new Error(error.message)
    results.created++
  }
}

// Helper: Import Gift
async function importGift(ctx: any, clientId: string, row: any, results: any, rowNum: number) {
  const id = row['ID (Do not modify)']
  const giftName = row['Gift Name *']

  if (!giftName) throw new Error('Gift Name is required')

  const giftData = {
    gift_name: giftName,
    from_name: row['From Name'] || null,
    delivery_status: row['Delivery Status'] || 'pending',
    thank_you_sent: row['Thank You Sent (TRUE/FALSE)'] === 'TRUE',
  }

  if (id) {
    const { error } = await ctx.supabase
      .from('gifts')
      .update(giftData)
      .eq('id', id)
      .eq('client_id', clientId)

    if (error) throw new Error(error.message)
    results.updated++
  } else {
    const { error } = await ctx.supabase
      .from('gifts')
      .insert({ ...giftData, client_id: clientId, company_id: ctx.companyId })

    if (error) throw new Error(error.message)
    results.created++
  }
}
