/**
 * Chatbot tRPC Router
 *
 * February 2026 - AI Command Chatbot Feature
 *
 * Main router for the AI chatbot with:
 * - LLM function calling integration (GPT-4o-mini primary, GPT-4o fallback)
 * - Tool execution via existing tRPC infrastructure
 * - Confirmation flow for mutations
 * - Rate limiting and quota management
 */

import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '@/server/trpc/trpc'
import { getAIClient, AI_CONFIG, fallbackAI } from '@/lib/ai/openai-client'
import { clients } from '@/lib/db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { callAIWithTracking, getAIUsage } from '@/lib/ai/ai-helpers'
import { checkRateLimit } from '@/lib/ai/rate-limiter'
import { CHATBOT_TOOLS, isQueryTool, getCascadeEffects, getToolMetadata } from '../../tools/definitions'
import {
  buildChatbotContext,
  extractClientIdFromPath,
  updateConversationMemory,
  resolvePronouns,
  getConversationMemory,
  createConversation,
  getConversation,
  listConversations,
  updateConversation,
  deleteConversation,
  saveMessage,
  loadConversationHistory,
  getRecentConversation,
  generateConversationTitle,
  convertMessagesToApiFormat,
  // Template functions (Phase 6)
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  recordTemplateUsage,
  toggleTemplatePin,
  getSuggestedTemplates,
} from '../services/context-builder'
import { buildChatbotSystemPrompt } from '@/lib/ai/prompts/chatbot-system'
import {
  generateToolPreview,
  executeTool,
  type ToolPreview,
  type ToolExecutionResult,
  type PendingToolCall,
} from '../services/tool-executor'
import {
  setPendingCall,
  getPendingCall,
  deletePendingCall,
} from '../services/pending-calls'
import type {
  ChatCompletionMessageParam,
  ChatCompletionToolChoiceOption,
} from 'openai/resources/chat/completions'

// ============================================
// INPUT SCHEMAS
// ============================================

const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system', 'tool']),
  content: z.string(),
  name: z.string().optional(),
  tool_call_id: z.string().optional(),
})

const chatInputSchema = z.object({
  messages: z.array(chatMessageSchema),
  clientId: z.string().uuid().optional(),
  pathname: z.string().optional(),
})

const confirmToolCallSchema = z.object({
  pendingCallId: z.string(),
  toolName: z.string(),
  args: z.record(z.string(), z.unknown()),
  clientId: z.string().uuid().optional(),
})

// NOTE: Pending tool calls are stored in PostgreSQL UNLOGGED table via pending-calls.ts
// This provides persistence across deploys and multi-instance support without external Redis

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Extract entity information from tool execution result for conversation memory
 */
function extractEntityFromResult(
  toolName: string,
  result: ToolExecutionResult
): { type: 'guest' | 'event' | 'vendor' | 'budget'; id: string; name: string } | undefined {
  if (!result.data) return undefined

  const data = result.data as Record<string, unknown>

  // Map tool names to entity types
  if (toolName.includes('guest')) {
    return data.id && data.name
      ? { type: 'guest', id: String(data.id), name: String(data.name) }
      : undefined
  }

  if (toolName.includes('event')) {
    return data.id && data.title
      ? { type: 'event', id: String(data.id), name: String(data.title) }
      : undefined
  }

  if (toolName.includes('vendor')) {
    return data.id && data.name
      ? { type: 'vendor', id: String(data.id), name: String(data.name) }
      : undefined
  }

  if (toolName.includes('budget')) {
    return data.id && data.category
      ? { type: 'budget', id: String(data.id), name: String(data.category) }
      : undefined
  }

  return undefined
}

// ============================================
// ROUTER
// ============================================

