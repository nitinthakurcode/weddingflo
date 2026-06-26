/**
 * D4 / Cluster S — Tenant isolation (cross-tenant IDOR) regression suite.
 *
 * Prompt-3 FIX VERIFICATION. Seeds a SECOND tenant (company B) and, as a company-A
 * caller, exercises EVERY swept procedure (reads T1–T11, writes W1–W8). After the
 * centralized-scope fix:
 *   • cross-tenant access must be BLOCKED (throw, or empty result, never B's rows);
 *   • same-tenant access must STILL WORK (green) — proving no legitimate flow broke.
 *
 * The app DB role is a superuser (RLS bypassed), so this tests APPLICATION-level
 * scoping — exactly the production reality for these tRPC reads/writes. The DB-level
 * RLS fail-closed backstop is deferred to Prompt 6 (see STATE.md).
 *
 * History: the two leaks below (getChangeHistory, getGuestPreferences) were CONFIRMED
 * RED in Prompt 2.5 (A read B's rows). Those assertions are now FLIPPED to expect-blocked.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  companies, clients, events, guests, user as userTable,
} from '@/lib/db/schema';
import {
  floorPlans, seatingChangeLog, guestPreferences,
  budget, advancePayments, smsLogs, timeline, accommodations, invoices,
  guestTransport,
} from '@/lib/db/schema-features';
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
  budgetId: '00000000-0000-4000-8000-0000000000b8',
  advanceId: '00000000-0000-4000-8000-0000000000b9',
  smsId: '00000000-0000-4000-8000-0000000000ba',
  timelineId: '00000000-0000-4000-8000-0000000000bb',
  accId: '00000000-0000-4000-8000-0000000000bc',
} as const;

// A throwaway uuid for inputs that need a well-formed id we never expect to resolve.
const DUMMY_UUID = '00000000-0000-4000-8000-0000000000ff';

// Company-A caller (the deterministic tenant, company_admin). A must NOT see/touch B.
const a = callerFor({ companyId: IDS.companyId, userId: IDS.userId });

async function seedTenantB() {
  await db.insert(companies).values({ id: B.companyId, name: 'Other Co' } as never);
  await db.insert(userTable).values({ id: B.userId, name: 'B Admin', email: 'b-admin@other.test', role: 'company_admin', companyId: B.companyId } as never);
  await db.insert(clients).values({ id: B.clientId, companyId: B.companyId, partner1FirstName: 'Bea', partner1LastName: 'Other', planningSide: 'both', weddingDate: '2027-09-09' } as never);
  await db.insert(events).values({ id: B.eventId, clientId: B.clientId, companyId: B.companyId, title: 'B Wedding', eventType: 'wedding', eventDate: '2027-09-09' } as never);
  await db.insert(guests).values({ id: B.guestId, clientId: B.clientId, companyId: B.companyId, firstName: 'Bguest', lastName: 'Secret', rsvpStatus: 'pending', checkedIn: false } as never);
  await db.insert(floorPlans).values({ id: B.floorPlanId, clientId: B.clientId, companyId: B.companyId, eventId: B.eventId, name: 'B Secret Floorplan' } as never);
  await db.insert(seatingChangeLog).values({ id: B.changeLogId, floorPlanId: B.floorPlanId, userId: B.userId, changeType: 'move', previousData: { x: 1 }, newData: { x: 2 } } as never);
  await db.insert(guestPreferences).values({ id: B.prefId, guestId: B.guestId, preferences: { secret: 'B-only dietary note' } } as never);
  // Extra B rows so each swept procedure has a REAL target to (fail to) leak.
  await db.insert(budget).values({ id: B.budgetId, clientId: B.clientId, companyId: B.companyId, category: 'venue', item: 'B Venue', isPerGuestItem: false, estimatedCost: '5000' } as never);
  await db.insert(advancePayments).values({ id: B.advanceId, budgetItemId: B.budgetId, amount: '500' } as never);
  await db.insert(smsLogs).values({ id: B.smsId, clientId: B.clientId, to: '+15550000000', message: 'B secret sms', status: 'delivered' } as never);
  await db.insert(timeline).values({ id: B.timelineId, clientId: B.clientId, companyId: B.companyId, title: 'B Secret Ceremony', startTime: new Date('2027-09-09T10:00:00.000Z'), sortOrder: 5 } as never);
  await db.insert(accommodations).values({ id: B.accId, clientId: B.clientId, name: 'B Hotel', isDefault: false } as never);
}

async function cleanupTenantB() {
  // FK cascade is disabled during teardownTenant (replica mode), and some tables lack
  // company_id/client_id, so remove the orphan-prone ones explicitly first.
  await db.execute(sql`DELETE FROM advance_payments WHERE id = ${B.advanceId}`);
  await db.execute(sql`DELETE FROM seating_change_log WHERE id = ${B.changeLogId}`);
  await db.execute(sql`DELETE FROM guest_preferences WHERE id = ${B.prefId}`);
  await db.execute(sql`DELETE FROM floor_plans WHERE company_id = ${B.companyId}`);
  await teardownTenant(B.companyId);
}

describe('D4 / Cluster S — cross-tenant IDOR is blocked, same-tenant still works', () => {
  beforeAll(async () => {
    await resetDeterministic();
    await cleanupTenantB().catch(() => {});
    await seedTenantB();
  });
  afterAll(async () => {
    await cleanupTenantB();
    await teardownTenant(IDS.companyId);
  });

  // ───────────────────────── same-tenant GREEN (no regression) ─────────────────────────
  describe('SAME-TENANT still works (green)', () => {
    it('floorPlans.getGuestPreferences returns (no throw) for own client', async () => {
      const res = await a.floorPlans.getGuestPreferences({ clientId: IDS.clientId });
      expect(Array.isArray(res)).toBe(true);
    });
    it('vendors.getClientEvents returns own events', async () => {
      const res = await a.vendors.getClientEvents({ clientId: IDS.clientId });
      expect(res.some((e) => e.id === IDS.eventId)).toBe(true);
    });
    it('guestTransport.getStats works for own client', async () => {
      const res = await a.guestTransport.getStats({ clientId: IDS.clientId });
      expect(res.total).toBe(0);
    });
    it('budget.getAdvancePayments works for own budget item', async () => {
      const res = await a.budget.getAdvancePayments({ budgetItemId: IDS.budgetId });
      expect(Array.isArray(res)).toBe(true);
    });
    it('analyticsExport.getCompanyAnalytics counts ONLY own tenant (excludes B)', async () => {
      const res = await a.analyticsExport.getCompanyAnalytics({});
      // A seeds exactly one guest (Carol); B's guest must NOT be counted.
      expect(res.total_guests).toBe(1);
    });
    it('guests.checkIn works for own guest', async () => {
      const res = await a.guests.checkIn({ guestId: IDS.guestId });
      expect(res.checkedIn).toBe(true);
    });
  });

  // ───────────────────────── cross-tenant READS (T1–T11) ─────────────────────────
  describe('cross-tenant READS are blocked', () => {
    it('PROPERLY SCOPED (baseline): floorPlans.getById blocks a cross-tenant floorPlanId', async () => {
      let leaked = false;
      try {
        const res = await a.floorPlans.getById({ floorPlanId: B.floorPlanId });
        leaked = !!res && (res as { id?: string }).id === B.floorPlanId;
      } catch {
        leaked = false;
      }
      expect(leaked).toBe(false);
    });

    it('T1 floorPlans.getChangeHistory: cross-tenant REJECTED (was a leak)', async () => {
      await expect(a.floorPlans.getChangeHistory({ floorPlanId: B.floorPlanId })).rejects.toThrow();
    });
    it('T2 floorPlans.getGuestPreferences: cross-tenant REJECTED (was a leak)', async () => {
      await expect(a.floorPlans.getGuestPreferences({ clientId: B.clientId })).rejects.toThrow();
    });
    it('T4 sms.getSmsLogs: never returns another tenant log', async () => {
      const res = await a.sms.getSmsLogs({});
      expect(res.logs.some((l) => l.id === B.smsId)).toBe(false);
    });
    it('T5 sms.getSmsStats: aggregates exclude another tenant (A has zero)', async () => {
      const res = await a.sms.getSmsStats({ days: 365 });
      expect(res.total_sms).toBe(0);
    });
    it('T6 budget.getAdvancePayments: cross-tenant budgetItemId REJECTED', async () => {
      await expect(a.budget.getAdvancePayments({ budgetItemId: B.budgetId })).rejects.toThrow();
    });
    it('T7 floorPlans.getUnassignedGuests: cross-tenant REJECTED', async () => {
      await expect(a.floorPlans.getUnassignedGuests({ floorPlanId: B.floorPlanId })).rejects.toThrow();
    });
    it('T8 floorPlans.getGuestConflicts: cross-tenant REJECTED', async () => {
      await expect(a.floorPlans.getGuestConflicts({ clientId: B.clientId })).rejects.toThrow();
    });
    it('T9 floorPlans.checkConflicts: cross-tenant guestId REJECTED', async () => {
      await expect(a.floorPlans.checkConflicts({ guestId: B.guestId, tableId: DUMMY_UUID })).rejects.toThrow();
    });
    it('T10 vendors.getClientEvents: cross-tenant REJECTED', async () => {
      await expect(a.vendors.getClientEvents({ clientId: B.clientId })).rejects.toThrow();
    });
    it('T11 guestTransport.getStats: cross-tenant REJECTED', async () => {
      await expect(a.guestTransport.getStats({ clientId: B.clientId })).rejects.toThrow();
    });
  });

  // ───────────────────────── cross-tenant WRITES (W1–W8) ─────────────────────────
  describe('cross-tenant WRITES are rejected', () => {
    it('W1 googleSheets.importFromSheet: REJECTED — and B timeline NOT deleted/overwritten (worst write)', async () => {
      await expect(
        a.googleSheets.importFromSheet({ clientId: B.clientId, module: 'timeline' }),
      ).rejects.toThrow();
      // The overwrite/DELETE never ran: B's timeline row is intact, sortOrder unchanged.
      const [row] = await db.select({ id: timeline.id, sortOrder: timeline.sortOrder })
        .from(timeline).where(eq(timeline.id, B.timelineId)).limit(1);
      expect(row?.id).toBe(B.timelineId);
      expect(row?.sortOrder).toBe(5);
    });
    it('W2 payment.createInvoice: REJECTED — no invoice attached to B', async () => {
      await expect(
        a.payment.createInvoice({
          clientId: B.clientId,
          lineItems: [{ description: 'x', quantity: 1, unitPrice: 10, amount: 10 }],
        }),
      ).rejects.toThrow();
      const rows = await db.select({ id: invoices.id }).from(invoices).where(eq(invoices.clientId, B.clientId));
      expect(rows.length).toBe(0);
    });
    it('W3 payment.createPaymentIntent: cross-tenant clientId REJECTED', async () => {
      await expect(
        a.payment.createPaymentIntent({ invoiceId: DUMMY_UUID, clientId: B.clientId }),
      ).rejects.toThrow();
    });
    it('W4 guests.checkIn: REJECTED — B guest not checked in', async () => {
      await expect(a.guests.checkIn({ guestId: B.guestId })).rejects.toThrow();
      const [g] = await db.select({ checkedIn: guests.checkedIn }).from(guests).where(eq(guests.id, B.guestId)).limit(1);
      expect(g?.checkedIn).toBe(false);
    });
    it('W5 accommodations.setDefault: REJECTED — B accommodation default unchanged', async () => {
      await expect(a.accommodations.setDefault({ id: B.accId, clientId: B.clientId })).rejects.toThrow();
      const [acc] = await db.select({ isDefault: accommodations.isDefault }).from(accommodations).where(eq(accommodations.id, B.accId)).limit(1);
      expect(acc?.isDefault).toBe(false);
    });
    it('W6 floorPlans.addGuestConflict: cross-tenant REJECTED', async () => {
      await expect(
        a.floorPlans.addGuestConflict({ clientId: B.clientId, guestOneId: B.guestId, guestTwoId: B.guestId }),
      ).rejects.toThrow();
    });
    it('W7 guestTransport.create: REJECTED — no transport created for B', async () => {
      await expect(a.guestTransport.create({ clientId: B.clientId, guestName: 'X' })).rejects.toThrow();
      const rows = await db.select({ id: guestTransport.id }).from(guestTransport).where(eq(guestTransport.clientId, B.clientId));
      expect(rows.length).toBe(0);
    });
    it('W8 timeline.reorder: REJECTED — B timeline order unchanged', async () => {
      await expect(a.timeline.reorder({ clientId: B.clientId, itemIds: [B.timelineId] })).rejects.toThrow();
      const [row] = await db.select({ sortOrder: timeline.sortOrder }).from(timeline).where(eq(timeline.id, B.timelineId)).limit(1);
      expect(row?.sortOrder).toBe(5);
    });
  });
});
