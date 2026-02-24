import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// Map `jest` global to vitest's `vi` for tests that use `jest.fn()`, `jest.mock()`, etc.
// This is needed because many test files were written for Jest and use `jest.*` APIs directly.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(globalThis as any).jest = vi
