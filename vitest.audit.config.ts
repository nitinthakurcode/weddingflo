import { defineConfig } from 'vitest/config';
import path from 'path';

// Bulletproof re-audit harness. Real-DB + real-Redis(SRH) tests that assert by RUNNING
// the behavior (Excel/Sheets round-trip + cascade, realtime, perf). Separate from the
// unit + chatbot-integration configs because these:
//   • load `.env.test.local` (override:true) — the PROVEN isolated test stack,
//   • run a Rail-3 fail-closed guard before any DB connection,
//   • run serially against one shared local Postgres (single fork, no parallelism).
// Run with: npx vitest run -c vitest.audit.config.ts
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
    setupFiles: ['./vitest.audit.setup.ts'],
    include: ['src/**/__tests__/audit/**/*.test.ts'],
    testTimeout: 30000,
    hookTimeout: 60000,
    fileParallelism: false,
  },
});
