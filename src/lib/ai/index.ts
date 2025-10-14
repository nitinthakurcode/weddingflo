// AI Client and Infrastructure
export { openai, AI_MODELS, AI_DEFAULTS } from './openai-client';
export { checkRateLimit, RateLimitError } from './rate-limiter';
export { handleAIError, type AIError } from './error-handler';

// Smart Seating AI
export {
  optimizeSeating,
  type Guest,
  type Table,
  type SeatingAssignment,
  type SeatingOptimizationResult,
} from './seating-optimizer';

// Budget Prediction AI
export {
  predictBudget,
  type BudgetItem,
  type EventDetails,
  type BudgetPrediction,
  type BudgetPredictionResult,
} from './budget-predictor';

// Timeline Optimization AI
export {
  optimizeTimeline,
  type TimelineEvent,
  type ConflictDetection,
  type OptimizationSuggestion,
  type TimelineOptimizationResult,
} from './timeline-optimizer';

// AI Assistant
export {
  chatWithAssistant,
  type Message,
  type AssistantContext,
} from './assistant';

// Email Generation AI
export {
  generateEmail,
  type EmailType,
  type EmailGenerationRequest,
  type GeneratedEmail,
} from './email-generator';
