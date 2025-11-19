import { setupServer } from 'msw/node'
import { handlers } from './handlers'

/**
 * MSW Server Setup (Node.js environment)
 * Used for Jest tests and Node.js integration tests
 * @see TESTING_INFRASTRUCTURE_COMPLETE - Session 52
 */

export const server = setupServer(...handlers)
