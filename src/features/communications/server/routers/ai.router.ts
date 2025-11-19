import { router, protectedProcedure, adminProcedure } from '@/server/trpc/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { openai, AI_CONFIG } from '@/lib/ai/openai-client';
import { callAIWithTracking, getAIUsage } from '@/lib/ai/ai-helpers';
import {
  generateBudgetPredictionPrompt,
  type BudgetPredictionInput,
  type BudgetPredictionResponse
} from '@/lib/ai/prompts/budget-prediction';
import {
  generateEmailPrompt,
  type EmailGenerationInput,
  type EmailGenerationResponse,
  type EmailType,
  type EmailTone
} from '@/lib/ai/prompts/email-generation';
import {
  generateTimelineOptimizationPrompt,
  validateTimelineEvents,
  type TimelineOptimizationInput,
  type TimelineEvent,
  type TimelineOptimization
} from '@/lib/ai/prompts/timeline-optimization';

const OPENAI_MODEL = AI_CONFIG.model;
const OPENAI_MAX_TOKENS = AI_CONFIG.maxTokens;

// Input validation schemas
const budgetPredictionInputSchema = z.object({
  guestCount: z.number().min(1).max(10000),
  venueType: z.enum(['hotel', 'outdoor', 'banquet_hall', 'restaurant', 'destination', 'other']),
  location: z.string().min(1).max(200),
  weddingDate: z.string().optional(),
  eventStyle: z.enum(['casual', 'formal', 'luxury', 'traditional', 'modern']),
  additionalContext: z.string().optional(),
});

const emailGenerationInputSchema = z.object({
  emailType: z.enum([
    'wedding_invitation',
    'vendor_inquiry',
    'thank_you_note',
    'rsvp_followup',
    'save_the_date',
    'wedding_update',
    'vendor_coordination',
    'custom'
  ]),
  tone: z.enum(['formal', 'casual', 'friendly', 'professional', 'elegant', 'warm']),
  recipientName: z.string().max(100).optional(),
  senderName: z.string().max(100).optional(),
  eventDate: z.string().optional(),
  eventLocation: z.string().max(200).optional(),
  specificDetails: z.string().max(1000).optional(),
  customInstructions: z.string().max(500).optional(),
});

const timelineEventSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1).max(200),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (use HH:MM)'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (use HH:MM)'),
  duration: z.number().int().min(1).max(1440),
  location: z.string().max(200).optional(),
  description: z.string().max(500).optional(),
  participants: z.array(z.string()).optional(),
  vendor: z.string().max(100).optional(),
  isFixed: z.boolean().optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
});

const timelineOptimizationInputSchema = z.object({
  weddingDate: z.string(),
  events: z.array(timelineEventSchema).min(1, 'At least one event is required'),
  ceremonyTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  receptionTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  venueAddress: z.string().max(300).optional(),
  numberOfGuests: z.number().int().min(1).max(10000).optional(),
  additionalContext: z.string().max(1000).optional(),
});

/**
 * AI Router
 *
 * Provides OpenAI GPT-4 integration for intelligent features:
 * - Chat assistance for wedding planning
 * - Automated seating plan generation
 * - Budget prediction and insights
 * - Generate comprehensive budget predictions
 *
 * All procedures verify company_id from session claims for multi-tenant security.
 * AI usage is tracked and quota-limited based on subscription tier.
 */
