/**
 * Pending Tool Calls Service
 *
 * February 2026 - PostgreSQL UNLOGGED table storage for pending chatbot tool calls
 *
 * Why PostgreSQL UNLOGGED instead of Redis:
 * - No additional infrastructure (already have PostgreSQL)
 * - No network hop to external service
 * - 2x faster writes than logged tables (0.03ms vs 0.24ms per query)
 * - Sufficient for confirmation flows (67ms read latency is imperceptible)
 * - Survives clean deploys/restarts (unlike in-memory)
 * - Auto-expiry via scheduled cleanup
 *
 * Trade-off: Data lost on unexpected crash (acceptable for 5-min TTL confirmations)
 *
 * Source: https://dizzy.zone/2025/09/24/Redis-is-fast-Ill-cache-in-Postgres/
 */

import { db, eq, lt } from '@/lib/db';
import { chatbotPendingCalls } from '@/lib/db/schema-chatbot';
import type { PendingToolCall } from './tool-executor';

// Default TTL: 5 minutes
const DEFAULT_TTL_MS = 5 * 60 * 1000;

/**
 * Store a pending tool call in PostgreSQL UNLOGGED table
 */
export async function setPendingCall(
  id: string,
  call: PendingToolCall
): Promise<void> {
  try {
    await db.insert(chatbotPendingCalls).values({
      id,
      userId: call.userId || 'unknown',
      companyId: call.companyId || 'unknown',
      toolName: call.toolName,
      args: call.args,
      preview: call.preview,
      expiresAt: call.expiresAt,
      createdAt: call.createdAt,
    });
  } catch (error) {
    console.error('[PendingCalls] Failed to store pending call:', error);
    throw error;
  }
}

/**
 * Get a pending tool call from PostgreSQL
 */
export async function getPendingCall(
  id: string
): Promise<PendingToolCall | null> {
  try {
    const [result] = await db
      .select()
      .from(chatbotPendingCalls)
      .where(eq(chatbotPendingCalls.id, id))
      .limit(1);

    if (!result) return null;

    // Check if expired
    if (result.expiresAt < new Date()) {
      // Clean up expired entry
      await deletePendingCall(id);
      return null;
    }

    return {
      id: result.id,
      userId: result.userId,
      companyId: result.companyId,
      toolName: result.toolName,
      args: result.args,
      preview: result.preview,
      createdAt: result.createdAt,
      expiresAt: result.expiresAt,
    } as PendingToolCall;
  } catch (error) {
    console.error('[PendingCalls] Failed to get pending call:', error);
    return null;
  }
}

/**
 * Delete a pending tool call
 */
export async function deletePendingCall(id: string): Promise<void> {
  try {
    await db
      .delete(chatbotPendingCalls)
      .where(eq(chatbotPendingCalls.id, id));
  } catch (error) {
    console.error('[PendingCalls] Failed to delete pending call:', error);
  }
}

/**
 * Check if a pending call exists
 */
export async function hasPendingCall(id: string): Promise<boolean> {
  try {
    const [result] = await db
      .select({ id: chatbotPendingCalls.id })
      .from(chatbotPendingCalls)
      .where(eq(chatbotPendingCalls.id, id))
      .limit(1);

    return !!result;
  } catch (error) {
    console.error('[PendingCalls] Failed to check pending call:', error);
    return false;
  }
}

/**
 * Get all pending calls for a user
 */
export async function getPendingCallsForUser(
  userId: string
): Promise<PendingToolCall[]> {
  try {
    const results = await db
      .select()
      .from(chatbotPendingCalls)
      .where(eq(chatbotPendingCalls.userId, userId));

    return results.map((r) => ({
      id: r.id,
      userId: r.userId,
      companyId: r.companyId,
      toolName: r.toolName,
      args: r.args,
      preview: r.preview,
      createdAt: r.createdAt,
      expiresAt: r.expiresAt,
    })) as PendingToolCall[];
  } catch (error) {
    console.error('[PendingCalls] Failed to get user pending calls:', error);
    return [];
  }
}

/**
 * Clean up expired pending calls
 * Call this periodically (e.g., via cron job or on each request)
 */
export async function cleanupExpiredCalls(): Promise<number> {
  try {
    const result = await db
      .delete(chatbotPendingCalls)
      .where(lt(chatbotPendingCalls.expiresAt, new Date()));

    // Drizzle returns the deleted rows count in some drivers
    return 0; // Count not available in all drivers
  } catch (error) {
    console.error('[PendingCalls] Failed to cleanup expired calls:', error);
    return 0;
  }
}

/**
 * Clear all pending calls (for testing/admin)
 */
export async function clearAllPendingCalls(): Promise<void> {
  try {
    await db.delete(chatbotPendingCalls);
  } catch (error) {
    console.error('[PendingCalls] Failed to clear all pending calls:', error);
  }
}
