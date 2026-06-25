/**
 * Deterministic seed for the bulletproof re-audit (M1 fix).
 *
 * Committed + versioned. Every audit assertion references these FIXED primary keys and
 * FIXED business dates, so a test never depends on random UUIDs or wall-clock time —
 * the determinism that kills the false-green repeat-bug loop.
 *
 *   • @faker-js/faker seeded with a FIXED seed (faker.seed(FIXED_SEED)) for any
 *     incidental strings, so reseeds are byte-identical.
 *   • FIXED clock (FIXED_NOW) for any timestamp we set explicitly.
 *   • resetDeterministic() sweeps the tenant (dynamic information_schema sweep, FK
 *     enforcement disabled in one transaction) then re-seeds — run before every test.
 *
 * Two client fixtures:
 *   • CLIENT_ID         — freshly-seeded (current timestamps)
 *   • LEGACY_CLIENT_ID  — legacy back-filled (older createdAt) for C7 T3 cascade timing.
 */
import { faker } from '@faker-js/faker';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { companies, clients, events, budget, guests, user as userTable } from '@/lib/db/schema';

export const FIXED_SEED = 20260625;
export const FIXED_NOW = new Date('2026-06-25T00:00:00.000Z');
export const WEDDING_DATE = '2027-06-15';

// Fixed primary keys (valid v4-shaped UUIDs) — referenced by every assertion.
export const IDS = {
  companyId: '00000000-0000-4000-8000-000000000001',
  userId: '00000000-0000-4000-8000-000000000002',
  clientId: '00000000-0000-4000-8000-000000000003',
  eventId: '00000000-0000-4000-8000-000000000004',
  budgetId: '00000000-0000-4000-8000-000000000005',
  budgetId2: '00000000-0000-4000-8000-000000000007',
  guestId: '00000000-0000-4000-8000-000000000006',
  legacyClientId: '00000000-0000-4000-8000-00000000000a',
  legacyEventId: '00000000-0000-4000-8000-00000000000b',
} as const;

export interface SeededTenant {
  companyId: string;
  userId: string;
  clientId: string;
  eventId: string;
  budgetId: string;
  budgetId2: string;
  guestId: string;
  legacyClientId: string;
}

/**
 * Remove the fixed tenant entirely. Dynamic sweep: every table with a `client_id`
 * column (for the seeded clients) AND every table with a `company_id` column (for the
 * tenant). Grandchildren lacking both are cleared via parent subqueries first. FK
 * enforcement disabled transaction-scoped (superuser) so delete order is irrelevant.
 */
