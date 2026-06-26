/**
 * D4 — Tenant isolation (read-only probe) for child tables lacking an explicit companyId
 * (scoped only via a parent FK). Seeds a SECOND tenant (company B) and, as a company-A
 * caller, attempts to read B's child rows through every reachable tRPC read path. A path
 * that returns B's rows to an A caller is a cross-tenant leak (broken object-level authz).
 *
 * The app DB role is a superuser (RLS bypassed), so this tests APPLICATION-level scoping —
 * exactly the production reality for these tRPC reads. Documents ACTUAL behavior.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  companies, clients, events, guests, user as userTable,
} from '@/lib/db/schema';
import { floorPlans, seatingChangeLog, guestPreferences } from '@/lib/db/schema-features';
import { IDS, resetDeterministic, teardownTenant } from '@/test-support/seed/deterministic-seed';
import { callerFor } from '@/test-support/audit-caller';

const B = {
  companyId: '00000000-0000-4000-8000-0000000000b0',
  userId: '00000000-0000-4000-8000-0000000000b1',
  clientId: '00000000-0000-4000-8000-0000000000b2',
  guestId: '00000000-0000-4000-8000-0000000000b3',
  eventId: '00000000-0000-4000-8000-0000000000b4',
  floorPlanId: '00000000-0000-4000-8000-0000000000b5',
  changeLogId: '00000000-0000-4000-8000-0000000000b6',
  prefId: '00000000-0000-4000-8000-0000000000b7',
} as const;

// Company-A caller (the deterministic tenant). A must NOT see B's data.
const a = callerFor({ companyId: IDS.companyId, userId: IDS.userId });

async function seedTenantB() {
  await db.insert(companies).values({ id: B.companyId, name: 'Other Co' } as never);
  await db.insert(userTable).values({ id: B.userId, name: 'B Admin', email: 'b-admin@other.test', role: 'company_admin', companyId: B.companyId } as never);
  await db.insert(clients).values({ id: B.clientId, companyId: B.companyId, partner1FirstName: 'Bea', partner1LastName: 'Other', planningSide: 'both', weddingDate: '2027-09-09' } as never);
  await db.insert(events).values({ id: B.eventId, clientId: B.clientId, companyId: B.companyId, title: 'B Wedding', eventType: 'wedding', eventDate: '2027-09-09' } as never);
  await db.insert(guests).values({ id: B.guestId, clientId: B.clientId, companyId: B.companyId, firstName: 'Bguest', lastName: 'Secret', rsvpStatus: 'pending' } as never);
  await db.insert(floorPlans).values({ id: B.floorPlanId, clientId: B.clientId, companyId: B.companyId, eventId: B.eventId, name: 'B Secret Floorplan' } as never);
  await db.insert(seatingChangeLog).values({ id: B.changeLogId, floorPlanId: B.floorPlanId, userId: B.userId, changeType: 'move', previousData: { x: 1 }, newData: { x: 2 } } as never);
  await db.insert(guestPreferences).values({ id: B.prefId, guestId: B.guestId, preferences: { secret: 'B-only dietary note' } } as never);
}

async function cleanupTenantB() {
  // FK cascade is disabled during teardownTenant (replica mode), and these tables lack
  // company_id, so remove them explicitly first.
  await db.execute(sql`DELETE FROM seating_change_log WHERE id = ${B.changeLogId}`);
  await db.execute(sql`DELETE FROM guest_preferences WHERE id = ${B.prefId}`);
  await db.execute(sql`DELETE FROM floor_plans WHERE company_id = ${B.companyId}`);
  await teardownTenant(B.companyId);
}

describe('D4 tenant isolation — parent-FK-scoped child tables', () => {
  beforeAll(async () => {
    await resetDeterministic();
    await cleanupTenantB().catch(() => {});
    await seedTenantB();
  });
  afterAll(async () => {
    await cleanupTenantB();
    await teardownTenant(IDS.companyId);
  });

  it('PROPERLY SCOPED: floorPlans.getById blocks a cross-tenant floorPlanId', async () => {
    let leaked = false;
    try {
      const res = await a.floorPlans.getById({ floorPlanId: B.floorPlanId });
      // Some routers return null for not-found instead of throwing.
      leaked = !!res && (res as { id?: string }).id === B.floorPlanId;
    } catch {
      leaked = false; // throw = correctly blocked
    }
    expect(leaked, 'floorPlans.getById must NOT return another tenant floor plan').toBe(false);
  });

  it('LEAK CANDIDATE: floorPlans.getChangeHistory exposes another tenant seating log', async () => {
    let rows: unknown[] = [];
    try {
      rows = (await a.floorPlans.getChangeHistory({ floorPlanId: B.floorPlanId })) as unknown[];
    } catch {
      rows = [];
    }
    // getChangeHistory filters only by the caller-supplied floorPlanId with no company
    // ownership check (floor-plans.router.ts:1463). Assert the ACTUAL behavior observed.
    const leaked = rows.some((r) => (r as { id?: string }).id === B.changeLogId);
    expect(leaked, 'CROSS-TENANT LEAK: A read B seating_change_log via getChangeHistory').toBe(true);
  });

  it('LEAK CANDIDATE: floorPlans.getGuestPreferences exposes another tenant preferences', async () => {
    let rows: unknown[] = [];
    try {
      rows = (await a.floorPlans.getGuestPreferences({ clientId: B.clientId })) as unknown[];
    } catch {
      rows = [];
    }
    // filters by caller-supplied clientId with no company check (floor-plans.router.ts:1591).
    const leaked = rows.some((r) => (r as { id?: string }).id === B.prefId);
    expect(leaked, 'CROSS-TENANT LEAK: A read B guest_preferences via getGuestPreferences').toBe(true);
  });
});
