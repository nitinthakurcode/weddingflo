import { db, eq, sql } from '@/lib/db'
import { companies } from '@/lib/db/schema'
import { openai, calculateAICost, AI_CONFIG } from './openai-client'
import { TRPCError } from '@trpc/server'
import type { AIFeatureType } from './openai-client'

interface AIUsageParams {
  companyId: string
  userId: string
  featureType: AIFeatureType
  promptTokens: number
  completionTokens: number
  totalTokens: number
  model: string
  requestData?: Record<string, any>
  responseData?: Record<string, any>
}

/**
 * Check if company has remaining AI quota
 */
export async function checkAIQuota(companyId: string): Promise<boolean> {
  try {
    // Call database function via raw SQL
    const result = await db.execute(sql`
      SELECT check_ai_quota(${companyId}) as has_quota
    `)

    return (result.rows[0] as { has_quota: boolean })?.has_quota === true
  } catch (error) {
    console.error('Error checking AI quota:', error)
    return false
  }
}

/**
 * Get current AI usage for company
 */
export async function getAIUsage(companyId: string) {
  const companyResult = await db
    .select({
      aiQueriesThisMonth: companies.aiQueriesThisMonth,
      subscriptionTier: companies.subscriptionTier,
    })
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1)

  const company = companyResult[0]

  if (!company) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to fetch AI usage',
    })
  }

  // Get quota limit based on tier
  const quotaLimits: Record<string, number> = {
    free: 5,
    starter: 50,
    professional: 200,
    enterprise: 1000,
  }

  const limit = quotaLimits[company.subscriptionTier || 'free'] || 5
  const used = company.aiQueriesThisMonth || 0
  const remaining = Math.max(0, limit - used)
  const percentageUsed = (used / limit) * 100

  return {
    used,
    limit,
    remaining,
    percentageUsed: Math.round(percentageUsed),
    tier: company.subscriptionTier,
  }
}

/**
 * Log AI usage to database
 */
export async function logAIUsage(params: AIUsageParams): Promise<void> {
  const cost = calculateAICost(
    params.promptTokens,
    params.completionTokens,
    params.model
  )

  try {
    // Insert usage log using raw SQL
    await db.execute(sql`
      INSERT INTO ai_usage_logs (
        company_id, user_id, feature_type, prompt_tokens, completion_tokens,
        total_tokens, cost_usd, model, request_data, response_data
      )
      VALUES (
        ${params.companyId}, ${params.userId}, ${params.featureType},
        ${params.promptTokens}, ${params.completionTokens}, ${params.totalTokens},
        ${cost}, ${params.model},
        ${JSON.stringify(params.requestData || {})}::jsonb,
        ${JSON.stringify(params.responseData || {})}::jsonb
      )
    `)
  } catch (logError) {
    console.error('Error logging AI usage:', logError)
  }

  // Increment usage counter
  try {
    await db.execute(sql`
      SELECT increment_ai_usage(${params.companyId})
    `)
  } catch (incrementError) {
    console.error('Error incrementing AI usage:', incrementError)
  }
}

/**
 * Wrapper for AI calls with automatic quota checking and logging
 */
export async function callAIWithTracking<T>(
  companyId: string,
  userId: string,
  featureType: AIFeatureType,
  aiCallFn: () => Promise<{
    response: T
    usage: {
      prompt_tokens: number
      completion_tokens: number
      total_tokens: number
    }
  }>,
  requestData?: Record<string, any>
): Promise<T> {
  // Check quota first
  const hasQuota = await checkAIQuota(companyId)

  if (!hasQuota) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'AI quota exceeded for this month. Please upgrade your subscription.',
    })
  }

  // Make AI call
  const { response, usage } = await aiCallFn()

  // Log usage (fire and forget - don't block response)
  logAIUsage({
    companyId,
    userId,
    featureType,
    promptTokens: usage.prompt_tokens,
    completionTokens: usage.completion_tokens,
    totalTokens: usage.total_tokens,
    model: AI_CONFIG.model,
    requestData,
    responseData: typeof response === 'object' ? response as Record<string, any> : { result: response },
  }).catch(error => {
    console.error('Failed to log AI usage:', error)
  })

  return response
}