export const aiRouter = router({
  /**
   * Get current AI usage for company
   */
  getUsage: protectedProcedure.query(async ({ ctx }) => {
    const { companyId } = ctx

    if (!companyId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Company ID required',
      })
    }

    try {
      return await getAIUsage(companyId)
    } catch (error) {
      console.error('Error fetching AI usage:', error)
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch AI usage',
      })
    }
  }),

  /**
   * Generate comprehensive budget prediction based on wedding details.
   *
   * @requires protectedProcedure - User must be authenticated
   * @param input - Wedding details (guest count, venue, location, style, etc.)
   * @returns Detailed budget breakdown with categories, tips, and insights
   *
   * @example
   * ```ts
   * const prediction = await trpc.ai.generateBudgetPrediction.mutate({
   *   guestCount: 150,
   *   venueType: 'outdoor',
   *   location: 'Los Angeles, CA',
   *   eventStyle: 'formal',
   *   weddingDate: '2025-06-15'
   * })
   * ```
   */
  generateBudgetPrediction: protectedProcedure
    .input(budgetPredictionInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { companyId, userId } = ctx;

      if (!companyId || !userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID and User ID required',
        });
      }

      try {
        // Generate prompt from template
        const prompt = generateBudgetPredictionPrompt(input);

        // Call OpenAI with tracking
        const result = await callAIWithTracking<BudgetPredictionResponse>(
          companyId,
          userId,
          'budget_prediction',
          async () => {
            const completion = await openai.chat.completions.create({
              model: OPENAI_MODEL,
              messages: [
                {
                  role: 'system',
                  content: 'You are an expert wedding budget planner. Always respond with valid JSON matching the exact format specified.',
                },
                {
                  role: 'user',
                  content: prompt,
                },
              ],
              max_tokens: OPENAI_MAX_TOKENS,
              temperature: 0.7,
              response_format: { type: 'json_object' },
            });

            const content = completion.choices[0]?.message?.content || '{}';
            const prediction = JSON.parse(content) as BudgetPredictionResponse;

            return {
              response: prediction,
              usage: {
                prompt_tokens: completion.usage?.prompt_tokens || 0,
                completion_tokens: completion.usage?.completion_tokens || 0,
                total_tokens: completion.usage?.total_tokens || 0,
              },
            };
          },
          input
        );

        return result;
      } catch (error) {
        console.error('Budget prediction error:', error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to generate budget prediction',
        });
      }
    }),

  /**
   * Chat with AI assistant for wedding planning help.
   *
   * @requires protectedProcedure - User must be authenticated
   * @param messages - Chat history (role + content)
   * @param clientId - Optional client UUID for context-aware responses
   * @returns AI response with token usage statistics
   *
   * @example
   * ```ts
   * const response = await trpc.ai.chat.mutate({
   *   messages: [
   *     { role: 'system', content: 'You are a wedding planner assistant' },
   *     { role: 'user', content: 'Help me plan a 200-guest wedding' }
   *   ],
   *   clientId: 'uuid'
   * })
   * ```
   */
  chat: protectedProcedure
    .input(
      z.object({
        messages: z.array(
          z.object({
            role: z.enum(['user', 'assistant', 'system']),
            content: z.string(),
          })
        ),
        clientId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { companyId, userId } = ctx;

      // Security: Verify user has company_id from session claims
      if (!companyId || !userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID and User ID required',
        });
      }

      try {
        let systemPrompt = `You are an expert wedding planning assistant. Help users plan their perfect wedding with detailed, actionable advice. Be warm, professional, and thorough.`;
        let clientContext: any = null;

        // If clientId provided, fetch client data for context
        if (input.clientId) {
          // Verify client belongs to company (session claims)
          const { data: client } = await ctx.supabase
            .from('clients')
            .select('*, companies(name)')
            .eq('id', input.clientId)
            .eq('company_id', companyId)
            .single();

          if (!client) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'Client not found or access denied',
            });
          }

          clientContext = client;

          // Build context-aware system prompt
          const partner1Name = `${client.partner1_first_name} ${client.partner1_last_name}`;
          const partner2Name = client.partner2_first_name
            ? `${client.partner2_first_name} ${client.partner2_last_name}`
            : 'their partner';
          const weddingDate = client.wedding_date
            ? new Date(client.wedding_date).toLocaleDateString()
            : 'TBD';

          systemPrompt = `You are an expert wedding planning assistant helping ${partner1Name} and ${partner2Name} plan their wedding on ${weddingDate}.

Wedding Details:
- Client: ${partner1Name} & ${partner2Name}
- Wedding Date: ${weddingDate}
- Venue: ${client.venue || 'Not set'}
- Guest Count: ${client.guest_count || 'Unknown'}
- Budget: ${client.budget ? `$${client.budget.toLocaleString()}` : 'Not set'}

Provide personalized, actionable advice based on these details. Be warm, professional, and thorough.`;
        }

        // Call OpenAI API with tracking
        const result = await callAIWithTracking<string>(
          companyId,
          userId,
          'general_assistant',
          async () => {
            const completion = await openai.chat.completions.create({
              model: OPENAI_MODEL,
              messages: [
                { role: 'system', content: systemPrompt },
                ...input.messages,
              ],
              max_tokens: OPENAI_MAX_TOKENS,
              temperature: 0.7,
            });

            const aiResponse = completion.choices[0]?.message?.content || '';

            return {
              response: aiResponse,
              usage: {
                prompt_tokens: completion.usage?.prompt_tokens || 0,
                completion_tokens: completion.usage?.completion_tokens || 0,
                total_tokens: completion.usage?.total_tokens || 0,
              },
            };
          },
          {
            clientId: input.clientId,
            messageCount: input.messages.length,
            hasClientContext: !!clientContext,
          }
        );

        return {
          response: result,
          tokensUsed: 0, // Tracked in ai_usage_logs
          model: OPENAI_MODEL,
        };
      } catch (error) {
        console.error('OpenAI API Error:', error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'AI service unavailable',
        });
      }
    }),

  /**
   * Generate optimal seating plan using AI.
   *
   * @requires adminProcedure - Admin or super_admin only
   * @param clientId - Client UUID
   * @param guestIds - Array of guest UUIDs to seat
   * @param tableCount - Number of tables available
   * @returns Seating arrangement with AI reasoning
   *
   * @example
   * ```ts
   * const seating = await trpc.ai.generateSeatingPlan.mutate({
   *   clientId: 'uuid',
   *   guestIds: ['uuid1', 'uuid2', ...],
   *   tableCount: 15
   * })
   * ```
   */
  generateSeatingPlan: adminProcedure
    .input(
      z.object({
        clientId: z.string().uuid(),
        guestIds: z.array(z.string().uuid()),
        tableCount: z.number().min(1).max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { companyId, userId } = ctx;

      // Security: Verify user has company_id
      if (!companyId || !userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID and User ID required',
        });
      }

      // Verify client belongs to company
      const { data: client } = await ctx.supabase
        .from('clients')
        .select('id')
        .eq('id', input.clientId)
        .eq('company_id', companyId)
        .single();

      if (!client) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Client not found or access denied',
        });
      }

      // Fetch guest data
      const { data: guests, error: guestsError } = await ctx.supabase
        .from('guests')
        .select('*')
        .in('id', input.guestIds)
        .eq('client_id', input.clientId);

      if (guestsError || !guests) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch guest data',
        });
      }

      // Build AI prompt with guest information
      const guestList = guests
        .map(
          (g, idx) =>
            `${idx + 1}. ${g.first_name} ${g.last_name} - Group: ${g.group_name || 'None'}, Dietary: ${g.dietary_restrictions || 'None'}, Notes: ${g.notes || 'None'}`
        )
        .join('\n');

      const prompt = `You are an expert wedding seating planner. Create an optimal seating arrangement for ${guests.length} guests across ${input.tableCount} tables.

Guest Information:
${guestList}

Guidelines:
- Seat 8-10 guests per table (distribute evenly)
- Keep guests from the same "Group" together when possible
- Consider dietary restrictions for catering logistics
- Balance table dynamics for good conversation
- Use guest notes for relationship context

Respond with a JSON object:
{
  "tables": [
    {
      "tableNumber": 1,
      "guestIds": ["uuid1", "uuid2", ...],
      "notes": "Brief note about this table composition"
    },
    ...
  ],
  "reasoning": "Overall explanation of seating strategy"
}`;

      try {
        const result = await callAIWithTracking<{ tables: any[]; reasoning: string }>(
          companyId,
          userId,
          'seating_optimization',
          async () => {
            const completion = await openai.chat.completions.create({
              model: OPENAI_MODEL,
              messages: [
                { role: 'system', content: 'You are a professional wedding seating planner. Always respond with valid JSON.' },
                { role: 'user', content: prompt },
              ],
              max_tokens: OPENAI_MAX_TOKENS,
              temperature: 0.8,
              response_format: { type: 'json_object' },
            });

            const aiResponse = completion.choices[0]?.message?.content || '{}';
            const seatingPlan = JSON.parse(aiResponse);

            return {
              response: {
                tables: seatingPlan.tables || [],
                reasoning: seatingPlan.reasoning || '',
              },
              usage: {
                prompt_tokens: completion.usage?.prompt_tokens || 0,
                completion_tokens: completion.usage?.completion_tokens || 0,
                total_tokens: completion.usage?.total_tokens || 0,
              },
            };
          },
          {
            clientId: input.clientId,
            guestCount: guests.length,
            tableCount: input.tableCount,
          }
        );

        return {
          ...result,
          tokensUsed: 0, // Tracked in ai_usage_logs
        };
      } catch (error) {
        console.error('OpenAI Seating Plan Error:', error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to generate seating plan',
        });
      }
    }),

  /**
   * Predict budget insights and recommendations using AI.
   *
   * @requires adminProcedure - Admin or super_admin only
   * @param clientId - Client UUID
   * @returns Budget insights, predictions, and cost-saving recommendations
   *
   * @example
   * ```ts
   * const insights = await trpc.ai.predictBudget.query({
   *   clientId: 'uuid'
   * })
   * ```
   */
  analyzeBudget: adminProcedure
    .input(
      z.object({
        clientId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { companyId, userId } = ctx;

      // Security: Verify user has company_id
      if (!companyId || !userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID and User ID required',
        });
      }

      // Verify client belongs to company
      const { data: client } = await ctx.supabase
        .from('clients')
        .select('*')
        .eq('id', input.clientId)
        .eq('company_id', companyId)
        .single();

      if (!client) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Client not found or access denied',
        });
      }

      // Fetch budget items
      const { data: budgetItems, error: budgetError } = await ctx.supabase
        .from('budget')
        .select('*')
        .eq('client_id', input.clientId)
        .order('category', { ascending: true });

      if (budgetError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch budget data',
        });
      }

      const items = budgetItems || [];
      const totalEstimated = items.reduce((sum, item) => sum + (item.estimated_cost || 0), 0);
      const totalActual = items.reduce((sum, item) => sum + (item.actual_cost || 0), 0);
      const totalBudget = client.budget || 0;

      // Build budget analysis prompt
      const budgetList = items
        .map(
          (item) =>
            `- ${item.category}: ${item.item} (Estimated: $${item.estimated_cost}, Actual: $${item.actual_cost || 'TBD'}, Status: ${item.payment_status})`
        )
        .join('\n');

      const prompt = `You are an expert wedding budget analyst. Analyze this wedding budget and provide insights.

Wedding Budget Overview:
- Total Budget: $${totalBudget.toLocaleString()}
- Total Estimated: $${totalEstimated.toLocaleString()}
- Total Actual Spent: $${totalActual.toLocaleString()}
- Remaining: $${(totalBudget - totalActual).toLocaleString()}
- Guest Count: ${client.guest_count || 'Unknown'}

Budget Items:
${budgetList || 'No budget items yet'}

Provide a JSON analysis:
{
  "summary": "Overall budget health assessment",
  "predictions": [
    {"category": "string", "predictedFinalCost": number, "confidence": "high|medium|low"}
  ],
  "recommendations": [
    {"priority": "high|medium|low", "suggestion": "string", "potentialSavings": number}
  ],
  "alerts": [
    {"severity": "warning|danger", "message": "string"}
  ],
  "insights": ["string array of key insights"]
}`;

      try {
        const result = await callAIWithTracking<any>(
          companyId,
          userId,
          'budget_prediction',
          async () => {
            const completion = await openai.chat.completions.create({
              model: OPENAI_MODEL,
              messages: [
                { role: 'system', content: 'You are a professional wedding budget analyst. Always respond with valid JSON.' },
                { role: 'user', content: prompt },
              ],
              max_tokens: OPENAI_MAX_TOKENS,
              temperature: 0.7,
              response_format: { type: 'json_object' },
            });

            const aiResponse = completion.choices[0]?.message?.content || '{}';
            const analysis = JSON.parse(aiResponse);

            return {
              response: {
                summary: analysis.summary || '',
                predictions: analysis.predictions || [],
                recommendations: analysis.recommendations || [],
                alerts: analysis.alerts || [],
                insights: analysis.insights || [],
                budgetHealth: {
                  totalBudget,
                  totalEstimated,
                  totalActual,
                  remaining: totalBudget - totalActual,
                  percentageUsed: totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0,
                },
              },
              usage: {
                prompt_tokens: completion.usage?.prompt_tokens || 0,
                completion_tokens: completion.usage?.completion_tokens || 0,
                total_tokens: completion.usage?.total_tokens || 0,
              },
            };
          },
          {
            clientId: input.clientId,
            budgetItemCount: items.length,
            totalBudget,
            totalActual,
          }
        );

        return {
          ...result,
          tokensUsed: 0, // Tracked in ai_usage_logs
        };
      } catch (error) {
        console.error('OpenAI Budget Analysis Error:', error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to analyze budget',
        });
      }
    }),

  /**
   * Generate wedding email with AI.
   *
   * @requires protectedProcedure - User must be authenticated
   * @param input - Email details (type, tone, recipient, details, etc.)
   * @returns Generated email with subject, body, and suggestions
   *
   * @example
   * ```ts
   * const email = await trpc.ai.generateEmail.mutate({
   *   emailType: 'vendor_inquiry',
   *   tone: 'professional',
   *   recipientName: 'Jane Smith',
   *   senderName: 'John & Mary',
   *   eventDate: '2025-06-15',
   *   specificDetails: 'Looking for photography services'
   * })
   * ```
   */
  generateEmail: protectedProcedure
    .input(emailGenerationInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { userId, companyId } = ctx;

      if (!companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID required',
        });
      }

      try {
        const result = await callAIWithTracking<EmailGenerationResponse>(
          companyId,
          userId,
          'email_generation',
          async () => {
            // Generate prompt
            const prompt = generateEmailPrompt(input as EmailGenerationInput);

            // Call OpenAI
            const completion = await openai.chat.completions.create({
              model: OPENAI_MODEL,
              messages: [
                {
                  role: 'system',
                  content: 'You are an expert wedding communication specialist. Always respond with valid JSON only, no markdown or explanations.',
                },
                {
                  role: 'user',
                  content: prompt,
                },
              ],
              temperature: 0.8, // Slightly higher for more creative writing
              max_tokens: OPENAI_MAX_TOKENS,
              response_format: { type: 'json_object' },
            });

            const responseText = completion.choices[0]?.message?.content;

            if (!responseText) {
              throw new Error('No response from OpenAI');
            }

            // Parse JSON response
            let parsedResponse: EmailGenerationResponse;
            try {
              parsedResponse = JSON.parse(responseText);
            } catch (parseError) {
              console.error('Failed to parse OpenAI response:', responseText);
              throw new Error('Invalid JSON response from AI');
            }

            // Validate response structure
            if (!parsedResponse.subject || !parsedResponse.body) {
              throw new Error('Invalid response structure from AI');
            }

            return {
              response: parsedResponse,
              usage: {
                prompt_tokens: completion.usage?.prompt_tokens || 0,
                completion_tokens: completion.usage?.completion_tokens || 0,
                total_tokens: completion.usage?.total_tokens || 0,
              },
            };
          },
          {
            emailType: input.emailType,
            tone: input.tone,
            recipientName: input.recipientName,
          }
        );

        return {
          success: true,
          data: result,
        };
      } catch (error: any) {
        console.error('Email generation error:', error);

        if (error.code === 'FORBIDDEN') {
          throw error;
        }

        if (error.status === 429) {
          throw new TRPCError({
            code: 'TOO_MANY_REQUESTS',
            message: 'OpenAI rate limit exceeded. Please try again in a moment.',
          });
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to generate email',
        });
      }
    }),

  /**
   * Optimize wedding timeline with AI.
   *
   * @requires protectedProcedure - User must be authenticated
   * @param input - Timeline details (wedding date, events, ceremony/reception times, etc.)
   * @returns Timeline optimization with conflict detection and recommendations
   *
   * @example
   * ```ts
   * const optimization = await trpc.ai.optimizeTimeline.mutate({
   *   weddingDate: '2025-06-15',
   *   ceremonyTime: '15:00',
   *   receptionTime: '18:00',
   *   numberOfGuests: 150,
   *   events: [
   *     { title: 'Hair & Makeup', startTime: '08:00', endTime: '10:00', duration: 120 },
   *     { title: 'Ceremony', startTime: '15:00', endTime: '15:30', duration: 30 }
   *   ]
   * })
   * ```
   */
  optimizeTimeline: protectedProcedure
    .input(timelineOptimizationInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { userId, companyId } = ctx;

      if (!companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID required',
        });
      }

      // Validate timeline events
      const validation = validateTimelineEvents(input.events as TimelineEvent[]);
      if (!validation.isValid) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Invalid timeline events: ${validation.errors.join(', ')}`,
        });
      }

      try {
        const result = await callAIWithTracking<TimelineOptimization>(
          companyId,
          userId,
          'timeline_optimization',
          async () => {
            // Generate prompt
            const prompt = generateTimelineOptimizationPrompt(input as TimelineOptimizationInput);

            // Call OpenAI
            const completion = await openai.chat.completions.create({
              model: OPENAI_MODEL,
              messages: [
                {
                  role: 'system',
                  content: 'You are an expert wedding planner and timeline coordinator. Always respond with valid JSON only, no markdown or explanations.',
                },
                {
                  role: 'user',
                  content: prompt,
                },
              ],
              temperature: AI_CONFIG.temperature,
              max_tokens: 3000, // Timeline optimization needs more tokens
              response_format: { type: 'json_object' },
            });

            const responseText = completion.choices[0]?.message?.content;

            if (!responseText) {
              throw new Error('No response from OpenAI');
            }

            // Parse JSON response
            let parsedResponse: TimelineOptimization;
            try {
              parsedResponse = JSON.parse(responseText);
            } catch (parseError) {
              console.error('Failed to parse OpenAI response:', responseText);
              throw new Error('Invalid JSON response from AI');
            }

            // Validate response structure
            if (typeof parsedResponse.conflictDetected !== 'boolean' || !parsedResponse.optimizedEvents) {
              throw new Error('Invalid response structure from AI');
            }

            return {
              response: parsedResponse,
              usage: {
                prompt_tokens: completion.usage?.prompt_tokens || 0,
                completion_tokens: completion.usage?.completion_tokens || 0,
                total_tokens: completion.usage?.total_tokens || 0,
              },
            };
          },
          {
            weddingDate: input.weddingDate,
            eventCount: input.events.length,
          }
        );

        return {
          success: true,
          data: result,
        };
      } catch (error: any) {
        console.error('Timeline optimization error:', error);

        if (error.code === 'FORBIDDEN') {
          throw error;
        }

        if (error.code === 'BAD_REQUEST') {
          throw error;
        }

        if (error.status === 429) {
          throw new TRPCError({
            code: 'TOO_MANY_REQUESTS',
            message: 'OpenAI rate limit exceeded. Please try again in a moment.',
          });
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to optimize timeline',
        });
      }
    }),
});
