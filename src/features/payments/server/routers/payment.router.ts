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

        // Create invoice
        const [invoice] = await db
          .insert(schema.invoices)
          .values({
            companyId,
            clientId,
            invoiceNumber,
            currency: currency.toUpperCase(),
            subtotal: subtotal.toString(),
            taxAmount: taxAmount.toString(),
            discountAmount: discountAmount.toString(),
            total: total.toString(),
            amountDue: amountDue.toString(),
            dueDate: dueDate ? new Date(dueDate) : null,
            notes,
            lineItems,
            metadata: { description, billingDetails },
            status: 'open',
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

      // Build conditions
      const conditions = [
        eq(schema.invoices.companyId, companyId),
        isNull(schema.invoices.deletedAt)
      ];

      if (status) {
        conditions.push(eq(schema.invoices.status, status));
      }

      if (clientId) {
        conditions.push(eq(schema.invoices.clientId, clientId));
      }

      // Get invoices with client info via join
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
        .leftJoin(schema.clients, eq(schema.invoices.clientId, schema.clients.id))
        .where(and(...conditions))
        .orderBy(desc(schema.invoices.createdAt))
        .limit(limit)
        .offset(offset);

      // Get total count
      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.invoices)
        .where(and(...conditions));

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
        // Get invoice
        const [invoice] = await db
          .select()
          .from(schema.invoices)
          .where(and(
            eq(schema.invoices.id, invoiceId),
            eq(schema.invoices.companyId, companyId)
          ))
          .limit(1);

        if (!invoice) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Invoice not found',
          });
        }

        if (invoice.status === 'paid') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invoice is already paid',
          });
        }

        const amountDue = parseFloat(invoice.amountDue || '0');
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
        const amountInCents = toStripeAmount(amountDue, (invoice.currency?.toLowerCase() || 'usd') as SupportedCurrency);
        const applicationFeeAmount = stripeAccount
          ? Math.round((amountInCents * platformFeePercent) / 100)
          : undefined;

        // Create payment intent
        const paymentIntent = await createPaymentIntent({
          amount: amountInCents,
          currency: (invoice.currency?.toLowerCase() || 'usd') as SupportedCurrency,
          customerId: stripeCustomerId,
          connectedAccountId: stripeAccount?.stripeAccountId,
          applicationFeeAmount,
          metadata: {
            invoice_id: invoiceId,
            invoice_number: invoice.invoiceNumber,
            company_id: companyId,
            client_id: clientId,
          },
        });

        // Save payment record
        const [payment] = await db
          .insert(schema.payments)
          .values({
            companyId,
            clientId,
            invoiceId,
            stripePaymentIntentId: paymentIntent.id,
            amount: amountDue.toString(),
            currency: invoice.currency || 'USD',
            status: 'pending',
            description: `Payment for invoice ${invoice.invoiceNumber}`,
            metadata: {
              stripeCustomerId,
              clientSecret: paymentIntent.client_secret,
              applicationFeeAmount: applicationFeeAmount || 0,
            },
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

      // Build conditions
      const conditions = [eq(schema.payments.companyId, companyId)];

      if (status) {
        conditions.push(eq(schema.payments.status, status));
      }

      if (clientId) {
        conditions.push(eq(schema.payments.clientId, clientId));
      }

      // Get payments with joins
      const paymentsData = await db
        .select({
          payment: schema.payments,
          invoice: {
            invoiceNumber: schema.invoices.invoiceNumber,
          },
          client: {
            partner1FirstName: schema.clients.partner1FirstName,
            partner1LastName: schema.clients.partner1LastName,
            partner2FirstName: schema.clients.partner2FirstName,
            partner2LastName: schema.clients.partner2LastName,
          }
        })
        .from(schema.payments)
        .leftJoin(schema.invoices, eq(schema.payments.invoiceId, schema.invoices.id))
        .leftJoin(schema.clients, eq(schema.payments.clientId, schema.clients.id))
        .where(and(...conditions))
        .orderBy(desc(schema.payments.createdAt))
        .limit(limit)
        .offset(offset);

      // Get total count
      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.payments)
        .where(and(...conditions));

      const total = Number(countResult?.count || 0);

      return {
        payments: paymentsData.map(row => ({
          ...row.payment,
          invoice: row.invoice,
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
        // Get payment
        const [payment] = await db
          .select()
          .from(schema.payments)
          .where(and(
            eq(schema.payments.id, paymentId),
            eq(schema.payments.companyId, companyId)
          ))
          .limit(1);

        if (!payment) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Payment not found',
          });
        }

        if (payment.status !== 'paid') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Can only refund successful payments',
          });
        }

        if (!payment.stripePaymentIntentId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Payment does not have a Stripe payment intent ID',
          });
        }

        // Create refund in Stripe
        const refundAmount = amount ? toStripeAmount(amount, (payment.currency?.toLowerCase() || 'usd') as SupportedCurrency) : undefined;
        const stripeRefund = await createRefund({
          paymentIntentId: payment.stripePaymentIntentId,
          amount: refundAmount,
          reason: reason === 'other' ? undefined : reason,
        });

        // Save refund record
        const [refund] = await db
          .insert(schema.refunds)
          .values({
            paymentId,
            stripeRefundId: stripeRefund.id,
            amount: fromStripeAmount(stripeRefund.amount, (payment.currency?.toLowerCase() || 'usd') as SupportedCurrency).toString(),
            currency: payment.currency || 'USD',
            reason,
            status: stripeRefund.status === 'succeeded' ? 'succeeded' : 'pending',
            notes: description,
            refundedBy: userId,
            metadata: {
              processedAt: stripeRefund.status === 'succeeded' ? new Date().toISOString() : null,
            },
          })
          .returning();

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
          refund,
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

      // Build conditions for payments query
      const paymentConditions = [
        eq(schema.payments.companyId, companyId),
        sql`${schema.payments.createdAt} >= ${startDate}`
      ];

      if (clientId) {
        paymentConditions.push(eq(schema.payments.clientId, clientId));
      }

      // Get all payments in the date range
      const paymentsData = await db
        .select()
        .from(schema.payments)
        .where(and(...paymentConditions));

      // Get refunds - need to join with payments to filter by clientId
      const refundsQuery = clientId
        ? db
            .select({ refund: schema.refunds })
            .from(schema.refunds)
            .innerJoin(schema.payments, eq(schema.refunds.paymentId, schema.payments.id))
            .where(and(
              sql`${schema.refunds.createdAt} >= ${startDate}`,
              eq(schema.payments.clientId, clientId)
            ))
        : db
            .select()
            .from(schema.refunds)
            .where(sql`${schema.refunds.createdAt} >= ${startDate}`);

      const refundsData = clientId
        ? (await refundsQuery).map((r: any) => r.refund)
        : await refundsQuery;

      // Calculate stats
      const totalPayments = paymentsData.length;
      const successfulPayments = paymentsData.filter(p => p.status === 'paid').length;
      const failedPayments = paymentsData.filter(p => p.status === 'failed' || p.status === 'canceled').length;
      const totalAmount = paymentsData
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);
      const totalRefunded = refundsData
        .filter(r => r.status === 'succeeded')
        .reduce((sum, r) => sum + parseFloat(r.amount || '0'), 0);
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

      // Get current invoice
      const [currentInvoice] = await db
        .select({ total: schema.invoices.total, currency: schema.invoices.currency })
        .from(schema.invoices)
        .where(and(
          eq(schema.invoices.id, invoiceId),
          eq(schema.invoices.companyId, companyId)
        ))
        .limit(1);

      const updateData: Partial<typeof schema.invoices.$inferInsert> = {
        status,
        paidAt: status === 'paid' ? new Date() : null,
        updatedAt: new Date()
      };

      if (status === 'paid') {
        updateData.amountPaid = amountPaid?.toString() || currentInvoice?.total || '0';
      }

      const [invoice] = await db
        .update(schema.invoices)
        .set(updateData)
        .where(and(
          eq(schema.invoices.id, invoiceId),
          eq(schema.invoices.companyId, companyId)
        ))
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

      // Check if invoice has payments
      const [paymentExists] = await db
        .select({ id: schema.payments.id })
        .from(schema.payments)
        .where(and(
          eq(schema.payments.invoiceId, invoiceId),
          eq(schema.payments.status, 'paid')
        ))
        .limit(1);

      if (paymentExists) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot delete invoice with successful payments',
        });
      }

      // Soft delete
      await db
        .update(schema.invoices)
        .set({ deletedAt: new Date() })
        .where(and(
          eq(schema.invoices.id, invoiceId),
          eq(schema.invoices.companyId, companyId)
        ));

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

      // Get invoice with client
      const [result] = await db
        .select({
          invoice: schema.invoices,
          client: schema.clients,
        })
        .from(schema.invoices)
        .leftJoin(schema.clients, eq(schema.invoices.clientId, schema.clients.id))
        .where(and(
          eq(schema.invoices.id, invoiceId),
          eq(schema.invoices.companyId, companyId)
        ))
        .limit(1);

      if (!result) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invoice not found',
        });
      }

      // Get payments for this invoice
      const invoicePayments = await db
        .select()
        .from(schema.payments)
        .where(eq(schema.payments.invoiceId, invoiceId));

      return {
        ...result.invoice,
        client: result.client,
        payments: invoicePayments,
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

      // Get payment with relations
      const [result] = await db
        .select({
          payment: schema.payments,
          invoice: schema.invoices,
          client: schema.clients,
        })
        .from(schema.payments)
        .leftJoin(schema.invoices, eq(schema.payments.invoiceId, schema.invoices.id))
        .leftJoin(schema.clients, eq(schema.payments.clientId, schema.clients.id))
        .where(and(
          eq(schema.payments.id, paymentId),
          eq(schema.payments.companyId, companyId)
        ))
        .limit(1);

      if (!result) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Payment not found',
        });
      }

      // Get refunds for this payment
      const paymentRefunds = await db
        .select()
        .from(schema.refunds)
        .where(eq(schema.refunds.paymentId, paymentId));

      return {
        ...result.payment,
        invoice: result.invoice,
        client: result.client,
        refunds: paymentRefunds,
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

      // Fetch payments for this client with invoice info
      const payments = await ctx.db
        .select({
          payment: schema.payments,
          invoice: {
            invoiceNumber: schema.invoices.invoiceNumber,
            description: schema.invoices.notes,
          },
        })
        .from(schema.payments)
        .leftJoin(schema.invoices, eq(schema.payments.invoiceId, schema.invoices.id))
        .where(eq(schema.payments.clientId, clientUser.clientId))
        .orderBy(desc(schema.payments.createdAt))

      return payments.map(row => ({
        ...row.payment,
        invoice: row.invoice,
      }))
    }),
});
