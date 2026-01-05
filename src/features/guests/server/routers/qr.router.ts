import QRCode from 'qrcode';
import { router, adminProcedure } from '@/server/trpc/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq, and } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';
import { generateGuestQRToken } from '@/lib/qr/qr-encryptor';

/**
 * QR Code Router - Drizzle ORM (December 2025 Update)
 *
 * Uses BetterAuth session for authorization
 * - ctx.companyId - from session
 * - ctx.db - Drizzle database client
 *
 * Generates secure encrypted QR codes for:
 * - check-in: Staff scans to check in guest
 * - rsvp: Guest scans to fill RSVP form with all 11 fields
 * - guest-form: Guest scans to self-register (for new guests)
 */
export const qrRouter = router({
  /**
   * Generate QR code for a single guest (encrypted token)
   */
  generateForGuest: adminProcedure
    .input(z.object({
      guestId: z.string().uuid(),
      type: z.enum(['check-in', 'rsvp', 'guest-form']).default('rsvp'),
      baseUrl: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { db, companyId } = ctx;

      if (!companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }

      // Verify guest exists
      const [guest] = await db
        .select({
          id: schema.guests.id,
          firstName: schema.guests.firstName,
          lastName: schema.guests.lastName,
          clientId: schema.guests.clientId,
        })
        .from(schema.guests)
        .where(eq(schema.guests.id, input.guestId))
        .limit(1);

      if (!guest) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      // Verify client belongs to company
      const [client] = await db
        .select({ id: schema.clients.id })
        .from(schema.clients)
        .where(
          and(
            eq(schema.clients.id, guest.clientId),
            eq(schema.clients.companyId, companyId)
          )
        )
        .limit(1);

      if (!client) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      // Generate encrypted QR token (secure, time-limited)
      const encryptedData = generateGuestQRToken(
        input.guestId,
        guest.clientId,
        input.type,
        24 * 365 // 1 year expiry
      );

      // Build QR code URL
      const baseUrl = input.baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const qrUrl = `${baseUrl}/en/qr/${encryptedData.token}`;

      // Generate QR code image
      const qrCode = await QRCode.toDataURL(qrUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
        errorCorrectionLevel: 'H', // High error correction for better scanning
      });

      const guestName = `${guest.firstName} ${guest.lastName}`.trim();

      return {
        qrCode,
        qrUrl,
        guestId: input.guestId,
        guestName,
        type: input.type,
        expiresAt: encryptedData.expiresAt,
      };
    }),

  /**
   * Generate QR codes for all guests of a client (encrypted)
   */
  generateBulk: adminProcedure
    .input(z.object({
      clientId: z.string().uuid(),
      type: z.enum(['check-in', 'rsvp', 'guest-form']).default('rsvp'),
      baseUrl: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { db, companyId } = ctx;

      if (!companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }

      // Verify client belongs to company
      const [client] = await db
        .select({ id: schema.clients.id })
        .from(schema.clients)
        .where(
          and(
            eq(schema.clients.id, input.clientId),
            eq(schema.clients.companyId, companyId)
          )
        )
        .limit(1);

      if (!client) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      // Get all guests
      const guests = await db
        .select({
          id: schema.guests.id,
          firstName: schema.guests.firstName,
          lastName: schema.guests.lastName,
        })
        .from(schema.guests)
        .where(eq(schema.guests.clientId, input.clientId));

      if (!guests || guests.length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'No guests found' });
      }

      const baseUrl = input.baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

      // Generate encrypted QR codes for all guests
      const qrCodes = await Promise.all(
        guests.map(async (guest) => {
          const encryptedData = generateGuestQRToken(
            guest.id,
            input.clientId,
            input.type,
            24 * 365
          );

          const qrUrl = `${baseUrl}/en/qr/${encryptedData.token}`;

          const qrCode = await QRCode.toDataURL(qrUrl, {
            width: 300,
            margin: 2,
            errorCorrectionLevel: 'H',
          });

          return {
            guestId: guest.id,
            guestName: `${guest.firstName} ${guest.lastName}`.trim(),
            qrCode,
            qrUrl,
          };
        })
      );

      return {
        count: guests.length,
        qrCodes,
        message: `Generated ${guests.length} QR codes`,
      };
    }),

  /**
   * Generate a single QR code for client-level guest registration
   * This QR links to the public guest registration form
   */
  generateClientFormQR: adminProcedure
    .input(z.object({
      clientId: z.string().uuid(),
      baseUrl: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { db, companyId } = ctx;

      if (!companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }

      // Verify client belongs to company
      const [client] = await db
        .select({
          id: schema.clients.id,
          weddingName: schema.clients.weddingName,
          partner1FirstName: schema.clients.partner1FirstName,
          partner2FirstName: schema.clients.partner2FirstName,
        })
        .from(schema.clients)
        .where(
          and(
            eq(schema.clients.id, input.clientId),
            eq(schema.clients.companyId, companyId)
          )
        )
        .limit(1);

      if (!client) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      // Build registration form URL
      const baseUrl = input.baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const formUrl = `${baseUrl}/en/guest-register/${input.clientId}`;

      // Generate QR code for the form URL
      const qrCode = await QRCode.toDataURL(formUrl, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
        errorCorrectionLevel: 'H',
      });

      const weddingName = client.weddingName ||
        `${client.partner1FirstName || ''} & ${client.partner2FirstName || ''}`.trim();

      return {
        qrCode,
        formUrl,
        clientId: input.clientId,
        weddingName,
        description: 'Guests can scan this QR to register for the wedding',
      };
    }),

  /**
   * Verify QR code and check in guest
   */
  verifyCheckin: adminProcedure
    .input(z.object({ qrData: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { db, companyId } = ctx;

      if (!companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }

      try {
        const data = JSON.parse(input.qrData);
        const guestId = data.guestId;

        // Verify guest exists
        const [guest] = await db
          .select({
            id: schema.guests.id,
            firstName: schema.guests.firstName,
            lastName: schema.guests.lastName,
            clientId: schema.guests.clientId,
          })
          .from(schema.guests)
          .where(eq(schema.guests.id, guestId))
          .limit(1);

        if (!guest) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Invalid QR code' });
        }

        // Verify client belongs to company
        const [client] = await db
          .select({ id: schema.clients.id })
          .from(schema.clients)
          .where(
            and(
              eq(schema.clients.id, guest.clientId),
              eq(schema.clients.companyId, companyId)
            )
          )
          .limit(1);

        if (!client) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Invalid QR code' });
        }

        // Check in guest
        await db
          .update(schema.guests)
          .set({
            checkedIn: true,
            checkedInAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(schema.guests.id, guestId));

        const guestName = `${guest.firstName} ${guest.lastName}`.trim();

        return {
          success: true,
          guestName,
          message: `${guestName} checked in successfully`,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid QR code data' });
      }
    }),
});
