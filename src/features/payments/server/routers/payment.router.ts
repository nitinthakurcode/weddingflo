import { z } from 'zod';
import { router, protectedProcedure } from '@/server/trpc/trpc';
import {
  stripe,
  createConnectAccount,
  createAccountLink,
  createPaymentIntent,
  retrievePaymentIntent,
  createRefund,
  createCustomer,
  toStripeAmount,
  fromStripeAmount,
  type SupportedCurrency,
} from '@/lib/payments/stripe';
import { TRPCError } from '@trpc/server';
import { eq, and, desc, sql, isNull } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';

export const paymentRouter = router({
  // Create Stripe Connect account for vendor/planner
  createStripeAccount: protectedProcedure
    .input(
      z.object({
        email: z.string().email(),
        businessName: z.string(),
        country: z.string().default('US'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, companyId, userId } = ctx;
      const { email, businessName, country } = input;

      if (!companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      try {
        // Check if account already exists
        const [existing] = await db
          .select()
          .from(schema.stripeAccounts)
          .where(eq(schema.stripeAccounts.companyId, companyId))
          .limit(1);

        if (existing) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Stripe account already exists for this company',
          });
        }

        // Create Stripe Connect account
        const account = await createConnectAccount({
          email,
          businessName,
          country,
        });

        // Save to database
        const [stripeAccount] = await db
          .insert(schema.stripeAccounts)
          .values({
            companyId,
            stripeAccountId: account.id,
            country,
            status: 'pending',
            chargesEnabled: account.charges_enabled || false,
            payoutsEnabled: account.payouts_enabled || false,
            detailsSubmitted: account.details_submitted || false,
            businessProfile: { email, businessName },
          })
          .returning();

        return {
          success: true,
          account: stripeAccount,
          message: 'Stripe Connect account created successfully',
        };
      } catch (error) {
        console.error('Error creating Stripe account:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create Stripe account',
        });
      }
    }),

  // Create onboarding link for Stripe Connect
  createOnboardingLink: protectedProcedure
    .input(
      z.object({
        stripeAccountId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, companyId } = ctx;
      const { stripeAccountId } = input;

      if (!companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      try {
        // Verify account belongs to company
        const [account] = await db
          .select({ stripeAccountId: schema.stripeAccounts.stripeAccountId })
          .from(schema.stripeAccounts)
          .where(and(
            eq(schema.stripeAccounts.id, stripeAccountId),
            eq(schema.stripeAccounts.companyId, companyId)
          ))
          .limit(1);

        if (!account) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Stripe account not found',
          });
        }

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const returnUrl = `${baseUrl}/dashboard/settings/payments?onboarding=success`;
        const refreshUrl = `${baseUrl}/dashboard/settings/payments?onboarding=refresh`;

        const onboardingUrl = await createAccountLink({
          accountId: account.stripeAccountId,
          returnUrl,
          refreshUrl,
        });

        return {
          success: true,
          url: onboardingUrl,
        };
      } catch (error) {
        console.error('Error creating onboarding link:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create onboarding link',
        });
      }
    }),

  // Get Stripe account status
  getStripeAccount: protectedProcedure.query(async ({ ctx }) => {
    const { db, companyId, userId } = ctx;

    if (!companyId) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Company ID not found in session claims',
      });
    }

    const [account] = await db
      .select()
      .from(schema.stripeAccounts)
      .where(eq(schema.stripeAccounts.companyId, companyId))
      .limit(1);

    return account || null;
  }),

  // Create invoice
  createInvoice: protectedProcedure
    .input(
      z.object({
        clientId: z.string().uuid(),
        currency: z.enum(['usd', 'eur', 'gbp', 'cad', 'aud', 'jpy', 'inr']).default('usd'),
        dueDate: z.string().optional(),
        description: z.string().optional(),
        notes: z.string().optional(),
        lineItems: z.array(
          z.object({
            description: z.string(),
            quantity: z.number().positive(),
            unitPrice: z.number().positive(),
            amount: z.number().positive(),
          })
        ),
        taxAmount: z.number().default(0),
        discountAmount: z.number().default(0),
        billingDetails: z
          .object({
            name: z.string(),
            email: z.string().email(),
            address: z.object({
              line1: z.string(),
              line2: z.string().optional(),
              city: z.string(),
              state: z.string().optional(),
              postal_code: z.string(),
              country: z.string(),
            }).optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, companyId } = ctx;
      const {
        clientId,
        currency,
        dueDate,
        description,
        notes,
        lineItems,
        taxAmount,
        discountAmount,
        billingDetails,
      } = input;

      if (!companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      try {
        // Generate invoice number (simple approach - use timestamp + random)
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        const invoiceNumber = `INV-${timestamp}-${random}`;

        // Calculate subtotal from line items
        const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
        const total = subtotal + taxAmount - discountAmount;
        const amountDue = total;

        // Create invoice (simplified schema: id, clientId, amount, status, dueDate, paidAt, stripeInvoiceId)
        const [invoice] = await db
          .insert(schema.invoices)
          .values({
            id: crypto.randomUUID(),
            clientId,
            amount: total,
            dueDate: dueDate ? new Date(dueDate) : null,
            status: 'pending',
          })
          .returning();

        return {
          success: true,
          invoice,
          message: 'Invoice created successfully',
        };
      } catch (error) {
        console.error('Error creating invoice:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create invoice',
        });
      }
    }),

  // Get invoices
  getInvoices: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(50),
        offset: z.number().int().min(0).default(0),
        status: z.enum(['draft', 'open', 'paid', 'void', 'uncollectible', 'overdue']).optional(),
        clientId: z.string().uuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { db, companyId } = ctx;
      const { limit, offset, status, clientId } = input;

      if (!companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      // Build base conditions - join with clients to filter by company
      const baseConditions = [
        eq(schema.clients.companyId, companyId),
        isNull(schema.clients.deletedAt)
      ];

      if (status) {
        baseConditions.push(eq(schema.invoices.status, status));
      }

      if (clientId) {
        baseConditions.push(eq(schema.invoices.clientId, clientId));
      }

      // Get invoices with client info via join (filter by company through clients)
      const invoices = await db
        .select({
          invoice: schema.invoices,
          client: {
            partner1FirstName: schema.clients.partner1FirstName,
            partner1LastName: schema.clients.partner1LastName,
            partner2FirstName: schema.clients.partner2FirstName,
            partner2LastName: schema.clients.partner2LastName,
            partner1Email: schema.clients.partner1Email,
          }
        })
        .from(schema.invoices)
        .innerJoin(schema.clients, eq(schema.invoices.clientId, schema.clients.id))
        .where(and(...baseConditions))
        .orderBy(desc(schema.invoices.createdAt))
        .limit(limit)
        .offset(offset);

      // Get total count
      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.invoices)
        .innerJoin(schema.clients, eq(schema.invoices.clientId, schema.clients.id))
        .where(and(...baseConditions));

      const total = Number(countResult?.count || 0);

      return {
        invoices: invoices.map(row => ({
          ...row.invoice,
          client: row.client
        })),
        total,
        hasMore: total > offset + limit,
      };
    }),

  // Create payment intent
  createPaymentIntent: protectedProcedure
    .input(
      z.object({
        invoiceId: z.string().uuid(),
        clientId: z.string().uuid(),
        stripeCustomerId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, companyId } = ctx;
      const { invoiceId, clientId, stripeCustomerId } = input;

      if (!companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      try {
        // Get invoice (verify through client's companyId)
        const [invoiceResult] = await db
          .select({
            invoice: schema.invoices,
            clientCompanyId: schema.clients.companyId,
          })
          .from(schema.invoices)
          .innerJoin(schema.clients, eq(schema.invoices.clientId, schema.clients.id))
          .where(and(
            eq(schema.invoices.id, invoiceId),
            eq(schema.clients.companyId, companyId)
          ))
          .limit(1);

        if (!invoiceResult) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Invoice not found',
          });
        }

        const invoice = invoiceResult.invoice;

        if (invoice.status === 'paid') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invoice is already paid',
          });
        }

        const amountDue = invoice.amount || 0;
        if (!amountDue || amountDue <= 0) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invoice amount is invalid',
          });
        }

        // Get Stripe Connect account if exists
        const [stripeAccount] = await db
          .select({ stripeAccountId: schema.stripeAccounts.stripeAccountId })
          .from(schema.stripeAccounts)
          .where(and(
            eq(schema.stripeAccounts.companyId, companyId),
            eq(schema.stripeAccounts.chargesEnabled, true)
          ))
          .limit(1);

        // Calculate platform fee (10% by default)
        const platformFeePercent = parseInt(process.env.STRIPE_PLATFORM_FEE_PERCENT || '10');
        const amountInCents = toStripeAmount(amountDue, 'usd' as SupportedCurrency);
        const applicationFeeAmount = stripeAccount
          ? Math.round((amountInCents * platformFeePercent) / 100)
          : undefined;

        // Create payment intent
        const paymentIntent = await createPaymentIntent({
          amount: amountInCents,
          currency: 'usd' as SupportedCurrency,
          customerId: stripeCustomerId,
          connectedAccountId: stripeAccount?.stripeAccountId,
          applicationFeeAmount,
          metadata: {
            invoice_id: invoiceId,
            company_id: companyId,
            client_id: clientId,
          },
        });

        // Save payment record (simplified schema: id, clientId, amount, status, stripeId)
        const [payment] = await db
          .insert(schema.payments)
          .values({
            id: crypto.randomUUID(),
            clientId,
            amount: amountDue,
            stripeId: paymentIntent.id,
            status: 'pending',
          })
          .returning();

        return {
          success: true,
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
          payment,
        };
      } catch (error) {
        console.error('Error creating payment intent:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create payment intent',
        });
      }
    }),

  // Get payments
  getPayments: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(50),
        offset: z.number().int().min(0).default(0),
        status: z
          .enum(['pending', 'paid', 'overdue', 'canceled', 'refunded'])
          .optional(),
        clientId: z.string().uuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { db, companyId } = ctx;
      const { limit, offset, status, clientId } = input;

      if (!companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      // Build conditions - filter through clients for company scope
      const conditions = [eq(schema.clients.companyId, companyId)];

      if (status) {
        conditions.push(eq(schema.payments.status, status));
      }

      if (clientId) {
        conditions.push(eq(schema.payments.clientId, clientId));
      }

      // Get payments with joins (simplified schema: id, clientId, amount, status, stripeId)
      const paymentsData = await db
        .select({
          payment: schema.payments,
          client: {
            partner1FirstName: schema.clients.partner1FirstName,
            partner1LastName: schema.clients.partner1LastName,
            partner2FirstName: schema.clients.partner2FirstName,
            partner2LastName: schema.clients.partner2LastName,
          }
        })
        .from(schema.payments)
        .innerJoin(schema.clients, eq(schema.payments.clientId, schema.clients.id))
        .where(and(...conditions))
        .orderBy(desc(schema.payments.createdAt))
        .limit(limit)
        .offset(offset);

      // Get total count
      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.payments)
        .innerJoin(schema.clients, eq(schema.payments.clientId, schema.clients.id))
        .where(and(...conditions));

      const total = Number(countResult?.count || 0);

      return {
        payments: paymentsData.map(row => ({
          ...row.payment,
          client: row.client
        })),
        total,
        hasMore: total > offset + limit,
      };
    }),

  // Create refund
  createRefund: protectedProcedure
    .input(
      z.object({
        paymentId: z.string().uuid(),
        amount: z.number().positive().optional(),
        reason: z.enum(['duplicate', 'fraudulent', 'requested_by_customer', 'other']).default('requested_by_customer'),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, companyId, userId } = ctx;
      const { paymentId, amount, reason, description } = input;

      if (!companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      try {
        // Get payment (verify through client's companyId)
        const [paymentResult] = await db
          .select({
            payment: schema.payments,
          })
          .from(schema.payments)
          .innerJoin(schema.clients, eq(schema.payments.clientId, schema.clients.id))
          .where(and(
            eq(schema.payments.id, paymentId),
            eq(schema.clients.companyId, companyId)
          ))
          .limit(1);

        if (!paymentResult) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Payment not found',
          });
        }

        const payment = paymentResult.payment;

        if (payment.status !== 'paid') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Can only refund successful payments',
          });
        }

        if (!payment.stripeId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Payment does not have a Stripe payment intent ID',
          });
        }

        // Create refund in Stripe
        const refundAmount = amount ? toStripeAmount(amount, 'usd' as SupportedCurrency) : undefined;
        const stripeRefund = await createRefund({
          paymentIntentId: payment.stripeId,
          amount: refundAmount,
          reason: reason === 'other' ? undefined : reason,
        });

        // Update payment status
        await db
          .update(schema.payments)
          .set({
            status: 'refunded',
            updatedAt: new Date()
          })
          .where(eq(schema.payments.id, paymentId));

        return {
          success: true,
          refundId: stripeRefund.id,
          message: 'Refund processed successfully',
        };
      } catch (error) {
        console.error('Error creating refund:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create refund',
        });
      }
    }),

  // Get payment statistics
  getPaymentStats: protectedProcedure
    .input(
      z.object({
        days: z.number().int().min(1).max(365).default(30),
        clientId: z.string().uuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { db, companyId } = ctx;
      const { days, clientId } = input;

      if (!companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Build conditions for payments query (filter through clients for company)
      const paymentConditions = [
        eq(schema.clients.companyId, companyId),
        sql`${schema.payments.createdAt} >= ${startDate}`
      ];

      if (clientId) {
        paymentConditions.push(eq(schema.payments.clientId, clientId));
      }

      // Get all payments in the date range
      const paymentsData = await db
        .select({ payment: schema.payments })
        .from(schema.payments)
        .innerJoin(schema.clients, eq(schema.payments.clientId, schema.clients.id))
        .where(and(...paymentConditions));

      // Calculate stats (simplified - no refunds table in current schema)
      const payments = paymentsData.map(p => p.payment);
      const totalPayments = payments.length;
      const successfulPayments = payments.filter(p => p.status === 'paid').length;
      const failedPayments = payments.filter(p => p.status === 'failed' || p.status === 'canceled').length;
      const totalAmount = payments
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + (p.amount || 0), 0);
      const totalRefunded = payments
        .filter(p => p.status === 'refunded')
        .reduce((sum, p) => sum + (p.amount || 0), 0);
      const successRate = totalPayments > 0 ? (successfulPayments / totalPayments) * 100 : 0;

      return {
        total_payments: totalPayments,
        successful_payments: successfulPayments,
        failed_payments: failedPayments,
        total_amount: totalAmount,
        total_refunded: totalRefunded,
        success_rate: Math.round(successRate * 100) / 100,
        currency: 'usd',
      };
    }),

  // Update invoice status (mark as paid manually)
  updateInvoiceStatus: protectedProcedure
    .input(
      z.object({
        invoiceId: z.string().uuid(),
        status: z.enum(['draft', 'open', 'paid', 'void', 'uncollectible']),
        amountPaid: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, companyId } = ctx;
      const { invoiceId, status, amountPaid } = input;

      if (!companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      // Get invoice (verify through client's companyId)
      const [invoiceResult] = await db
        .select({ invoice: schema.invoices })
        .from(schema.invoices)
        .innerJoin(schema.clients, eq(schema.invoices.clientId, schema.clients.id))
        .where(and(
          eq(schema.invoices.id, invoiceId),
          eq(schema.clients.companyId, companyId)
        ))
        .limit(1);

      if (!invoiceResult) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invoice not found',
        });
      }

      // Update invoice (simplified schema: status, paidAt)
      const [invoice] = await db
        .update(schema.invoices)
        .set({
          status,
          paidAt: status === 'paid' ? new Date() : null,
          updatedAt: new Date()
        })
        .where(eq(schema.invoices.id, invoiceId))
        .returning();

      if (!invoice) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invoice not found',
        });
      }

      return {
        success: true,
        invoice,
      };
    }),

  // Delete invoice
  deleteInvoice: protectedProcedure
    .input(
      z.object({
        invoiceId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, companyId } = ctx;
      const { invoiceId } = input;

      if (!companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      // Verify invoice belongs to company through client
      const [invoiceResult] = await db
        .select({ invoice: schema.invoices })
        .from(schema.invoices)
        .innerJoin(schema.clients, eq(schema.invoices.clientId, schema.clients.id))
        .where(and(
          eq(schema.invoices.id, invoiceId),
          eq(schema.clients.companyId, companyId)
        ))
        .limit(1);

      if (!invoiceResult) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invoice not found',
        });
      }

      // Cannot delete paid invoices
      if (invoiceResult.invoice.status === 'paid') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot delete paid invoices',
        });
      }

      // Hard delete (no deletedAt in schema)
      await db
        .delete(schema.invoices)
        .where(eq(schema.invoices.id, invoiceId));

      return {
        success: true,
        message: 'Invoice deleted successfully',
      };
    }),

  // Get single invoice
  getInvoice: protectedProcedure
    .input(
      z.object({
        invoiceId: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { db, companyId } = ctx;
      const { invoiceId } = input;

      if (!companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      // Get invoice with client (verify through client's companyId)
      const [result] = await db
        .select({
          invoice: schema.invoices,
          client: schema.clients,
        })
        .from(schema.invoices)
        .innerJoin(schema.clients, eq(schema.invoices.clientId, schema.clients.id))
        .where(and(
          eq(schema.invoices.id, invoiceId),
          eq(schema.clients.companyId, companyId)
        ))
        .limit(1);

      if (!result) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invoice not found',
        });
      }

      // Get payments for this client (no invoiceId in payments schema)
      const clientPayments = await db
        .select()
        .from(schema.payments)
        .where(eq(schema.payments.clientId, result.invoice.clientId));

      return {
        ...result.invoice,
        client: result.client,
        payments: clientPayments,
      };
    }),

  // Get single payment
  getPayment: protectedProcedure
    .input(
      z.object({
        paymentId: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { db, companyId } = ctx;
      const { paymentId } = input;

      if (!companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      // Get payment with client (verify through client's companyId)
      const [result] = await db
        .select({
          payment: schema.payments,
          client: schema.clients,
        })
        .from(schema.payments)
        .innerJoin(schema.clients, eq(schema.payments.clientId, schema.clients.id))
        .where(and(
          eq(schema.payments.id, paymentId),
          eq(schema.clients.companyId, companyId)
        ))
        .limit(1);

      if (!result) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Payment not found',
        });
      }

      return {
        ...result.payment,
        client: result.client,
      };
    }),

  /**
   * Portal Invoices - For client users (couples) to view their invoices
   * Uses protectedProcedure and looks up clientId from client_users table
   */
  getPortalInvoices: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.userId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Authentication required' })
      }

      // Get user record
      const [user] = await ctx.db
        .select({ id: schema.users.id, role: schema.users.role })
        .from(schema.users)
        .where(eq(schema.users.authId, ctx.userId))
        .limit(1)

      if (!user) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })
      }

      // Get client_user link to find the client
      const [clientUser] = await ctx.db
        .select({ clientId: schema.clientUsers.clientId })
        .from(schema.clientUsers)
        .where(eq(schema.clientUsers.userId, user.id))
        .limit(1)

      if (!clientUser) {
        return []
      }

      // Fetch invoices for this client
      const invoices = await ctx.db
        .select()
        .from(schema.invoices)
        .where(eq(schema.invoices.clientId, clientUser.clientId))
        .orderBy(desc(schema.invoices.createdAt))

      return invoices
    }),

  /**
   * Portal Payments - For client users (couples) to view their payments
   * Uses protectedProcedure and looks up clientId from client_users table
   */
  getPortalPayments: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.userId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Authentication required' })
      }

      // Get user record
      const [user] = await ctx.db
        .select({ id: schema.users.id, role: schema.users.role })
        .from(schema.users)
        .where(eq(schema.users.authId, ctx.userId))
        .limit(1)

      if (!user) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })
      }

      // Get client_user link to find the client
      const [clientUser] = await ctx.db
        .select({ clientId: schema.clientUsers.clientId })
        .from(schema.clientUsers)
        .where(eq(schema.clientUsers.userId, user.id))
        .limit(1)

      if (!clientUser) {
        return []
      }

      // Fetch payments for this client (simplified schema - no invoice link)
      const payments = await ctx.db
        .select()
        .from(schema.payments)
        .where(eq(schema.payments.clientId, clientUser.clientId))
        .orderBy(desc(schema.payments.createdAt))

      return payments
    }),
});
