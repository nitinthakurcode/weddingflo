/**
 * Transaction Wrapper Service
 *
 * February 2026 - AI Command Chatbot Feature
 *
 * Production-grade transaction wrapper with:
 * - Atomic operations for cascade mutations
 * - Deadlock detection and retry
 * - Rollback on any failure
 * - Proper resource cleanup
 */

import { db } from '@/lib/db'
import { TRPCError } from '@trpc/server'

// Transaction type compatible with Drizzle transactions
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TransactionClient = any

// ============================================
// CONSTANTS
// ============================================

const MAX_RETRIES = 3
const DEADLOCK_RETRY_DELAY_MS = 100

// PostgreSQL error codes
const DEADLOCK_ERROR_CODE = '40P01'
const SERIALIZATION_FAILURE_CODE = '40001'
const LOCK_NOT_AVAILABLE_CODE = '55P03'

// ============================================
// TYPES
// ============================================

interface TransactionOptions {
  isolationLevel?: 'read committed' | 'repeatable read' | 'serializable'
  maxRetries?: number
  retryDelayMs?: number
}

// ============================================
// UTILITIES
// ============================================

/**
 * Check if error is a retryable database error
 */
function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false

  // Check for PostgreSQL error codes
  if ('code' in error) {
    const code = (error as { code: string }).code
    return [
      DEADLOCK_ERROR_CODE,
      SERIALIZATION_FAILURE_CODE,
      LOCK_NOT_AVAILABLE_CODE,
    ].includes(code)
  }

  // Check for network/connection errors
  const message = error.message.toLowerCase()
  return (
    message.includes('connection') ||
    message.includes('timeout') ||
    message.includes('deadlock')
  )
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ============================================
// MAIN WRAPPER
// ============================================

/**
 * Execute a function within a database transaction with automatic rollback
 *
 * @param fn - Function to execute within transaction (receives transaction client)
 * @param options - Transaction options
 * @returns Result of the function
 * @throws TRPCError on failure after all retries
 *
 * @example
 * ```typescript
 * const result = await withTransaction(async (tx) => {
 *   const [client] = await tx.insert(clients).values({...}).returning()
 *   const [event] = await tx.insert(events).values({...}).returning()
 *   // If event insert fails, client insert is rolled back
 *   return { client, event }
 * })
 * ```
 */
export async function withTransaction<T>(
  fn: (tx: TransactionClient) => Promise<T>,
  options: TransactionOptions = {}
): Promise<T> {
  const {
    maxRetries = MAX_RETRIES,
    retryDelayMs = DEADLOCK_RETRY_DELAY_MS,
  } = options

  let lastError: Error | null = null
  let attempt = 0

  while (attempt < maxRetries) {
    attempt++

    try {
      // Execute within transaction
      // Note: Drizzle's transaction() automatically handles:
      // - BEGIN
      // - COMMIT on success
      // - ROLLBACK on error
      const result = await db.transaction(async (tx) => {
        return await fn(tx)
      })

      return result
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Check if we should retry
      if (isRetryableError(error) && attempt < maxRetries) {
        console.warn(
          `[Transaction] Retryable error on attempt ${attempt}/${maxRetries}:`,
          lastError.message
        )

        // Exponential backoff
        await sleep(retryDelayMs * attempt)
        continue
      }

      // Don't retry on constraint violations or other non-retryable errors
      break
    }
  }

  // All retries exhausted or non-retryable error
  console.error('[Transaction] Failed after retries:', lastError)

  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Transaction failed. Please try again.',
    cause: lastError,
  })
}

/**
 * Execute multiple operations atomically
 *
 * Convenience wrapper for executing a sequence of operations
 * that should all succeed or all fail together.
 *
 * @param operations - Array of functions to execute
 * @returns Array of results in the same order
 */
export async function withAtomicOperations<T extends Array<unknown>>(
  operations: { [K in keyof T]: (tx: TransactionClient) => Promise<T[K]> }
): Promise<T> {
  return withTransaction(async (tx) => {
    const results: unknown[] = []

    for (const operation of operations) {
      const result = await operation(tx)
      results.push(result)
    }

    return results as T
  })
}

/**
 * Safe wrapper for cascade operations
 *
 * Executes a main operation and its cascade effects atomically.
 * If any cascade effect fails, the main operation is rolled back.
 *
 * @param mainOperation - Primary operation to execute
 * @param cascadeOperations - Array of cascade operations (receive main result)
 * @returns Main result and cascade results
 */
export async function withCascadeTransaction<TMain, TCascade extends Array<unknown>>(
  mainOperation: (tx: TransactionClient) => Promise<TMain>,
  cascadeOperations: {
    [K in keyof TCascade]: (tx: TransactionClient, mainResult: TMain) => Promise<TCascade[K]>
  }
): Promise<{ main: TMain; cascade: TCascade }> {
  return withTransaction(async (tx) => {
    // Execute main operation
    const mainResult = await mainOperation(tx)

    // Execute cascade operations
    const cascadeResults: unknown[] = []

    for (const cascadeOp of cascadeOperations) {
      const cascadeResult = await cascadeOp(tx, mainResult)
      cascadeResults.push(cascadeResult)
    }

    return {
      main: mainResult,
      cascade: cascadeResults as TCascade,
    }
  })
}

// ============================================
// EXPORTS
// ============================================

export default withTransaction