export const chatbotRouter = router({
  /**
   * Main chat procedure with tool calling
   *
   * Process:
   * 1. Build context from client data
   * 2. Call LLM with function calling
   * 3. For queries: execute immediately and return
   * 4. For mutations: generate preview and request confirmation
   */
  chat: protectedProcedure
    .input(chatInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { userId, companyId } = ctx

      if (!companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID required',
        })
      }

      // Rate limit check
      try {
        await checkRateLimit(userId)
      } catch (error) {
        if (error instanceof Error && error.message.includes('Rate limit')) {
          throw new TRPCError({
            code: 'TOO_MANY_REQUESTS',
            message: error.message,
          })
        }
        throw error
      }

      // Extract clientId from URL or use provided
      const clientId = input.clientId || (input.pathname ? extractClientIdFromPath(input.pathname) : null)

      // SECURITY: Validate client ownership if clientId provided
      if (clientId) {
        const [client] = await ctx.db.select({ id: clients.id }).from(clients)
          .where(and(
            eq(clients.id, clientId),
            eq(clients.companyId, companyId),
            isNull(clients.deletedAt)
          ))
          .limit(1)

        if (!client) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Client not found or access denied',
          })
        }
      }

      // Build context with user preferences and conversation memory (2026 Best Practices)
      const context = await buildChatbotContext(clientId, companyId, userId)

      // Phase 5: Active Pronoun Resolution
      // Resolve pronouns like "them", "it", "that" to recently discussed entities
      const userMessage = input.messages.at(-1)?.content || ''
      const memory = getConversationMemory(userId, clientId || undefined)
      const resolvedEntity = resolvePronouns(userMessage, memory)

      // Inject resolution into context for system prompt
      let systemPrompt = buildChatbotSystemPrompt(context)
      if (resolvedEntity) {
        systemPrompt += `\n\n## Pronoun Resolution
When the user says "them", "it", "that", or similar pronouns in this message, they likely mean:
- Entity: ${resolvedEntity.entityName}
- Type: ${resolvedEntity.entityType}
- ID: ${resolvedEntity.entityId}

Use this information to correctly interpret the user's request.`
      }

      // Prepare messages for API
      const apiMessages: ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        ...input.messages.map((m): ChatCompletionMessageParam => ({
          role: m.role as 'user' | 'assistant' | 'system',
          content: m.content,
        })),
      ]

      try {
        // Call AI with tracking
        const result = await callAIWithTracking(
          companyId,
          userId,
          'general_assistant',
          async () => {
            const client = getAIClient()

            try {
              const completion = await client.chat.completions.create({
                model: AI_CONFIG.model,
                messages: apiMessages,
                tools: CHATBOT_TOOLS,
                tool_choice: 'auto' as ChatCompletionToolChoiceOption,
                max_tokens: AI_CONFIG.maxTokens,
                temperature: 0.7,
              })

              return {
                response: completion,
                usage: {
                  prompt_tokens: completion.usage?.prompt_tokens || 0,
                  completion_tokens: completion.usage?.completion_tokens || 0,
                  total_tokens: completion.usage?.total_tokens || 0,
                },
              }
            } catch (primaryError) {
              // Fallback to GPT-4o if primary fails
              console.warn('[Chatbot] Primary AI failed, falling back to GPT-4o:', primaryError)

              const fallbackCompletion = await fallbackAI.chat.completions.create({
                model: AI_CONFIG.fallbackModel,
                messages: apiMessages,
                tools: CHATBOT_TOOLS,
                tool_choice: 'auto' as ChatCompletionToolChoiceOption,
                max_tokens: AI_CONFIG.maxTokens,
                temperature: 0.7,
              })

              return {
                response: fallbackCompletion,
                usage: {
                  prompt_tokens: fallbackCompletion.usage?.prompt_tokens || 0,
                  completion_tokens: fallbackCompletion.usage?.completion_tokens || 0,
                  total_tokens: fallbackCompletion.usage?.total_tokens || 0,
                },
              }
            }
          },
          {
            clientId,
            messageCount: input.messages.length,
            hasContext: context.hasClient,
          }
        )

        const assistantMessage = result.choices[0]?.message

        if (!assistantMessage) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'No response from AI',
          })
        }

        // Check for tool calls
        if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
          const toolCall = assistantMessage.tool_calls[0] as { id: string; type: string; function: { name: string; arguments: string } }
          const toolName = toolCall.function?.name
          let args: Record<string, unknown>

          if (!toolName) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Invalid tool call: missing function name',
            })
          }

          try {
            args = JSON.parse(toolCall.function.arguments)
          } catch (e) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `Invalid tool arguments: ${e instanceof Error ? e.message : 'Parse error'}`,
            })
          }

          // Inject clientId if not provided but available from context
          if (!args.clientId && clientId) {
            args.clientId = clientId
          }

          // For queries, execute immediately
          if (isQueryTool(toolName)) {
            try {
              const toolResult = await executeTool(toolName, args, ctx)

              // Update conversation memory with the query topic (2026 Best Practices)
              updateConversationMemory(userId, clientId || undefined, {
                topic: toolName.replace(/_/g, ' '),
              })

              // Generate natural language response
              const followUpMessages: ChatCompletionMessageParam[] = [
                ...apiMessages,
                {
                  role: 'assistant',
                  content: null,
                  tool_calls: [toolCall],
                } as ChatCompletionMessageParam,
                {
                  role: 'tool',
                  content: JSON.stringify(toolResult.data),
                  tool_call_id: toolCall.id,
                } as ChatCompletionMessageParam,
              ]

              const followUp = await getAIClient().chat.completions.create({
                model: AI_CONFIG.model,
                messages: followUpMessages,
                max_tokens: AI_CONFIG.maxTokens,
                temperature: 0.7,
              })

              return {
                type: 'response' as const,
                content: followUp.choices[0]?.message?.content || toolResult.message,
                toolResult,
              }
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Tool execution failed'

              return {
                type: 'error' as const,
                content: `I encountered an error: ${errorMessage}. Would you like me to try something else?`,
                error: errorMessage,
              }
            }
          }

          // For mutations, generate preview and require confirmation
          try {
            const preview = await generateToolPreview(toolName, args, ctx)

            // Store pending call in PostgreSQL UNLOGGED table (with 5 minute TTL)
            const pendingId = crypto.randomUUID()
            await setPendingCall(pendingId, {
              id: pendingId,
              toolName,
              args,
              preview,
              userId: ctx.userId,
              companyId: ctx.companyId || 'unknown',
              createdAt: new Date(),
              expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minute expiry
            })

            return {
              type: 'confirmation_required' as const,
              content: assistantMessage.content || `I'll ${preview.description}`,
              pendingCallId: pendingId,
              preview,
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Preview generation failed'

            return {
              type: 'error' as const,
              content: `I couldn't prepare this action: ${errorMessage}`,
              error: errorMessage,
            }
          }
        }

        // No tool calls - just return the response
        return {
          type: 'response' as const,
          content: assistantMessage.content || 'I understood your request.',
        }
      } catch (error) {
        console.error('[Chatbot] Error:', error)

        if (error instanceof TRPCError) {
          throw error
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Chat failed',
        })
      }
    }),

  /**
   * Confirm and execute a pending tool call
   */
  confirmToolCall: protectedProcedure
    .input(confirmToolCallSchema)
    .mutation(async ({ ctx, input }) => {
      const { userId, companyId } = ctx

      if (!companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID required',
        })
      }

      // SECURITY: Validate client ownership if clientId provided
      if (input.clientId) {
        const [client] = await ctx.db.select({ id: clients.id }).from(clients)
          .where(and(
            eq(clients.id, input.clientId),
            eq(clients.companyId, companyId),
            isNull(clients.deletedAt)
          ))
          .limit(1)

        if (!client) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Client not found or access denied',
          })
        }
      }

      // Get pending call from Redis
      const pending = await getPendingCall(input.pendingCallId)

      if (!pending) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Pending tool call not found or expired. Please try your request again.',
        })
      }

      // Verify it matches
      if (pending.toolName !== input.toolName) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Tool call mismatch',
        })
      }

      // Check expiry
      if (pending.expiresAt < new Date()) {
        await deletePendingCall(input.pendingCallId)
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This confirmation has expired. Please try your request again.',
        })
      }

      try {
        // Execute the tool
        const result = await executeTool(pending.toolName, pending.args, ctx)

        // Clean up pending call
        await deletePendingCall(input.pendingCallId)

        // Update conversation memory with the mutation (2026 Best Practices)
        const entityFromResult = extractEntityFromResult(pending.toolName, result)
        updateConversationMemory(userId, input.clientId || undefined, {
          topic: pending.toolName.replace(/_/g, ' '),
          entity: entityFromResult,
          clearFollowUp: true,
        })

        // Generate success message
        let successMessage = result.message

        if (result.cascadeResults && result.cascadeResults.length > 0) {
          successMessage += '\n\nAdditionally:\n'
          successMessage += result.cascadeResults.map(c => `- ${c.action}`).join('\n')
        }

        return {
          success: true,
          message: successMessage,
          data: result.data,
          cascadeResults: result.cascadeResults,
        }
      } catch (error) {
        // Clean up pending call on error too
        await deletePendingCall(input.pendingCallId)

        const errorMessage = error instanceof Error ? error.message : 'Execution failed'

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to execute: ${errorMessage}`,
        })
      }
    }),

  /**
   * Cancel a pending tool call
   */
  cancelToolCall: protectedProcedure
    .input(z.object({ pendingCallId: z.string() }))
    .mutation(async ({ input }) => {
      await deletePendingCall(input.pendingCallId)

      return {
        success: true,
        message: 'Action cancelled',
      }
    }),

  /**
   * Get AI usage statistics
   */
  getUsage: protectedProcedure
    .query(async ({ ctx }) => {
      const { companyId } = ctx

      if (!companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID required',
        })
      }

      return await getAIUsage(companyId)
    }),

  /**
   * Get context for current session (for debugging/display)
   */
  getContext: protectedProcedure
    .input(z.object({
      clientId: z.string().uuid().optional(),
      pathname: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { userId, companyId } = ctx

      if (!companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID required',
        })
      }

      const clientId = input.clientId || (input.pathname ? extractClientIdFromPath(input.pathname) : null)

      // Include user preferences and conversation memory (2026 Best Practices)
      return await buildChatbotContext(clientId, companyId, userId)
    }),

  // ============================================
  // CONVERSATION PERSISTENCE (February 2026)
  // ============================================

  /**
   * List conversations for the current user
   */
  listConversations: protectedProcedure
    .input(z.object({
      clientId: z.string().uuid().optional().nullable(),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      const { userId, companyId } = ctx

      if (!companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID required',
        })
      }

      return await listConversations(userId, companyId, {
        clientId: input.clientId,
        limit: input.limit,
        offset: input.offset,
      })
    }),

  /**
   * Get a specific conversation with messages
   */
  getConversation: protectedProcedure
    .input(z.object({
      conversationId: z.string().uuid(),
      messageLimit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      const { userId } = ctx

      const conversation = await getConversation(input.conversationId)

      if (!conversation) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Conversation not found',
        })
      }

      // Verify ownership
      if (conversation.userId !== userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Access denied to this conversation',
        })
      }

      // Load messages
      const messages = await loadConversationHistory(input.conversationId, {
        limit: input.messageLimit,
      })

      return {
        conversation,
        messages,
      }
    }),

  /**
   * Create a new conversation
   */
  createConversation: protectedProcedure
    .input(z.object({
      clientId: z.string().uuid().optional().nullable(),
      title: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { userId, companyId } = ctx

      if (!companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID required',
        })
      }

      return await createConversation(
        userId,
        companyId,
        input.clientId,
        input.title
      )
    }),

  /**
   * Resume an existing conversation or get/create a recent one
   */
  resumeConversation: protectedProcedure
    .input(z.object({
      conversationId: z.string().uuid().optional(),
      clientId: z.string().uuid().optional().nullable(),
      withinHours: z.number().min(1).max(168).default(24), // Max 1 week
    }))
    .mutation(async ({ ctx, input }) => {
      const { userId, companyId } = ctx

      if (!companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID required',
        })
      }

      // If specific conversation ID provided, resume it
      if (input.conversationId) {
        const conversation = await getConversation(input.conversationId)

        if (!conversation) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Conversation not found',
          })
        }

        if (conversation.userId !== userId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Access denied',
          })
        }

        const messages = await loadConversationHistory(input.conversationId)

        return {
          conversation,
          messages,
          isNew: false,
        }
      }

      // Try to find recent conversation
      const recent = await getRecentConversation(
        userId,
        companyId,
        input.clientId,
        input.withinHours
      )

      if (recent) {
        const messages = await loadConversationHistory(recent.id)

        return {
          conversation: recent,
          messages,
          isNew: false,
        }
      }

      // Create new conversation
      const newConversation = await createConversation(
        userId,
        companyId,
        input.clientId
      )

      return {
        conversation: newConversation,
        messages: [],
        isNew: true,
      }
    }),

  /**
   * Update conversation metadata (title, etc.)
   */
  updateConversation: protectedProcedure
    .input(z.object({
      conversationId: z.string().uuid(),
      title: z.string().optional(),
      summary: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { userId } = ctx

      const conversation = await getConversation(input.conversationId)

      if (!conversation) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Conversation not found',
        })
      }

      if (conversation.userId !== userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Access denied',
        })
      }

      await updateConversation(input.conversationId, {
        title: input.title,
        summary: input.summary,
      })

      return { success: true }
    }),

  /**
   * Delete a conversation
   */
  deleteConversation: protectedProcedure
    .input(z.object({
      conversationId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { userId } = ctx

      const conversation = await getConversation(input.conversationId)

      if (!conversation) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Conversation not found',
        })
      }

      if (conversation.userId !== userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Access denied',
        })
      }

      await deleteConversation(input.conversationId)

      return { success: true }
    }),

  /**
   * Save a message to a conversation (called after streaming completes)
   */
  saveMessage: protectedProcedure
    .input(z.object({
      conversationId: z.string().uuid(),
      role: z.enum(['user', 'assistant', 'system', 'tool']),
      content: z.string(),
      toolName: z.string().optional(),
      toolArgs: z.record(z.string(), z.unknown()).optional(),
      toolResult: z.record(z.string(), z.unknown()).optional(),
      status: z.enum(['pending', 'streaming', 'success', 'error']).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { userId } = ctx

      const conversation = await getConversation(input.conversationId)

      if (!conversation) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Conversation not found',
        })
      }

      if (conversation.userId !== userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Access denied',
        })
      }

      const message = await saveMessage(input.conversationId, {
        role: input.role,
        content: input.content,
        toolName: input.toolName,
        toolArgs: input.toolArgs,
        toolResult: input.toolResult,
        status: input.status,
      })

      // Auto-generate title if this is the first user message
      if (input.role === 'user' && conversation.messageCount === 0 && !conversation.title) {
        const title = generateConversationTitle(input.content)
        await updateConversation(input.conversationId, { title })
      }

      return { message }
    }),

  // ============================================
  // COMMAND TEMPLATES (February 2026 - Phase 6)
  // ============================================

  /**
   * List user's command templates
   */
  listTemplates: protectedProcedure
    .input(z.object({
      category: z.enum(['custom', 'guests', 'budget', 'events', 'vendors', 'timeline', 'workflow']).optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      const { userId, companyId } = ctx

      if (!companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID required',
        })
      }

      return await listTemplates(userId, companyId, {
        category: input.category,
        limit: input.limit,
        offset: input.offset,
      })
    }),

  /**
   * Get a specific template
   */
  getTemplate: protectedProcedure
    .input(z.object({
      templateId: z.string().uuid(),
    }))
    .query(async ({ ctx, input }) => {
      const { userId } = ctx

      const template = await getTemplate(input.templateId)

      if (!template) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Template not found',
        })
      }

      // Verify ownership
      if (template.userId !== userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Access denied to this template',
        })
      }

      return template
    }),

  /**
   * Create a new template
   */
  saveTemplate: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(100),
      command: z.string().min(1).max(500),
      description: z.string().max(255).optional(),
      icon: z.string().max(50).optional(),
      category: z.enum(['custom', 'guests', 'budget', 'events', 'vendors', 'timeline', 'workflow']).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { userId, companyId } = ctx

      if (!companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID required',
        })
      }

      const template = await createTemplate(userId, companyId, {
        name: input.name,
        command: input.command,
        description: input.description,
        icon: input.icon,
        category: input.category,
      })

      return template
    }),

  /**
   * Update an existing template
   */
  updateTemplate: protectedProcedure
    .input(z.object({
      templateId: z.string().uuid(),
      name: z.string().min(1).max(100).optional(),
      command: z.string().min(1).max(500).optional(),
      description: z.string().max(255).optional(),
      icon: z.string().max(50).optional(),
      category: z.enum(['custom', 'guests', 'budget', 'events', 'vendors', 'timeline', 'workflow']).optional(),
      isPinned: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { userId } = ctx
      const { templateId, ...updates } = input

      const template = await getTemplate(templateId)

      if (!template) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Template not found',
        })
      }

      if (template.userId !== userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Access denied',
        })
      }

      await updateTemplate(templateId, updates)

      return { success: true }
    }),

  /**
   * Delete a template
   */
  deleteTemplate: protectedProcedure
    .input(z.object({
      templateId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { userId } = ctx

      const template = await getTemplate(input.templateId)

      if (!template) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Template not found',
        })
      }

      if (template.userId !== userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Access denied',
        })
      }

      await deleteTemplate(input.templateId)

      return { success: true }
    }),

  /**
   * Use a template (increments usage count)
   */
  useTemplate: protectedProcedure
    .input(z.object({
      templateId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { userId } = ctx

      const template = await getTemplate(input.templateId)

      if (!template) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Template not found',
        })
      }

      if (template.userId !== userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Access denied',
        })
      }

      await recordTemplateUsage(input.templateId)

      return {
        command: template.command,
        success: true,
      }
    }),

  /**
   * Toggle pin status for a template
   */
  toggleTemplatePin: protectedProcedure
    .input(z.object({
      templateId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { userId } = ctx

      const template = await getTemplate(input.templateId)

      if (!template) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Template not found',
        })
      }

      if (template.userId !== userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Access denied',
        })
      }

      const isPinned = await toggleTemplatePin(input.templateId)

      return { isPinned, success: true }
    }),

  /**
   * Get suggested templates based on usage patterns
   */
  getSuggestedTemplates: protectedProcedure
    .query(async ({ ctx }) => {
      const { userId, companyId } = ctx

      if (!companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID required',
        })
      }

      return await getSuggestedTemplates(userId, companyId)
    }),
})

export type ChatbotRouter = typeof chatbotRouter
