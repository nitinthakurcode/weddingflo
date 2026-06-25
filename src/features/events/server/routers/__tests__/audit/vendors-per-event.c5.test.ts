/**
 * C5 — Vendors segregated per event, asserted by RUNNING the real getAll query.
 *   getAll(eventId=uuid)        → only that event's vendors
 *   getAll(eventId='unassigned')→ eventId IS NULL only
 *   getAll(no eventId)          → all client vendors
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '@/lib/db';
import { vendors, clientVendors } from '@/lib/db/schema';
import { IDS, resetDeterministic, teardownTenant } from '@/test-support/seed/deterministic-seed';
import { callerFor } from '@/test-support/audit-caller';

const caller = callerFor({ companyId: IDS.companyId, userId: IDS.userId });

const VENDOR_ID = '00000000-0000-4000-8000-0000000000c1';
const CV_ASSIGNED = '00000000-0000-4000-8000-0000000000c2';
const CV_UNASSIGNED = '00000000-0000-4000-8000-0000000000c3';

describe('C5 vendors per event', () => {
  beforeAll(async () => {
    await resetDeterministic();
    await db.insert(vendors).values({
      id: VENDOR_ID,
      companyId: IDS.companyId,
      name: 'Bloom Florist',
      category: 'florist',
    } as never);
    // Same master vendor linked twice: once to the Main Wedding event, once unassigned.
    await db.insert(clientVendors).values({
      id: CV_ASSIGNED,
      companyId: IDS.companyId,
      clientId: IDS.clientId,
      vendorId: VENDOR_ID,
      eventId: IDS.eventId,
    } as never);
    await db.insert(clientVendors).values({
      id: CV_UNASSIGNED,
      companyId: IDS.companyId,
      clientId: IDS.clientId,
      vendorId: VENDOR_ID,
      eventId: null,
    } as never);
  });
  afterAll(async () => {
    await teardownTenant(IDS.companyId);
  });

  it('eventId=uuid returns only that event link', async () => {
    const rows = await caller.vendors.getAll({ clientId: IDS.clientId, eventId: IDS.eventId });
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(CV_ASSIGNED);
    expect(rows[0].event_id).toBe(IDS.eventId);
  });

  it("eventId='unassigned' returns only NULL-event links", async () => {
    const rows = await caller.vendors.getAll({ clientId: IDS.clientId, eventId: 'unassigned' });
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(CV_UNASSIGNED);
    expect(rows[0].event_id).toBeNull();
  });

  it('no eventId returns all client vendor links', async () => {
    const rows = await caller.vendors.getAll({ clientId: IDS.clientId });
    expect(rows.map((r) => r.id).sort()).toEqual([CV_ASSIGNED, CV_UNASSIGNED].sort());
  });
});
