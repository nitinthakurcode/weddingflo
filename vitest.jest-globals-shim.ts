/**
 * Shim that maps `@jest/globals` imports to vitest equivalents.
 * This allows test files written with `import { describe, it, expect, jest } from '@jest/globals'`
 * to run under vitest without modification.
 */
export {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
  vi as jest,
} from 'vitest'
