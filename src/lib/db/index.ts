import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
export { eq, and, or, desc, asc, sql, isNull, isNotNull, inArray, notInArray, like, ilike, gt, gte, lt, lte, ne, between, count, sum, avg, min, max } from 'drizzle-orm';

/**
 * Database Configuration
 *
 * December 2025 - Drizzle ORM with PostgreSQL
 */

const connectionString = process.env.DATABASE_URL!;

// Create postgres client
const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

// Create drizzle instance
export const db = drizzle(client);
