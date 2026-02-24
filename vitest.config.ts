import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: [
      // Map @/ path aliases to src/ — matches tsconfig.json paths
      // More specific aliases must come first
      { find: /^@\/convex\/(.*)/, replacement: path.resolve(__dirname, 'convex/$1') },
      { find: /^@\/messages\/(.*)/, replacement: path.resolve(__dirname, 'messages/$1') },
      { find: /^@\/i18n\/(.*)/, replacement: path.resolve(__dirname, 'i18n/$1') },
      { find: /^@\/(.*)/, replacement: path.resolve(__dirname, 'src/$1') },
      // Redirect @jest/globals imports to our vitest-compatible shim
      { find: '@jest/globals', replacement: path.resolve(__dirname, 'vitest.jest-globals-shim.ts') },
    ],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    exclude: [
      'node_modules/**',
      '.next/**',
      // Playwright e2e tests — run separately via `npx playwright test`
      'e2e/**',
      'tests/e2e/**',
      // Playwright security specs
      'tests/security/*.spec.ts',
      // Documentation example tests (not real tests)
      'docs/**',
    ],
  },
})
