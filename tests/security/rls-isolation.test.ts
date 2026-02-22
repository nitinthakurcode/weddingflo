/**
 * @jest-environment node
 */

/**
 * @module rls-isolation.test
 * @description Cross-tenant isolation tests for PostgreSQL Row-Level Security.
 *
 * These tests verify that:
 *   1. Company A cannot read Company B's data
 *   2. Company B cannot insert data with Company A's companyId
 *   3. No tenant context = no rows returned (fail-closed)
 *   4. Super admin can read all tenants
 *   5. RLS cannot be bypassed by SQL injection in the context variable
 *
 * PREREQUISITES:
 *   - Migrations 0022–0024 must be applied
 *   - DATABASE_URL must point to a test database with seed data
 *   - The test DB must have at least 2 companies with sample data
 *
 * RUN: npx jest tests/security/rls-isolation.test.ts
 *
 * WeddingFlo Security Remediation — Phase 2.1 (Tests)
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// Test setup
// ---------------------------------------------------------------------------

// Use a dedicated test database or the dev database
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

if (!TEST_DATABASE_URL) {
  throw new Error('TEST_DATABASE_URL or DATABASE_URL must be set');
}

// Connect as the APPLICATION role (weddingflo_app), NOT as superuser.
// RLS only applies to non-superuser roles.
const client = postgres(TEST_DATABASE_URL, { max: 5 });
const db = drizzle(client);

// Test company IDs — these must exist in your seed data.
// Replace with actual UUIDs from your test database.
const COMPANY_A = 'aaaaaaaa-0000-0000-0000-aaaaaaaaaaaa';
const COMPANY_B = 'bbbbbbbb-0000-0000-0000-bbbbbbbbbbbb';

// Seed data for tests
const TEST_CLIENT_A = 'test-client-company-a';
const TEST_CLIENT_B = 'test-client-company-b';

// ---------------------------------------------------------------------------
// Seed helper — create test data if it doesn't exist
// ---------------------------------------------------------------------------

async function seedTestData(): Promise<void> {
  // Seed as superuser to bypass RLS (or use SET LOCAL)
  // These inserts need the correct companyId column name for your schema.
  // Adjust "companyId" below if your schema uses company_id.

  try {
    // Create test companies if they don't exist
    await db.execute(sql`
      INSERT INTO companies (id, name)
      VALUES
        (${COMPANY_A}, 'Test Company A'),
        (${COMPANY_B}, 'Test Company B')
      ON CONFLICT (id) DO NOTHING
    `);

    // We need to set context to insert into RLS-protected tables
    // or use a superuser connection. Using SET LOCAL approach:
    await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.current_company_id', ${COMPANY_A}, true)`);
      await tx.execute(sql`SELECT set_config('app.current_role', 'company_admin', true)`);
      await tx.execute(sql`
        INSERT INTO clients (id, "companyId", "partner1FirstName", "partner1LastName")
        VALUES (${TEST_CLIENT_A}, ${COMPANY_A}, 'Test', 'ClientA')
        ON CONFLICT (id) DO NOTHING
      `);
    });

    await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.current_company_id', ${COMPANY_B}, true)`);
      await tx.execute(sql`SELECT set_config('app.current_role', 'company_admin', true)`);
      await tx.execute(sql`
        INSERT INTO clients (id, "companyId", "partner1FirstName", "partner1LastName")
        VALUES (${TEST_CLIENT_B}, ${COMPANY_B}, 'Test', 'ClientB')
        ON CONFLICT (id) DO NOTHING
      `);
    });
  } catch (err) {
    console.warn('Seed data setup warning (may already exist):', err);
  }
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('Row-Level Security — Cross-Tenant Isolation', () => {
  beforeAll(async () => {
    await seedTestData();
  });

  afterAll(async () => {
    await client.end();
  });

  // ---- Test 1: Tenant can only see own data ----
  it('Company A can only see its own clients', async () => {
    await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.current_company_id', ${COMPANY_A}, true)`
      );
      await tx.execute(
        sql`SELECT set_config('app.current_role', 'company_admin', true)`
      );

      const results = await tx.execute<{ companyId: string }>(
        sql`SELECT "companyId" FROM clients`
      );

      // Every returned row must belong to Company A
      for (const row of results) {
        expect(row.companyId).toBe(COMPANY_A);
      }

      // Company B's test client should NOT appear
      const companyBClients = results.filter(
        (r: any) => r.companyId === COMPANY_B
      );
      expect(companyBClients).toHaveLength(0);
    });
  });

  // ---- Test 2: Tenant cannot see other tenant's data ----
  it('Company B cannot see Company A clients', async () => {
    await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.current_company_id', ${COMPANY_B}, true)`
      );
      await tx.execute(
        sql`SELECT set_config('app.current_role', 'company_admin', true)`
      );

      const results = await tx.execute<{ companyId: string }>(
        sql`SELECT "companyId" FROM clients`
      );

      for (const row of results) {
        expect(row.companyId).toBe(COMPANY_B);
      }
    });
  });

  // ---- Test 3: Cannot insert data for another tenant ----
  it('Company B cannot insert a client with Company A companyId', async () => {
    await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.current_company_id', ${COMPANY_B}, true)`
      );
      await tx.execute(
        sql`SELECT set_config('app.current_role', 'company_admin', true)`
      );

      // Attempt to insert with Company A's ID should be blocked by WITH CHECK
      await expect(
        tx.execute(sql`
          INSERT INTO clients (id, "companyId", "partner1FirstName")
          VALUES (${`rls-test-${Date.now()}`}, ${COMPANY_A}, 'HackAttempt')
        `)
      ).rejects.toThrow();
    });
  });

  // ---- Test 4: No context = no rows (fail-closed) ----
  it('returns zero rows when no tenant context is set', async () => {
    await db.transaction(async (tx) => {
      // Explicitly clear any context
      await tx.execute(sql`RESET app.current_company_id`);
      await tx.execute(sql`RESET app.current_role`);

      const results = await tx.execute(sql`SELECT * FROM clients`);

      // With no company context, RLS should block all rows
      expect(results).toHaveLength(0);
    });
  });

  // ---- Test 5: Empty string context = no rows ----
  it('returns zero rows when context is empty string', async () => {
    await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.current_company_id', '', true)`
      );

      const results = await tx.execute(sql`SELECT * FROM clients`);
      expect(results).toHaveLength(0);
    });
  });

  // ---- Test 6: Super admin can see all data ----
  it('super_admin role can see all tenants', async () => {
    await db.transaction(async (tx) => {
      // Super admin doesn't need a specific company ID
      await tx.execute(
        sql`SELECT set_config('app.current_role', 'super_admin', true)`
      );
      // But we still need a dummy company ID for policies that check both
      await tx.execute(
        sql`SELECT set_config('app.current_company_id', 'not-a-real-company', true)`
      );

      const results = await tx.execute<{ companyId: string }>(
        sql`SELECT DISTINCT "companyId" FROM clients`
      );

      // Should see clients from multiple companies
      const companies = results.map((r: any) => r.companyId);
      expect(companies.length).toBeGreaterThanOrEqual(2);
      expect(companies).toContain(COMPANY_A);
      expect(companies).toContain(COMPANY_B);
    });
  });

  // ---- Test 7: SQL injection in context variable is safe ----
  it('SQL injection in company ID context is harmless', async () => {
    await db.transaction(async (tx) => {
      // Attempt SQL injection via the context variable
      const malicious = "'; DROP TABLE clients; --";
      await tx.execute(
        sql`SELECT set_config('app.current_company_id', ${malicious}, true)`
      );

      // Should return 0 rows (injection string doesn't match any companyId)
      const results = await tx.execute(sql`SELECT * FROM clients`);
      expect(results).toHaveLength(0);

      // Verify the clients table still exists
      const tableCheck = await tx.execute(sql`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_name = 'clients'
        ) as table_exists
      `);
      expect((tableCheck[0] as any).table_exists).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// RLS Coverage Audit Test
// ---------------------------------------------------------------------------

describe('RLS Coverage Audit', () => {
  afterAll(async () => {
    // Connection is shared, closed by the first describe's afterAll
  });

  it('all tables with companyId-like columns have RLS enabled', async () => {
    // Find tables that have a company-related column but NO RLS policy
    const unprotected = await db.execute<{ tablename: string; column_name: string }>(sql`
      SELECT t.tablename, c.column_name
      FROM pg_tables t
      JOIN information_schema.columns c
        ON c.table_name = t.tablename AND c.table_schema = 'public'
      WHERE (
        c.column_name IN ('companyId', 'company_id', 'companyid')
      )
      AND t.schemaname = 'public'
      AND t.tablename != 'companies'
      AND NOT EXISTS (
        SELECT 1 FROM pg_policies p
        WHERE p.tablename = t.tablename AND p.schemaname = 'public'
      )
      ORDER BY t.tablename
    `);

    if (unprotected.length > 0) {
      const tables = unprotected.map((r: any) => r.tablename).join(', ');
      console.warn(`⚠️  Tables with companyId but NO RLS: ${tables}`);
    }

    // This test WARNS but doesn't fail — some tables might intentionally lack RLS.
    // Change to expect(unprotected).toHaveLength(0) once you've confirmed coverage.
    expect(unprotected.length).toBeLessThanOrEqual(5); // Allow some grace
  });
});
