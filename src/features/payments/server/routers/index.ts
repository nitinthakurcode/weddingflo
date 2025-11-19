/**
 * Payments Feature - tRPC Routers
 *
 * Business Domain: Payment Processing & Invoicing
 * Routers:
 * - payment: Payment intent creation, tracking
 * - stripe: Stripe Connect account management
 * - pdf: Invoice PDF generation
 *
 * Dependencies:
 * - Supabase (payments, invoices, refunds, stripe_accounts)
 * - Stripe API
 * - PDF generation library
 *
 * Security:
 * - PCI DSS compliant (Stripe handles card data)
 * - Webhook signature verification required
 * - HTTPS only
 *
 * Rate Limits:
 * - Stripe API: 100 req/sec
 */

export { paymentRouter } from './payment.router';
export { stripeRouter } from './stripe.router';
export { pdfRouter } from './pdf.router';
