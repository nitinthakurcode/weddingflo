# AI Features Implementation Guide

This document describes all AI-powered features integrated into WeddingFlow Pro using OpenAI GPT-4.

## Overview

All AI features use OpenAI's GPT-4 models with proper error handling, rate limiting, and cost optimization.

## 🏗️ Core Infrastructure

### 1. AI Client (`src/lib/ai/openai-client.ts`)
- Initializes OpenAI SDK with API key from environment
- Exports model configurations (GPT-4o for complex tasks, GPT-4o-mini for simple tasks)
- Provides default parameters for API calls

### 2. Rate Limiter (`src/lib/ai/rate-limiter.ts`)
- In-memory rate limiting: max 10 AI calls per minute per user
- Prevents excessive API usage and costs
- Throws `RateLimitError` when limit exceeded

### 3. Error Handler (`src/lib/ai/error-handler.ts`)
- Centralized error handling for all AI operations
- Categorizes errors: rate_limit, api_error, validation_error, unknown
- Returns user-friendly error messages with retry guidance

## 🪑 Smart Seating AI

### Files
- **Algorithm**: `src/lib/ai/seating-optimizer.ts`
- **API Route**: `src/app/api/ai/seating/route.ts`
- **UI Components**:
  - `src/components/guests/seating-optimizer-dialog.tsx` (trigger dialog)
  - `src/components/guests/seating-chart-view.tsx` (visual table layout)
  - `src/components/guests/seating-suggestions.tsx` (AI reasoning display)

### Features
- Analyzes guest relationships, preferences, and conflicts
- Creates optimal table assignments
- Considers dietary restrictions for catering
- Provides compatibility scores (0-100) for each table
- Explains reasoning behind each assignment

### Usage
```typescript
import { optimizeSeating } from '@/lib/ai';

const result = await optimizeSeating(guests, tables);
// result.assignments: table assignments with scores
// result.overallScore: overall compatibility (0-100)
// result.reasoning: AI explanation
// result.warnings: any concerns or issues
```

### API Endpoint
```
POST /api/ai/seating
Body: { guests: Guest[], tables: Table[] }
Response: SeatingOptimizationResult
```

## 💰 Budget Prediction AI

### Files
- **Algorithm**: `src/lib/ai/budget-predictor.ts`
- **API Route**: `src/app/api/ai/budget-predict/route.ts`
- **UI Components**:
  - `src/components/budget/ai-predictions-panel.tsx` (main panel)
  - `src/components/budget/prediction-chart.tsx` (visual comparison)

### Features
- Predicts final costs based on current spending patterns
- Analyzes historical wedding cost data
- Provides confidence scores for predictions
- Identifies risk factors (categories likely to exceed budget)
- Gives actionable recommendations to stay on budget

### Usage
```typescript
import { predictBudget } from '@/lib/ai';

const result = await predictBudget(budgetItems, eventDetails);
// result.predictions: per-category predictions with confidence
// result.totalPredicted: predicted final total
// result.totalVariance: difference from estimated
// result.riskFactors: categories at risk
// result.recommendations: cost-saving suggestions
```

### API Endpoint
```
POST /api/ai/budget-predict
Body: { budgetItems: BudgetItem[], eventDetails: EventDetails }
Response: BudgetPredictionResult
```

## 📅 Timeline Optimization AI

### Files
- **Algorithm**: `src/lib/ai/timeline-optimizer.ts`
- **API Route**: `src/app/api/ai/timeline-optimize/route.ts`
- **UI Components**:
  - `src/components/timeline/ai-optimizer-dialog.tsx` (trigger dialog)
  - `src/components/timeline/optimization-suggestions.tsx` (conflicts and suggestions)

### Features
- Detects scheduling conflicts (overlaps, vendor conflicts, travel time issues)
- Validates event dependencies
- Suggests better timing and sequencing
- Rates conflict severity (high, medium, low)
- Provides optimization score (0-100)

### Usage
```typescript
import { optimizeTimeline } from '@/lib/ai';

const result = await optimizeTimeline(events);
// result.conflicts: detected issues with severity
// result.suggestions: timing improvements
// result.optimizationScore: timeline quality (0-100)
// result.reasoning: overall assessment
```

### API Endpoint
```
POST /api/ai/timeline-optimize
Body: { events: TimelineEvent[] }
Response: TimelineOptimizationResult
```

## 💬 AI Assistant Chat

### Files
- **Algorithm**: `src/lib/ai/assistant.ts`
- **API Route**: `src/app/api/ai/chat/route.ts` (streaming)
- **UI Components**:
  - `src/components/ai/ai-chat-interface.tsx` (chat UI)
  - `src/components/ai/ai-action-buttons.tsx` (quick actions)

