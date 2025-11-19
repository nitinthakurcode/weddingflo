import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

/**
 * MSW Browser Setup (Browser environment)
 * Used for Storybook and browser-based testing
 * @see TESTING_INFRASTRUCTURE_COMPLETE - Session 52
 */

export const worker = setupWorker(...handlers)
