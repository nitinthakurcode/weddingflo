import QRCode from 'qrcode'
import { router, adminProcedure } from '@/server/trpc/trpc'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'

export const qrRouter = router({
  generateForGuest: adminProcedure
    .input(z.object({ guestId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

      // Verify guest belongs to company's client
      const { data: guest } = await ctx.supabase
        .from('guests')
        .select('id, first_name, last_name, client_id')
        .eq('id', input.guestId)
        .single()

      if (!guest) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      // Verify client belongs to company
      const { data: client } = await ctx.supabase
        .from('clients')
        .select('id')
        .eq('id', guest.client_id)
        .eq('company_id', ctx.companyId)
        .single()

      if (!client) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      // Generate QR code (not stored - generated fresh on demand)
      const qrData = JSON.stringify({
        guestId: input.guestId,
        type: 'guest_checkin',
        timestamp: Date.now(),
      })

      const qrCode = await QRCode.toDataURL(qrData, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      })

      return { qrCode, guestId: input.guestId }
    }),

  generateBulk: adminProcedure
    .input(z.object({ clientId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
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

      // Get all guests
      const { data: guests } = await ctx.supabase
        .from('guests')
        .select('id')
        .eq('client_id', input.clientId)

      if (!guests || guests.length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'No guests found' })
      }

      // Generate QR codes for all guests (returned as data URLs, not stored)
      const qrCodes = await Promise.all(
        guests.map(async (guest) => {
          const qrData = JSON.stringify({
            guestId: guest.id,
            type: 'guest_checkin',
            timestamp: Date.now(),
          })

          const qrCode = await QRCode.toDataURL(qrData, {
            width: 300,
            margin: 2,
          })

          return { guestId: guest.id, qrCode }
        })
      )

      return {
        count: guests.length,
        qrCodes,
        message: `Generated ${guests.length} QR codes`,
      }
    }),

  verifyCheckin: adminProcedure
    .input(z.object({ qrData: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

      try {
        const data = JSON.parse(input.qrData)
        const guestId = data.guestId

        // Verify and check in
        const { data: guest } = await ctx.supabase
          .from('guests')
          .select('id, first_name, last_name, client_id')
          .eq('id', guestId)
          .single()

        if (!guest) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Invalid QR code' })
        }

        // Verify client belongs to company
        const { data: client } = await ctx.supabase
          .from('clients')
          .select('id')
          .eq('id', guest.client_id)
          .eq('company_id', ctx.companyId)
          .single()

        if (!client) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Invalid QR code' })
        }

        // Check in guest
        await ctx.supabase
          .from('guests')
          .update({
            checked_in: true,
            checked_in_at: new Date().toISOString(),
          })
          .eq('id', guestId)

        const guestName = `${guest.first_name} ${guest.last_name}`.trim()

        return {
          success: true,
          guestName,
          message: `${guestName} checked in successfully`,
        }
      } catch (error) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid QR code data' })
      }
    }),
})
