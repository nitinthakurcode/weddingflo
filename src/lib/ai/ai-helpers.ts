import { createServerSupabaseClient } from '@/lib/supabase/server'
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
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .rpc('check_ai_quota', { p_company_id: companyId })

  if (error) {
    console.error('Error checking AI quota:', error)
    return false
  }

  return data === true
}

/**
 * Get current AI usage for company
 */
export async function getAIUsage(companyId: string) {
  const supabase = createServerSupabaseClient()

  const { data: company, error } = await supabase
    .from('companies')
    .select('ai_queries_this_month, subscription_tier')
    .eq('id', companyId)
    .single()

  if (error) {
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

  const limit = quotaLimits[company.subscription_tier] || 5
  const used = company.ai_queries_this_month || 0
  const remaining = Math.max(0, limit - used)
  const percentageUsed = (used / limit) * 100

  return {
    used,
    limit,
    remaining,
    percentageUsed: Math.round(percentageUsed),
    tier: company.subscription_tier,
  }
}

/**
 * Log AI usage to database
 */
export async function logAIUsage(params: AIUsageParams): Promise<void> {
  const supabase = createServerSupabaseClient()

  const cost = calculateAICost(
    params.promptTokens,
    params.completionTokens,
    params.model
  )

  // Insert usage log
  const { error: logError } = await supabase
    .from('ai_usage_logs')
    .insert({
      company_id: params.companyId,
      user_id: params.userId,
      feature_type: params.featureType,
      prompt_tokens: params.promptTokens,
      completion_tokens: params.completionTokens,
      total_tokens: params.totalTokens,
      cost_usd: cost,
      model: params.model,
      request_data: params.requestData || {},
      response_data: params.responseData || {},
    })

  if (logError) {
    console.error('Error logging AI usage:', logError)
  }

  // Increment usage counter
  const { error: incrementError } = await supabase
    .rpc('increment_ai_usage', { p_company_id: params.companyId })

  if (incrementError) {
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