### Features
- Conversational AI with wedding planning context
- Answers questions about guest lists, budgets, timelines
- Provides insights based on user's actual data
- Suggests using other AI features when appropriate
- Streaming responses for better UX

### Usage
```typescript
import { chatWithAssistant } from '@/lib/ai';

// Streaming response
for await (const chunk of chatWithAssistant(messages, context)) {
  console.log(chunk); // Display chunk as it arrives
}
```

### API Endpoint
```
POST /api/ai/chat
Body: { messages: Message[], context: AssistantContext }
Response: Streaming text/plain
```

## 📧 Email Generation AI

### Files
- **Algorithm**: `src/lib/ai/email-generator.ts`
- **API Route**: `src/app/api/ai/email-generate/route.ts`
- **UI Components**:
  - `src/components/communication/ai-email-composer.tsx`

### Features
- Generates professional wedding emails
- Supported types: invitation, save_the_date, reminder, thank_you, vendor_inquiry, vendor_confirmation, update, custom
- Adjustable tone: formal, casual, friendly, professional
- Provides subject, body, and enhancement suggestions
- Supports custom instructions

### Usage
```typescript
import { generateEmail } from '@/lib/ai';

const result = await generateEmail({
  type: 'invitation',
  recipientType: 'guest',
  recipientName: 'John Doe',
  tone: 'friendly',
  eventDetails: { eventDate: '2024-06-15', location: 'Beach Resort' }
});
// result.subject: email subject line
// result.body: formatted email body
// result.suggestions: enhancement tips
```

### API Endpoint
```
POST /api/ai/email-generate
Body: EmailGenerationRequest
Response: GeneratedEmail
```

## 🔒 Security & Rate Limiting

- All API routes require authentication (Clerk)
- Rate limiting: 10 AI calls per minute per user
- API key stored securely in environment variable
- Error messages don't expose sensitive information

## 💸 Cost Optimization

### Model Selection
- **GPT-4o** (complex): Seating optimization, timeline optimization, AI assistant chat
- **GPT-4o-mini** (simple): Budget predictions, email generation

### Caching Strategy
- Results should be cached in your database/state management
- Don't regenerate the same optimization multiple times
- Consider implementing a TTL (time-to-live) for cached results

### Monitoring
- Track OpenAI usage in OpenAI dashboard
- Monitor API call frequency
- Set up billing alerts in OpenAI account

## 🧪 Testing Recommendations

1. **Test with small datasets first**
   - 5-10 guests for seating optimization
   - 3-5 budget items for predictions
   - 4-6 events for timeline optimization

2. **Verify error handling**
   - Test rate limiting (make 11+ requests in a minute)
   - Test with invalid API key (temporarily)
   - Test with malformed input data

3. **Check AI quality**
   - Review seating assignments for reasonableness
   - Verify budget predictions are sensible
   - Ensure timeline conflicts are accurately detected
   - Test chat responses for accuracy

## 📊 Integration with Pages

### Guests Page
- Add `<SeatingOptimizerDialog>` button
- Display `<SeatingChartView>` when optimization complete
- Show `<SeatingSuggestions>` for AI reasoning

### Budget Page
- Add `<AIPredictionsPanel>` to overview
- Include `<PredictionChart>` for visual comparison

### Timeline Page
- Add `<AIOptimizerDialog>` button
- Display `<OptimizationSuggestions>` when complete

### Dashboard & Messages
- Include `<AIChatInterface>` for quick help
- Add `<AIActionButtons>` for common tasks

### Communication/Emails
- Use `<AIEmailComposer>` for email generation
- Allow editing before sending

## 🚀 Next Steps

1. **Add AI features to existing pages** (currently just components, need integration)
2. **Implement result caching** (reduce costs)
3. **Add cost tracking analytics** (monitor spend)
4. **Create user preferences** (AI settings, tone preferences)
5. **Add batch operations** (optimize all aspects at once)

## 📝 Environment Variables Required

```env
OPENAI_API_KEY=sk-proj-...
```

## 🐛 Troubleshooting

### "Rate limit exceeded"
- Wait 60 seconds before trying again
- Increase limit in `rate-limiter.ts` if needed for production

### "Unauthorized"
- Ensure user is signed in with Clerk
- Check Clerk middleware is configured

### "Invalid OpenAI API key"
- Verify `.env.local` has correct API key
- Ensure key has not been rotated/revoked
- Check billing is active in OpenAI account

### AI responses are poor quality
- Check prompt engineering in algorithm files
- Adjust temperature (lower = more focused)
- Use GPT-4o instead of GPT-4o-mini for better quality

## 📚 Resources

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [GPT-4 Prompt Engineering Guide](https://platform.openai.com/docs/guides/prompt-engineering)
- [OpenAI Usage Dashboard](https://platform.openai.com/usage)
