/**
 * Chatbot Feature - Main Exports
 *
 * February 2026 - AI Command Chatbot Feature
 *
 * Production-grade natural language command interface for wedding planners.
 * Uses LLM function calling (NOT regex/keyword matching) with:
 * - OpenAI GPT-4o-mini (primary)
 * - OpenAI GPT-4o (fallback)
 *
 * Features:
 * - 23 tools covering all CRUD operations
 * - Entity resolution with fuzzy matching
 * - Natural language date parsing
 * - Cascade effect detection
 * - Preview generation for mutations
 * - 7-language support
 * - Voice input via Web Speech API
 * - Proactive recommendations
 * - Day-of assistant mode
 */

// Server exports
export { chatbotRouter, type ChatbotRouter } from './server'

// Component exports
export { ChatPanel, ChatToggle, ConfirmationDialog } from './components'

// Hook exports
export { useVoiceInput, type VoiceInputStatus, type UseVoiceInputReturn } from './hooks'

// Tool exports
export {
  CHATBOT_TOOLS,
  TOOL_METADATA,
  getToolMetadata,
  isQueryTool,
  isMutationTool,
  getCascadeEffects,
} from './tools'
