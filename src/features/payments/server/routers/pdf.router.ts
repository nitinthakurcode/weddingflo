import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, router } from '@/server/trpc/trpc';
import { generateInvoicePDF, generateInvoiceFilename } from '@/lib/pdf/generator';

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
      const { supabase, companyId } = ctx;

      if (!companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      try {
        // Fetch payment data with related info
        // Note: Some columns (address, phone, email) don't exist in the schema yet
        const { data: payment, error: paymentError } = await supabase
          .from('payments')
          .select(`
            *,
            client:clients (
              id,
              partner1_first_name,
              partner1_last_name,
              partner1_email,
              partner2_first_name,
              partner2_last_name,
              partner2_email
            ),
            company:companies (
              id,
              name
            )
          `)
          .eq('id', input.paymentId)
          .eq('company_id', companyId)
          .single();

        if (paymentError || !payment) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Payment not found',
          });
        }

        // Fetch invoice items (if you have a separate items table)
        // For now, we'll create a single item from payment
        const items = [
          {
            description: payment.description || 'Wedding Planning Services',
            quantity: 1,
            unit_price: payment.amount,
            total: payment.amount,
          },
        ];

        // Prepare invoice data
        // TODO: Add address/phone fields to companies and clients tables for complete invoice data
        if (!payment.created_at) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Payment missing creation date',
          });
        }

        const clientName = payment.client
          ? `${payment.client.partner1_first_name || ''} ${payment.client.partner1_last_name || ''}` +
            (payment.client.partner2_first_name ? ` & ${payment.client.partner2_first_name} ${payment.client.partner2_last_name || ''}` : '')
          : 'Client';

        const invoiceData = {
          invoiceNumber: payment.stripe_payment_intent_id?.slice(-8).toUpperCase() ||
                         payment.id.slice(-8).toUpperCase(),
          invoiceDate: payment.created_at,
          dueDate: payment.created_at, // Same as created for immediate payment
          status: payment.status as 'paid' | 'pending' | 'overdue',
          companyName: payment.company?.name || 'Wedding Planning Company',
          companyAddress: undefined, // TODO: Add address field to companies table
          companyEmail: undefined, // TODO: Add email field to companies table
          companyPhone: undefined, // TODO: Add phone field to companies table
          clientName: clientName.trim() || 'Client',
          clientEmail: payment.client?.partner1_email,
          clientPhone: undefined, // TODO: Add phone field to clients table
          clientAddress: undefined, // TODO: Add address field to clients table
          items,
          subtotal: payment.amount,
          tax: 0,
          discount: 0,
          total: payment.amount,
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
      const { supabase, companyId } = ctx;

      if (!companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      try {
        // Fetch client data
        const { data: client, error: clientError } = await supabase
          .from('clients')
          .select('*')
          .eq('id', input.clientId)
          .eq('company_id', companyId)
          .single();

        if (clientError || !client) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Client not found',
          });
        }

        // Fetch company data
        const { data: company, error: companyError } = await supabase
          .from('companies')
          .select('*')
          .eq('id', companyId)
          .single();

        if (companyError || !company) {
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
        // TODO: Add address/phone/email fields to companies and clients tables for complete invoice data
        const clientName = client
          ? `${client.partner1_first_name || ''} ${client.partner1_last_name || ''}` +
            (client.partner2_first_name ? ` & ${client.partner2_first_name} ${client.partner2_last_name || ''}` : '')
          : 'Client';

        const invoiceData = {
          invoiceNumber: input.invoiceNumber,
          invoiceDate: input.invoiceDate,
          dueDate: input.dueDate,
          status,
          companyName: company.name || 'Wedding Planning Company',
          companyAddress: undefined, // TODO: Add address field to companies table
          companyEmail: undefined, // TODO: Add email field to companies table
          companyPhone: undefined, // TODO: Add phone field to companies table
          clientName: clientName.trim() || 'Client',
          clientEmail: client.partner1_email,
          clientPhone: undefined, // TODO: Add phone field to clients table
          clientAddress: undefined, // TODO: Add address field to clients table
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
