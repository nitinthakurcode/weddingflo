import { defineConfig } from 'vitest/config'
import path from 'path'

// Real-DB chatbot integration tests. Separate from the unit config because these:
//   • need a `node` environment (postgres-js driver, not jsdom),
//   • must load .env.local for DATABASE_URL (the db client connects at import),
//   • run serially against ONE shared local Postgres (no file parallelism / single fork).
// Run with: npx vitest run -c vitest.integration.config.ts
export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\/convex\/(.*)/, replacement: path.resolve(__dirname, 'convex/$1') },
      { find: /^@\/messages\/(.*)/, replacement: path.resolve(__dirname, 'messages/$1') },
      { find: /^@\/i18n\/(.*)/, replacement: path.resolve(__dirname, 'i18n/$1') },
      { find: /^@\/(.*)/, replacement: path.resolve(__dirname, 'src/$1') },
      { find: '@jest/globals', replacement: path.resolve(__dirname, 'vitest.jest-globals-shim.ts') },
    ],
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.integration.setup.ts'],
    include: ['src/**/__tests__/integration/**/*.test.ts'],
    testTimeout: 30000,
    hookTimeout: 60000,
    fileParallelism: false,
  },
})
