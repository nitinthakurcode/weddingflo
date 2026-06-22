import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import * as relations from './schema-relations';

export { eq, and, or, desc, asc, sql, isNull, isNotNull, inArray, notInArray, like, ilike, gt, gte, lt, lte, ne, between, count, sum, avg, min, max } from 'drizzle-orm';

/**
 * Database Configuration
 *
 * February 2026 - Drizzle ORM with PostgreSQL
 * Note: Schema + relations passed to enable db.query builder with relations
 */

const connectionString = process.env.DATABASE_URL!;

// Create postgres client
const client = postgres(connectionString, {
  // Per long-running app instance. PgBouncer (transaction mode) sits in front
  // in production, so this is the per-instance ceiling, not the DB total —
  // scale horizontally (more instances) behind the bouncer for throughput.
  max: 20,
  idle_timeout: 20,
  connect_timeout: 10,
});

// Create drizzle instance with schema + relations (enables db.query with relations)
export const db = drizzle(client, { schema: { ...schema, ...relations } });
