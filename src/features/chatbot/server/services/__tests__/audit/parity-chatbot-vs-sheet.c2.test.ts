/**
 * C2 — REAL parity: the SAME logical guest mutation run through the CHATBOT path and the
 * Google SHEET path on a freshly-seeded DB, snapshotting dependent modules after each, then
 * asserting which automations fire identically and which DIVERGE. (The 58 pre-existing
 * chatbot integration tests are NOT parity proof — they exercise only one path.)
 *
 * Operation: add a CONFIRMED guest (partySize 2) to a client that has a per-guest budget
 * item (per-plate catering, perGuestCost=100). The canonical automation set is:
 *   recalcClientStats (clients.guestCount)  +  recalcPerGuestBudgetItems
 *     (estimatedCost = perGuestCost × confirmed partySize).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { budget } from '@/lib/db/schema-features';
import { IDS, resetDeterministic, teardownTenant } from '@/test-support/seed/deterministic-seed';
import { buildCtx } from '@/test-support/audit-caller';
import { executeToolWithSync } from '@/features/chatbot/server/services/tool-executor';
import { syncGuestsToSheet, importGuestsFromSheet } from '@/lib/google/sheets-sync';
import { FakeSheetsClient } from '@/test-support/fake-sheets-client';
import type { sheets_v4 } from 'googleapis';

const PG_BUDGET_ID = '00000000-0000-4000-8000-0000000000c1';
const ctx = buildCtx({ companyId: IDS.companyId, userId: IDS.userId });
const asClient = (f: FakeSheetsClient) => f as unknown as sheets_v4.Sheets;

async function seedPerGuestItem() {
  await db.insert(budget).values({
    id: PG_BUDGET_ID,
    clientId: IDS.clientId,
    companyId: IDS.companyId,
    category: 'Catering',
    item: 'Per-plate catering',
    isPerGuestItem: true,
    perGuestCost: '100',
    estimatedCost: '0',
  } as never);
}

async function snapshot() {
  const client = (await db.execute(sql`SELECT guest_count FROM clients WHERE id = ${IDS.clientId}`)) as unknown as Array<{ guest_count: number }>;
  const pg = (await db.execute(sql`SELECT estimated_cost FROM budget WHERE id = ${PG_BUDGET_ID}`)) as unknown as Array<{ estimated_cost: string }>;
  const confirmed = (await db.execute(sql`SELECT count(*)::int AS n FROM guests WHERE client_id = ${IDS.clientId} AND rsvp_status = 'confirmed'`)) as unknown as Array<{ n: number }>;
  return {
    guestCount: Number(client[0]?.guest_count ?? 0),
    perGuestEstimated: Number(pg[0]?.estimated_cost ?? 0),
    confirmedGuests: confirmed[0]?.n ?? 0,
  };
}

describe('C2 parity — chatbot vs sheet (add confirmed guest w/ per-guest budget)', () => {
  beforeAll(async () => { await resetDeterministic(); });
  afterAll(async () => { await teardownTenant(IDS.companyId); });

  it('CHATBOT path: add_guest(confirmed) recalcs BOTH client stats AND per-guest budget', async () => {
    await resetDeterministic();
    await seedPerGuestItem();
    const res = await executeToolWithSync(
      'add_guest',
      { clientId: IDS.clientId, firstName: 'Zara', lastName: 'Parity', rsvpStatus: 'confirmed', partySize: 2 },
      ctx,
    );
    expect(res.success, JSON.stringify(res)).toBe(true);
    const snap = await snapshot();
    expect(snap.confirmedGuests, 'Zara confirmed').toBeGreaterThanOrEqual(1);
    expect(snap.guestCount, 'recalcClientStats ran').toBeGreaterThanOrEqual(1);
    expect(snap.perGuestEstimated, 'recalcPerGuestBudgetItems ran (100 × partySize)').toBeGreaterThan(0);
    // remember for the parity comparison
    (globalThis as Record<string, unknown>).__chatbotSnap = snap;
  });

  it('SHEET path: importGuestsFromSheet(confirmed) recalcs client stats but NOT per-guest budget (DIVERGENCE)', async () => {
    await resetDeterministic();
    await seedPerGuestItem();

    const fake = new FakeSheetsClient();
    const client = asClient(fake);
    await syncGuestsToSheet(client, 'sheet', IDS.clientId);
    const rows = fake.getSheet('Guests') as string[][];
    const h = rows[0];
    const add = h.map(() => '');
    add[h.indexOf('First Name')] = 'Zara';
    add[h.indexOf('Last Name')] = 'Parity';
    add[h.indexOf('RSVP Status')] = 'confirmed';
    if (h.indexOf('Party Size') >= 0) add[h.indexOf('Party Size')] = '2';
    rows.push(add);
    fake.setSheet('Guests', rows);
    await importGuestsFromSheet(client, 'sheet', IDS.clientId, IDS.companyId);

    const snap = await snapshot();
    const chatbot = (globalThis as Record<string, unknown>).__chatbotSnap as Awaited<ReturnType<typeof snapshot>>;

    // PARITY HOLDS: both paths recalc client stats identically.
    expect(snap.confirmedGuests, 'same confirmed-guest count as chatbot').toBe(chatbot.confirmedGuests);
    expect(snap.guestCount, 'clients.guestCount parity').toBe(chatbot.guestCount);

    // DIVERGENCE: the Sheet import omits recalcPerGuestBudgetItems → per-guest budget stays
    // stale at 0, while the chatbot path recalculated it. This is the parity defect.
    expect(snap.perGuestEstimated, 'BUG: Sheet import did not recalc per-guest budget').toBe(0);
    expect(snap.perGuestEstimated).not.toBe(chatbot.perGuestEstimated);
  });
});
