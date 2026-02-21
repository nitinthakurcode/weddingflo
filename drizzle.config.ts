import { defineConfig } from 'drizzle-kit';

/**
 * Drizzle Kit Configuration
 *
 * December 2025 - Production database configuration for WeddingFlo
 *
 * Usage:
 * - npm run db:generate  - Generate migration SQL files
 * - npm run db:push      - Push schema changes to database (development)
 * - npm run db:migrate   - Run migrations (production)
 * - npm run db:studio    - Open Drizzle Studio for database inspection
 */
export default defineConfig({
  // Schema files to include
  schema: [
    './src/lib/db/schema.ts',
    './src/lib/db/schema-features.ts',
    './src/lib/db/schema-pipeline.ts',
    './src/lib/db/schema-proposals.ts',
    './src/lib/db/schema-workflows.ts',
    './src/lib/db/schema-questionnaires.ts',
    './src/lib/db/schema-chatbot.ts',
    './src/lib/db/schema-invitations.ts',
    './src/lib/db/schema-relations.ts', // Drizzle ORM relations - Feb 2026
  ],

  // Output directory for migrations
  out: './drizzle/migrations',

  // Database dialect
  dialect: 'postgresql',

  // Database credentials from environment
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },

  // Verbose logging for debugging
  verbose: true,

  // Strict mode for safer migrations
  strict: true,

  // Migration table configuration
  migrations: {
    table: '__drizzle_migrations__',
    schema: 'public',
  },
});
