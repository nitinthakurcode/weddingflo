import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, router } from '@/server/trpc/trpc';
import { generateInvoicePDF, generateInvoiceFilename } from '@/lib/pdf/generator';
import { eq, and } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';

// Invoice item schema
const invoiceItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unit_price: z.number().positive(),
  total: z.number().positive(),
});

// Generate invoice PDF schema
const generateInvoicePDFSchema = z.object({
  paymentId: z.string().uuid(),
});

export const pdfRouter = router({
  // Generate invoice PDF from payment
  generateInvoicePDF: protectedProcedure
    .input(generateInvoicePDFSchema)
    .mutation(async ({ ctx, input }) => {
      const { db, companyId } = ctx;

      if (!companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      try {
        // Fetch payment data with related info
        const [result] = await db
          .select({
            payment: schema.payments,
            client: schema.clients,
            company: schema.companies,
          })
          .from(schema.payments)
          .leftJoin(schema.clients, eq(schema.payments.clientId, schema.clients.id))
          .leftJoin(schema.companies, eq(schema.payments.companyId, schema.companies.id))
          .where(and(
            eq(schema.payments.id, input.paymentId),
            eq(schema.payments.companyId, companyId)
          ))
          .limit(1);

        if (!result) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Payment not found',
          });
        }

        const { payment, client, company } = result;

        // Fetch invoice items (if you have a separate items table)
        // For now, we'll create a single item from payment
        const items = [
          {
            description: payment.description || 'Wedding Planning Services',
            quantity: 1,
            unit_price: parseFloat(payment.amount || '0'),
            total: parseFloat(payment.amount || '0'),
          },
        ];

        // Prepare invoice data
        if (!payment.createdAt) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Payment missing creation date',
          });
        }

        const clientName = client
          ? `${client.partner1FirstName || ''} ${client.partner1LastName || ''}` +
            (client.partner2FirstName ? ` & ${client.partner2FirstName} ${client.partner2LastName || ''}` : '')
          : 'Client';

        const invoiceData = {
          invoiceNumber: payment.stripePaymentIntentId?.slice(-8).toUpperCase() ||
                         payment.id.slice(-8).toUpperCase(),
          invoiceDate: payment.createdAt.toISOString(),
          dueDate: payment.createdAt.toISOString(), // Same as created for immediate payment
          status: payment.status as 'paid' | 'pending' | 'overdue',
          companyName: company?.name || 'Wedding Planning Company',
          companyAddress: undefined,
          companyEmail: undefined,
          companyPhone: undefined,
          clientName: clientName.trim() || 'Client',
          clientEmail: client?.partner1Email,
          clientPhone: undefined,
          clientAddress: undefined,
          items,
          subtotal: parseFloat(payment.amount || '0'),
          tax: 0,
          discount: 0,
          total: parseFloat(payment.amount || '0'),
          currency: payment.currency || 'USD',
          notes: 'Thank you for choosing our wedding planning services!',
          paymentTerms: 'Payment due upon receipt. All payments are processed securely through Stripe.',
        };

        // Generate PDF buffer
        const pdfBuffer = await generateInvoicePDF(invoiceData);

        // Convert buffer to base64 for transmission
        const base64PDF = pdfBuffer.toString('base64');
        const filename = generateInvoiceFilename(invoiceData.invoiceNumber);

        return {
          success: true,
          filename,
          pdf: base64PDF,
          invoiceNumber: invoiceData.invoiceNumber,
        };
      } catch (error) {
        console.error('Error generating invoice PDF:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate invoice PDF',
          cause: error,
        });
      }
    }),

  // Generate custom invoice PDF (for creating invoices manually)
  generateCustomInvoicePDF: protectedProcedure
    .input(
      z.object({
        invoiceNumber: z.string(),
        invoiceDate: z.string().datetime(),
        dueDate: z.string().datetime(),
        clientId: z.string().uuid(),
        items: z.array(invoiceItemSchema),
        taxRate: z.number().min(0).max(1).default(0),
        discountAmount: z.number().min(0).default(0),
        currency: z.string().default('USD'),
        notes: z.string().optional(),
        paymentTerms: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, companyId } = ctx;

      if (!companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      try {
        // Fetch client data
        const [client] = await db
          .select()
          .from(schema.clients)
          .where(and(
            eq(schema.clients.id, input.clientId),
            eq(schema.clients.companyId, companyId)
          ))
          .limit(1);

        if (!client) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Client not found',
          });
        }

        // Fetch company data
        const [company] = await db
          .select()
          .from(schema.companies)
          .where(eq(schema.companies.id, companyId))
          .limit(1);

        if (!company) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Company not found',
          });
        }

        // Calculate totals
        const subtotal = input.items.reduce((sum, item) => sum + item.total, 0);
        const discount = input.discountAmount;
        const subtotalAfterDiscount = subtotal - discount;
        const tax = subtotalAfterDiscount * input.taxRate;
        const total = subtotalAfterDiscount + tax;

        // Determine status based on due date
        const now = new Date();
        const dueDate = new Date(input.dueDate);
        const status: 'paid' | 'pending' | 'overdue' =
          dueDate < now ? 'overdue' : 'pending';

        // Prepare invoice data
        const clientName = client
          ? `${client.partner1FirstName || ''} ${client.partner1LastName || ''}` +
            (client.partner2FirstName ? ` & ${client.partner2FirstName} ${client.partner2LastName || ''}` : '')
          : 'Client';

        const invoiceData = {
          invoiceNumber: input.invoiceNumber,
          invoiceDate: input.invoiceDate,
          dueDate: input.dueDate,
          status,
          companyName: company.name || 'Wedding Planning Company',
          companyAddress: undefined,
          companyEmail: undefined,
          companyPhone: undefined,
          clientName: clientName.trim() || 'Client',
          clientEmail: client.partner1Email,
          clientPhone: undefined,
          clientAddress: undefined,
          items: input.items,
          subtotal,
          tax,
          discount,
          total,
          currency: input.currency,
          notes: input.notes,
          paymentTerms: input.paymentTerms,
        };

        // Generate PDF buffer
        const pdfBuffer = await generateInvoicePDF(invoiceData);

        // Convert buffer to base64 for transmission
        const base64PDF = pdfBuffer.toString('base64');
        const filename = generateInvoiceFilename(invoiceData.invoiceNumber);

        return {
          success: true,
          filename,
          pdf: base64PDF,
          invoiceNumber: invoiceData.invoiceNumber,
          total,
        };
      } catch (error) {
        console.error('Error generating custom invoice PDF:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate custom invoice PDF',
          cause: error,
        });
      }
    }),
});
