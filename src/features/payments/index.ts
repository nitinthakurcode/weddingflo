/**
 * Payments Feature Pocket
 *
 * @description Payment processing, invoicing, and Stripe integration
 * @owner Payments Team
 * @stability stable
 *
 * ## Capabilities
 * - Payment intent creation
 * - Payment tracking & status
 * - Invoice generation & management
 * - Stripe Connect account management
 * - PDF invoice generation
 * - Refund processing
 *
 * ## External Dependencies
 * - Stripe API: Payment processing, Connect accounts
 * - Supabase: payments, invoices, refunds, stripe_accounts tables
 * - jsPDF: PDF generation
 *
 * ## Database Tables
 * - payments (primary)
 * - invoices (primary)
 * - refunds (primary)
 * - stripe_accounts (primary)
 *
 * ## Security (CRITICAL)
 * - PCI DSS compliant (Stripe handles card data - never store)
 * - Webhook signature verification REQUIRED
 * - HTTPS only (enforced in production)
 * - Idempotency keys for all payment operations
 * - Audit logging for all financial transactions
 *
 * ## Rate Limits
 * - Stripe API: 100 req/sec
 * - PDF generation: 100/min per company
 *
 * ## Financial Compliance
 * - All transactions logged with timestamps
 * - Refunds require admin approval
 * - Webhook events stored for audit trail
 * - Monthly reconciliation reports
 *
 * ## Cost Management
 * - Stripe fees: 2.9% + $0.30 per transaction
 * - Stripe Connect: Additional 0.25% (if using Connect)
 * - Invoice storage: Minimal (Supabase)
 *
 * ## Scalability Notes
 * Financial operations are critical - implement circuit breakers
 * Stripe webhooks must be processed idempotently
 * Consider separate database for financial audit logs
 */

export * from './server/routers';