export async function teardownTenant(companyId: string = IDS.companyId): Promise<void> {
  const clientRows = (await db.execute(
    sql`SELECT id FROM clients WHERE company_id = ${companyId}`,
  )) as unknown as Array<{ id: string }>;
  const clientIds = clientRows.map((r) => r.id);

  await db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL session_replication_role = replica`);

    await tx.execute(sql`DELETE FROM guest_gifts WHERE guest_id IN (SELECT id FROM guests WHERE company_id = ${companyId})`);
    await tx.execute(sql`DELETE FROM floor_plan_guests WHERE table_id IN (SELECT t.id FROM floor_plan_tables t JOIN floor_plans f ON t.floor_plan_id = f.id WHERE f.company_id = ${companyId})`);
    await tx.execute(sql`DELETE FROM floor_plan_tables WHERE floor_plan_id IN (SELECT id FROM floor_plans WHERE company_id = ${companyId})`);
    await tx.execute(sql`DELETE FROM workflow_steps WHERE workflow_id IN (SELECT id FROM workflows WHERE company_id = ${companyId})`);

    const clientIdTables = (await tx.execute(
      sql`SELECT table_name FROM information_schema.columns WHERE column_name = 'client_id' AND table_schema = 'public'`,
    )) as unknown as Array<{ table_name: string }>;
    for (const cid of clientIds) {
      for (const { table_name } of clientIdTables) {
        await tx.execute(sql`DELETE FROM ${sql.identifier(table_name)} WHERE client_id = ${cid}`);
      }
    }

    const companyIdTables = (await tx.execute(
      sql`SELECT table_name FROM information_schema.columns WHERE column_name = 'company_id' AND table_schema = 'public'`,
    )) as unknown as Array<{ table_name: string }>;
    for (const { table_name } of companyIdTables) {
      await tx.execute(sql`DELETE FROM ${sql.identifier(table_name)} WHERE company_id = ${companyId}`);
    }

    await tx.execute(sql`DELETE FROM companies WHERE id = ${companyId}`);
  });
}

/** Insert the fixed deterministic tenant. Assumes the tenant was just torn down. */
export async function seedDeterministic(): Promise<SeededTenant> {
  faker.seed(FIXED_SEED);

  await db.insert(companies).values({ id: IDS.companyId, name: 'WF Audit Co' } as never);

  await db.insert(userTable).values({
    id: IDS.userId,
    name: 'Audit Planner',
    email: 'audit-planner@example.test',
    role: 'company_admin',
    companyId: IDS.companyId,
  } as never);

  // Freshly-seeded client.
  await db.insert(clients).values({
    id: IDS.clientId,
    companyId: IDS.companyId,
    partner1FirstName: 'Ava',
    partner1LastName: 'Stone',
    partner2FirstName: 'Ben',
    partner2LastName: 'Stone',
    planningSide: 'both',
    weddingDate: WEDDING_DATE,
  } as never);

  // Legacy back-filled client (older createdAt) for C7 T3.
  await db.insert(clients).values({
    id: IDS.legacyClientId,
    companyId: IDS.companyId,
    partner1FirstName: 'Old',
    partner1LastName: 'Record',
    planningSide: 'both',
    weddingDate: '2025-01-01',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
  } as never);

  await db.insert(events).values({
    id: IDS.eventId,
    clientId: IDS.clientId,
    companyId: IDS.companyId,
    title: 'Main Wedding',
    eventType: 'wedding',
    eventDate: WEDDING_DATE,
  } as never);

  await db.insert(events).values({
    id: IDS.legacyEventId,
    clientId: IDS.legacyClientId,
    companyId: IDS.companyId,
    title: 'Legacy Wedding',
    eventType: 'wedding',
    eventDate: '2025-01-01',
  } as never);

  // Two known budget items for the Excel/Sheets round-trip:
  //   budgetId  → EDIT target (fixed id + amount 1000), also non-destructive check
  //   budgetId2 → DELETE target (Action=DELETE on re-import)
  await db.insert(budget).values({
    id: IDS.budgetId,
    clientId: IDS.clientId,
    companyId: IDS.companyId,
    category: 'venue',
    item: 'Venue Hire',
    isPerGuestItem: false,
    estimatedCost: '1000',
    notes: 'KEEP',
  } as never);
  await db.insert(budget).values({
    id: IDS.budgetId2,
    clientId: IDS.clientId,
    companyId: IDS.companyId,
    category: 'photography',
    item: 'Photographer',
    isPerGuestItem: false,
    estimatedCost: '2000',
  } as never);

  // One known guest (RSVP pending) for guest/realtime tests.
  await db.insert(guests).values({
    id: IDS.guestId,
    clientId: IDS.clientId,
    companyId: IDS.companyId,
    firstName: 'Carol',
    lastName: 'Guest',
    rsvpStatus: 'pending',
  } as never);

  return {
    companyId: IDS.companyId,
    userId: IDS.userId,
    clientId: IDS.clientId,
    eventId: IDS.eventId,
    budgetId: IDS.budgetId,
    budgetId2: IDS.budgetId2,
    guestId: IDS.guestId,
    legacyClientId: IDS.legacyClientId,
  };
}

/** Deterministic reset: teardown + reseed. Run before every test (or test file). */
export async function resetDeterministic(): Promise<SeededTenant> {
  await teardownTenant(IDS.companyId);
  return seedDeterministic();
}
