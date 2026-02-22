/**
 * Sync Router - Real-Time Sync via tRPC Subscriptions
 *
 * February 2026 - Scalable real-time sync using Redis pub/sub
 *
 * This router provides:
 * - Real-time sync subscriptions using tRPC v11 SSE
 * - Offline recovery via lastSyncTimestamp
 * - Multi-instance support via Redis
 *
 * Architecture: tRPC subscription with async generators
 */

import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc'
import {
  getMissedActions,
  subscribeToCompany,
  type SyncAction,
} from '@/lib/realtime/redis-pubsub'

export const syncRouter = router({
  /**
   * Real-time subscription for sync events
   *
   * Uses tRPC v11 native SSE subscriptions with async generators.
   * Connects to Redis to receive sync events for the user's company.
   *
   * Phase 1: Sends any missed actions since lastSyncTimestamp (offline recovery)
   * Phase 2: Streams live updates as they occur
   *
   * @param lastSyncTimestamp - Optional timestamp to recover missed events
   */
  onSync: protectedProcedure
    .input(
      z.object({
        lastSyncTimestamp: z.number().optional(),
      })
    )
    .subscription(async function* ({ ctx, input, signal }) {
      const { companyId, userId } = ctx

      if (!companyId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Company ID required for sync subscription',
        })
      }

      console.log(
        `[Sync Router] User ${userId} subscribed to company ${companyId}`
      )

      // Phase 1: Offline recovery - send missed actions
      if (input.lastSyncTimestamp) {
        try {
          const missed = await getMissedActions(companyId, input.lastSyncTimestamp)
          console.log(
            `[Sync Router] Sending ${missed.length} missed actions since ${input.lastSyncTimestamp}`
          )

          for (const action of missed) {
            // Don't echo back actions from the same user
            if (action.userId !== userId) {
              yield action
            }
          }
        } catch (error) {
          console.error('[Sync Router] Failed to get missed actions:', error)
          // Continue to live streaming even if recovery fails
        }
      }

      // Phase 2: Stream live updates via Redis subscription
      try {
        for await (const action of subscribeToCompany(companyId, signal)) {
          // Don't echo back actions from the same user
          if (action.userId !== userId) {
            yield action
          }
        }
      } catch (error) {
        if (signal?.aborted) {
          console.log(`[Sync Router] User ${userId} unsubscribed from company ${companyId}`)
        } else {
          console.error('[Sync Router] Subscription error:', error)
          throw error
        }
      }
    }),

  /**
   * Get sync status and missed action count
   * Useful for debugging and UI status indicators
   */
  getStatus: protectedProcedure
    .input(
      z.object({
        since: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { companyId, userId } = ctx

      if (!companyId) {
        return {
          connected: false,
          missedCount: 0,
          userId,
          companyId: null,
        }
      }

      let missedCount = 0
      if (input.since) {
        const missed = await getMissedActions(companyId, input.since)
        missedCount = missed.filter((a) => a.userId !== userId).length
      }

      return {
        connected: true,
        missedCount,
        userId,
        companyId,
      }
    }),
})

export type SyncRouter = typeof syncRouter
