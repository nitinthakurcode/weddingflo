/**
 * Payment Executor
 *
 * April 2026 - Chatbot tool executors for payment recording and bookkeeping.
 *
 * Handles:
 * - Recording manual payments (with optional invoice linkage)
 * - Payment statistics queries
 * - Internal refund bookkeeping (NOT Stripe refunds)
 *
 * NOTE: These are internal bookkeeping operations. Stripe integration
 * is handled separately by the payment router.
 */

import { db, eq, and, isNull, sql, like, or } from '@/lib/db'
import { TRPCError } from '@trpc/server'
import {
  clients,
  payments,
  invoices,
} from '@/lib/db/schema'
import { withTransaction } from '../transaction-wrapper'
import { recalcClientStats } from '@/lib/sync/client-stats-sync'
import type { ToolExecutionResult } from '../tool-executor'
import type { Context } from '@/server/trpc/context'

// ============================================
// PAYMENT OPERATIONS
// ============================================

/**
 * Record a manual payment, optionally linked to an invoice.
 *
 * If invoiceId is provided, uses a transaction to insert the payment
 * and update the invoice status to 'paid'.
 * Calls recalcClientStats after since budget totals change.
 */
export async function executeRecordPayment(
  args: Record<string, unknown>,
  ctx: Context
): Promise<ToolExecutionResult> {
  const amount = args.amount as number
  const clientId = args.clientId as string | undefined
  const clientName = args.clientName as string | undefined
  const invoiceId = args.invoiceId as string | undefined
  const currency = (args.currency as string) || 'USD'
  const paymentMethod = args.paymentMethod as string | undefined
  const notes = args.notes as string | undefined

  if (!amount || amount <= 0) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'A positive payment amount is required',
    })
  }

  // Resolve client: by ID, by name, or from invoice
  let resolvedClientId = clientId
  if (!resolvedClientId && clientName) {
    const [found] = await db
      .select({ id: clients.id })
      .from(clients)
      .where(
        and(
          eq(clients.companyId, ctx.companyId!),
          isNull(clients.deletedAt),
          or(
            like(clients.partner1FirstName, `%${clientName}%`),
            like(clients.partner2FirstName, `%${clientName}%`)
          )
        )
      )
      .limit(1)
    if (found) resolvedClientId = found.id
  }

  // If invoiceId is provided, resolve clientId from invoice
  if (!resolvedClientId && invoiceId) {
    const [inv] = await db
      .select({ clientId: invoices.clientId })
      .from(invoices)
      .innerJoin(clients, eq(invoices.clientId, clients.id))
      .where(
        and(
          eq(invoices.id, invoiceId),
          eq(clients.companyId, ctx.companyId!)
        )
      )
      .limit(1)
    if (inv) resolvedClientId = inv.clientId
  }

  if (!resolvedClientId) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Client ID, client name, or invoice ID is required to record a payment',
    })
  }

  // Verify client access
  const [client] = await db
    .select({
      id: clients.id,
      weddingName: clients.weddingName,
      partner1FirstName: clients.partner1FirstName,
      partner2FirstName: clients.partner2FirstName,
    })
    .from(clients)
    .where(
      and(
        eq(clients.id, resolvedClientId),
        eq(clients.companyId, ctx.companyId!),
        isNull(clients.deletedAt)
      )
    )
    .limit(1)

  if (!client) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Client not found',
    })
  }

  // If invoiceId provided, verify it exists and belongs to the same client/company
  if (invoiceId) {
    const [inv] = await db
      .select({ id: invoices.id, status: invoices.status, clientId: invoices.clientId })
      .from(invoices)
      .innerJoin(clients, eq(invoices.clientId, clients.id))
      .where(
        and(
          eq(invoices.id, invoiceId),
          eq(clients.companyId, ctx.companyId!)
        )
      )
      .limit(1)

    if (!inv) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Invoice not found',
      })
    }

    if (inv.status === 'paid') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invoice is already paid',
      })
    }

    // Transaction: insert payment + update invoice
    const newPayment = await withTransaction(async (tx) => {
      const [payment] = await tx
        .insert(payments)
        .values({
          id: crypto.randomUUID(),
          clientId: resolvedClientId!,
          amount,
          status: 'paid',
        })
        .returning()

      // Mark invoice as paid
      await tx
        .update(invoices)
        .set({
          status: 'paid',
          paidAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, invoiceId!))

      // Recalculate client stats (budget totals change)
      await recalcClientStats(tx, resolvedClientId!)

      return payment
    })

    const clientDisplayName = client.weddingName
      || `${client.partner1FirstName}${client.partner2FirstName ? ` & ${client.partner2FirstName}` : ''}`

    return {
      success: true,
      toolName: 'record_payment',
      data: {
        id: newPayment.id,
        clientId: resolvedClientId,
        clientName: clientDisplayName,
        amount: newPayment.amount,
        status: newPayment.status,
        invoiceId,
        invoiceStatus: 'paid',
      },
      message: `Recorded payment of ${currency} ${amount.toLocaleString()} for ${clientDisplayName}. Invoice marked as paid.`,
    }
  }

  // No invoice -- simple insert + recalc
  const newPayment = await withTransaction(async (tx) => {
    const [payment] = await tx
      .insert(payments)
      .values({
        id: crypto.randomUUID(),
        clientId: resolvedClientId!,
        amount,
        status: 'paid',
      })
      .returning()

    // Recalculate client stats
    await recalcClientStats(tx, resolvedClientId!)

    return payment
  })

  const clientDisplayName = client.weddingName
    || `${client.partner1FirstName}${client.partner2FirstName ? ` & ${client.partner2FirstName}` : ''}`

  return {
    success: true,
    toolName: 'record_payment',
    data: {
      id: newPayment.id,
      clientId: resolvedClientId,
      clientName: clientDisplayName,
      amount: newPayment.amount,
      status: newPayment.status,
    },
    message: `Recorded payment of ${currency} ${amount.toLocaleString()} for ${clientDisplayName}.`,
  }
}

