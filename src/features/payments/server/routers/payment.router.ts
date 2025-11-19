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
      const { supabase, companyId, userId } = ctx;
      const { email, businessName, country } = input;

      if (!companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      try{
        // Check if account already exists
        const { data: existing } = await supabase
          .from('stripe_accounts')
          .select('*')
          .eq('company_id', companyId)
          .eq('user_id', userId)
          .single();

        if (existing) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Stripe account already exists for this user',
          });
        }

        // Create Stripe Connect account
        const account = await createConnectAccount({
          email,
          businessName,
          country,
        });

        // Save to database
        const { data: stripeAccount, error } = await supabase
          .from('stripe_accounts')
          .insert({
            company_id: companyId,
            user_id: userId,
            stripe_account_id: account.id,
            email,
            business_name: businessName,
            country,
            status: 'pending',
            charges_enabled: account.charges_enabled || false,
            payouts_enabled: account.payouts_enabled || false,
            details_submitted: account.details_submitted || false,
          })
          .select()
          .single();

        if (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Failed to save Stripe account: ${error.message}`,
          });
        }

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
      const { supabase, companyId } = ctx;
      const { stripeAccountId } = input;

      if (!companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      try {
        // Verify account belongs to company
        const { data: account } = await supabase
          .from('stripe_accounts')
          .select('stripe_account_id')
          .eq('id', stripeAccountId)
          .eq('company_id', companyId)
          .single();

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
          accountId: account.stripe_account_id,
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
    const { supabase, companyId, userId } = ctx;

    if (!companyId) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Company ID not found in session claims',
      });
    }

    const { data: account } = await supabase
      .from('stripe_accounts')
      .select('*')
      .eq('company_id', companyId)
      .eq('user_id', userId)
      .single();

    return account;
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
            unitPrice: z.number().positive(), // In decimal (e.g., 100.50)
            amount: z.number().positive(), // quantity * unitPrice
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
      const { supabase, companyId } = ctx;
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
        // Generate invoice number
        const { data: invoiceNumber, error: invoiceNumError } = await supabase.rpc('generate_invoice_number', {
          p_company_id: companyId,
        });

        if (invoiceNumError || !invoiceNumber) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to generate invoice number',
          });
        }

        // Calculate subtotal from line items
        const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);

        // Convert to smallest currency unit (cents)
        const subtotalInCents = toStripeAmount(subtotal, currency);
        const taxInCents = toStripeAmount(taxAmount, currency);
        const discountInCents = toStripeAmount(discountAmount, currency);
        const totalInCents = subtotalInCents + taxInCents - discountInCents;

        // Create invoice
        const { data: invoice, error } = await supabase
          .from('invoices')
          .insert({
            company_id: companyId,
            client_id: clientId,
            invoice_number: invoiceNumber,
            currency,
            subtotal: subtotalInCents,
            tax_amount: taxInCents,
            discount_amount: discountInCents,
            total_amount: totalInCents,
            amount_due: totalInCents,
            issue_date: new Date().toISOString().split('T')[0],
            due_date: dueDate,
            description,
            notes,
            line_items: lineItems,
            billing_details: billingDetails || {},
            status: 'open',
          })
          .select()
          .single();

        if (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Failed to create invoice: ${error.message}`,
          });
        }

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
      const { supabase, companyId } = ctx;
      const { limit, offset, status, clientId } = input;

      if (!companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      let query = supabase
        .from('invoices')
        .select('*, client:clients(partner1_first_name, partner1_last_name, partner2_first_name, partner2_last_name, partner1_email), payments!left(id, status)', { count: 'exact' })
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (status) {
        query = query.eq('status', status);
      }

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error, count } = await query;

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to fetch invoices: ${error.message}`,
        });
      }

      return {
        invoices: data || [],
        total: count || 0,
        hasMore: (count || 0) > offset + limit,
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
      const { supabase, companyId } = ctx;
      const { invoiceId, clientId, stripeCustomerId } = input;

      if (!companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      try {
        // Get invoice
        const { data: invoice, error: invoiceError } = await supabase
          .from('invoices')
          .select('*')
          .eq('id', invoiceId)
          .eq('company_id', companyId)
          .single();

        if (invoiceError || !invoice) {
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

        if (!invoice.amount_due) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invoice amount is invalid',
          });
        }

        // Get Stripe Connect account if exists
        const { data: stripeAccount } = await supabase
          .from('stripe_accounts')
          .select('stripe_account_id')
          .eq('company_id', companyId)
          .eq('charges_enabled', true)
          .single();

        // Calculate platform fee (10% by default)
        const platformFeePercent = parseInt(process.env.STRIPE_PLATFORM_FEE_PERCENT || '10');
        const applicationFeeAmount = stripeAccount
          ? Math.round((invoice.amount_due * platformFeePercent) / 100)
          : undefined;

        // Create payment intent
        const paymentIntent = await createPaymentIntent({
          amount: invoice.amount_due,
          currency: invoice.currency as SupportedCurrency,
          customerId: stripeCustomerId,
          connectedAccountId: stripeAccount?.stripe_account_id,
          applicationFeeAmount,
          metadata: {
            invoice_id: invoiceId,
            invoice_number: invoice.invoice_number,
            company_id: companyId,
            client_id: clientId,
          },
        });

        // Save payment record
        const { data: payment, error: paymentError } = await supabase
          .from('payments')
          .insert({
            company_id: companyId,
            client_id: clientId,
            invoice_id: invoiceId,
            stripe_payment_intent_id: paymentIntent.id,
            stripe_customer_id: stripeCustomerId,
            amount: invoice.amount_due,
            currency: invoice.currency,
            status: 'pending',
            client_secret: paymentIntent.client_secret,
            application_fee_amount: applicationFeeAmount || 0,
            description: `Payment for invoice ${invoice.invoice_number}`,
          })
          .select()
          .single();

        if (paymentError) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Failed to save payment: ${paymentError.message}`,
          });
        }

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
      const { supabase, companyId } = ctx;
      const { limit, offset, status, clientId } = input;

      if (!companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      let query = supabase
        .from('payments')
        .select('*, invoice:invoices(invoice_number), client:clients(partner1_first_name, partner1_last_name, partner2_first_name, partner2_last_name)', {
          count: 'exact',
        })
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (status) {
        query = query.eq('status', status);
      }

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error, count } = await query;

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to fetch payments: ${error.message}`,
        });
      }

      return {
        payments: data || [],
        total: count || 0,
        hasMore: (count || 0) > offset + limit,
      };
    }),

  // Create refund
  createRefund: protectedProcedure
    .input(
      z.object({
        paymentId: z.string().uuid(),
        amount: z.number().positive().optional(), // Optional for partial refund
        reason: z.enum(['duplicate', 'fraudulent', 'requested_by_customer', 'other']).default('requested_by_customer'),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { supabase, companyId } = ctx;
      const { paymentId, amount, reason, description } = input;

      if (!companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      try {
        // Get payment
        const { data: payment, error: paymentError } = await supabase
          .from('payments')
          .select('*')
          .eq('id', paymentId)
          .eq('company_id', companyId)
          .single();

        if (paymentError || !payment) {
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

        if (!payment.stripe_payment_intent_id) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Payment does not have a Stripe payment intent ID',
          });
        }

        // Create refund in Stripe
        const refundAmount = amount ? toStripeAmount(amount, payment.currency as SupportedCurrency) : undefined;
        const stripeRefund = await createRefund({
          paymentIntentId: payment.stripe_payment_intent_id,
          amount: refundAmount,
          reason: reason === 'other' ? undefined : reason,
        });

        // Save refund record
        const { data: refund, error: refundError } = await supabase
          .from('refunds')
          .insert({
            company_id: companyId,
            payment_id: paymentId,
            stripe_refund_id: stripeRefund.id,
            amount: stripeRefund.amount,
            currency: payment.currency,
            reason,
            status: stripeRefund.status === 'succeeded' ? 'succeeded' : 'pending',
            description,
            processed_at: stripeRefund.status === 'succeeded' ? new Date().toISOString() : null,
          })
          .select()
          .single();

        if (refundError) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Failed to save refund: ${refundError.message}`,
          });
        }

        // Update payment status
        // Note: Database enum only has 'refunded', not 'partially_refunded'
        // Partial refund tracking is handled by the refunds table
        await supabase
          .from('payments')
          .update({
            status: 'refunded',
          })
          .eq('id', paymentId);

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
      })
    )
    .query(async ({ ctx, input }) => {
      const { supabase, companyId } = ctx;
      const { days } = input;

      if (!companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      const { data, error } = await supabase.rpc('get_payment_stats', {
        p_company_id: companyId,
        p_days: days,
      });

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to fetch payment stats: ${error.message}`,
        });
      }

      return data?.[0] || {
        total_payments: 0,
        successful_payments: 0,
        failed_payments: 0,
        total_amount: 0,
        total_refunded: 0,
        success_rate: 0,
        currency: 'usd',
      };
    }),

  // Update invoice status (mark as paid manually)
  updateInvoiceStatus: protectedProcedure
    .input(
      z.object({
        invoiceId: z.string().uuid(),
        status: z.enum(['draft', 'open', 'paid', 'void', 'uncollectible']),
        amountPaid: z.number().optional(), // Amount paid in decimal
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { supabase, companyId } = ctx;
      const { invoiceId, status, amountPaid } = input;

      if (!companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      // Get current invoice to get currency and total
      const { data: currentInvoice } = await supabase
        .from('invoices')
        .select('total_amount, currency')
        .eq('id', invoiceId)
        .eq('company_id', companyId)
        .single();

      const updateData: any = {
        status,
        paid_at: status === 'paid' ? new Date().toISOString() : null,
      };

      if (status === 'paid') {
        updateData.amount_paid = amountPaid
          ? toStripeAmount(amountPaid, (currentInvoice?.currency || 'usd') as SupportedCurrency)
          : currentInvoice?.total_amount || 0;
      }

      const { data: invoice, error } = await supabase
        .from('invoices')
        .update(updateData)
        .eq('id', invoiceId)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to update invoice: ${error.message}`,
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
      const { supabase, companyId } = ctx;
      const { invoiceId } = input;

      if (!companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      // Check if invoice has payments
      const { data: payments } = await supabase
        .from('payments')
        .select('id')
        .eq('invoice_id', invoiceId)
        .eq('status', 'paid')
        .limit(1);

      if (payments && payments.length > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot delete invoice with successful payments',
        });
      }

      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceId)
        .eq('company_id', companyId);

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to delete invoice: ${error.message}`,
        });
      }

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
      const { supabase, companyId } = ctx;
      const { invoiceId } = input;

      if (!companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      const { data: invoice, error } = await supabase
        .from('invoices')
        .select('*, client:clients(*), payments(*)')
        .eq('id', invoiceId)
        .eq('company_id', companyId)
        .single();

      if (error) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invoice not found',
        });
      }

      return invoice;
    }),

  // Get single payment
  getPayment: protectedProcedure
    .input(
      z.object({
        paymentId: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { supabase, companyId } = ctx;
      const { paymentId } = input;

      if (!companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      const { data: payment, error } = await supabase
        .from('payments')
        .select('*, invoice:invoices(*), client:clients(*), refunds(*)')
        .eq('id', paymentId)
        .eq('company_id', companyId)
        .single();

      if (error) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Payment not found',
        });
      }

      return payment;
    }),
});