/**
 * Get payment statistics: total received, pending, invoice count, payment count.
 * Optionally filtered by clientId or time period.
 */
export async function executeGetPaymentStats(
  args: Record<string, unknown>,
  ctx: Context
): Promise<ToolExecutionResult> {
  const clientId = args.clientId as string | undefined
  const period = args.period as string | undefined // e.g. "30d", "90d", "1y"

  // Calculate start date from period
  let startDate: Date | null = null
  if (period) {
    const now = new Date()
    const match = period.match(/^(\d+)(d|m|y)$/i)
    if (match) {
      const value = parseInt(match[1], 10)
      const unit = match[2].toLowerCase()
      if (unit === 'd') {
        startDate = new Date(now.getTime() - value * 24 * 60 * 60 * 1000)
      } else if (unit === 'm') {
        startDate = new Date(now)
        startDate.setMonth(startDate.getMonth() - value)
      } else if (unit === 'y') {
        startDate = new Date(now)
        startDate.setFullYear(startDate.getFullYear() - value)
      }
    }
  }

  // Build payment query conditions
  const paymentConditions = [eq(clients.companyId, ctx.companyId!)]
  if (clientId) {
    paymentConditions.push(eq(payments.clientId, clientId))
  }
  if (startDate) {
    paymentConditions.push(sql`${payments.createdAt} >= ${startDate}`)
  }

  // Get all payments in scope
  const paymentsData = await db
    .select({ payment: payments })
    .from(payments)
    .innerJoin(clients, eq(payments.clientId, clients.id))
    .where(and(...paymentConditions))

  const allPayments = paymentsData.map((p) => p.payment)

  // Calculate payment stats
  const totalReceived = allPayments
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + (p.amount || 0), 0)

  const totalPending = allPayments
    .filter((p) => p.status === 'pending')
    .reduce((sum, p) => sum + (p.amount || 0), 0)

  const totalRefunded = allPayments
    .filter((p) => p.status === 'refunded')
    .reduce((sum, p) => sum + (p.amount || 0), 0)

  const paymentCount = allPayments.length

  // Get invoice count in scope
  const invoiceConditions = [eq(clients.companyId, ctx.companyId!)]
  if (clientId) {
    invoiceConditions.push(eq(invoices.clientId, clientId))
  }
  if (startDate) {
    invoiceConditions.push(sql`${invoices.createdAt} >= ${startDate}`)
  }

  const [invoiceCountResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(invoices)
    .innerJoin(clients, eq(invoices.clientId, clients.id))
    .where(and(...invoiceConditions))

  const invoiceCount = Number(invoiceCountResult?.count || 0)

  // Get pending invoice count
  const pendingInvoiceConditions = [...invoiceConditions, eq(invoices.status, 'pending')]
  const [pendingInvoiceResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(invoices)
    .innerJoin(clients, eq(invoices.clientId, clients.id))
    .where(and(...pendingInvoiceConditions))

  const pendingInvoiceCount = Number(pendingInvoiceResult?.count || 0)

  const periodLabel = period ? ` (last ${period})` : ''
  const clientLabel = clientId ? ' for this client' : ''

  return {
    success: true,
    toolName: 'get_payment_stats',
    data: {
      total_received: totalReceived,
      total_pending: totalPending,
      total_refunded: totalRefunded,
      payment_count: paymentCount,
      invoice_count: invoiceCount,
      pending_invoice_count: pendingInvoiceCount,
      period: period || 'all_time',
    },
    message: `Payment stats${clientLabel}${periodLabel}: ${paymentCount} payment(s) totaling $${totalReceived.toLocaleString()} received, $${totalPending.toLocaleString()} pending, ${invoiceCount} invoice(s) (${pendingInvoiceCount} pending).`,
  }
}

/**
 * Create an internal refund (bookkeeping record with negative amount).
 *
 * This does NOT trigger a Stripe refund. It inserts a new payment record
 * with a negative amount and updates the original payment status to 'refunded'.
 */
export async function executeCreateRefund(
  args: Record<string, unknown>,
  ctx: Context
): Promise<ToolExecutionResult> {
  const paymentId = args.paymentId as string
  const partialAmount = args.amount as number | undefined
  const reason = args.reason as string | undefined

  if (!paymentId) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Payment ID is required',
    })
  }

  // Verify payment exists and belongs to company (through client)
  const [paymentResult] = await db
    .select({
      payment: payments,
      clientCompanyId: clients.companyId,
      weddingName: clients.weddingName,
      partner1FirstName: clients.partner1FirstName,
      partner2FirstName: clients.partner2FirstName,
    })
    .from(payments)
    .innerJoin(clients, eq(payments.clientId, clients.id))
    .where(
      and(
        eq(payments.id, paymentId),
        eq(clients.companyId, ctx.companyId!)
      )
    )
    .limit(1)

  if (!paymentResult) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Payment not found',
    })
  }

  const originalPayment = paymentResult.payment

  if (originalPayment.status === 'refunded') {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Payment has already been refunded',
    })
  }

  if (originalPayment.status !== 'paid') {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Can only refund paid payments. Current status: ${originalPayment.status}`,
    })
  }

  // Determine refund amount
  const originalAmount = originalPayment.amount || 0
  const refundAmount = partialAmount
    ? Math.min(partialAmount, originalAmount)
    : originalAmount

  if (refundAmount <= 0) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Refund amount must be positive',
    })
  }

  const isFullRefund = refundAmount >= originalAmount

  // Transaction: insert refund record + update original payment
  const refundRecord = await withTransaction(async (tx) => {
    // 1. Insert refund record as a negative-amount payment
    const [refund] = await tx
      .insert(payments)
      .values({
        id: crypto.randomUUID(),
        clientId: originalPayment.clientId,
        amount: -refundAmount,
        status: 'refunded',
      })
      .returning()

    // 2. Update original payment status
    await tx
      .update(payments)
      .set({
        status: 'refunded',
        updatedAt: new Date(),
      })
      .where(eq(payments.id, paymentId))

    // 3. Recalculate client stats
    await recalcClientStats(tx, originalPayment.clientId)

    return refund
  })

  const clientDisplayName = paymentResult.weddingName
    || `${paymentResult.partner1FirstName}${paymentResult.partner2FirstName ? ` & ${paymentResult.partner2FirstName}` : ''}`

  const refundType = isFullRefund ? 'Full' : 'Partial'

  return {
    success: true,
    toolName: 'create_refund',
    data: {
      refundId: refundRecord.id,
      originalPaymentId: paymentId,
      clientId: originalPayment.clientId,
      clientName: clientDisplayName,
      refundAmount,
      originalAmount,
      isFullRefund,
      reason: reason || null,
    },
    message: `${refundType} refund of $${refundAmount.toLocaleString()} recorded for ${clientDisplayName}.${reason ? ` Reason: ${reason}` : ''} (Internal bookkeeping only, not a Stripe refund.)`,
    warning: 'This is an internal bookkeeping refund. If a Stripe refund is also needed, please process it separately through the payments dashboard.',
  }
}
