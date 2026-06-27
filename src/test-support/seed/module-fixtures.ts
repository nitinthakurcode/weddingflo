/**
 * Per-module deterministic fixtures for the Prompt-2 C1 verification phase (ADDITIVE
 * harness — no production behavior change). resetDeterministic() seeds the base tenant
 * (company/user/2 clients/2 events/2 budget/1 guest); these helpers add the extra rows
 * each module's export→edit→import round-trip needs (an EDIT target + a DELETE target),
 * with FIXED primary keys so every assertion is deterministic.
 *
 * Call AFTER resetDeterministic() (which tears the tenant down first). teardownTenant
 * sweeps every table with client_id/company_id for the tenant, so these rows are removed
 * on the next reset — no accumulation.
 *
 * Required columns verified against src/lib/db/schema-features.ts (June 2026):
 *   hotels(uuid id), guest_transport(uuid id), vendors(text id, company-scoped),
 *   client_vendors(text id), gifts(text id, HAS company_id), guest_gifts(text id, NO
 *   company_id), timeline(text id, start_time NOT NULL), events(text id).
 */
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  guests,
  hotels,
  guestTransport,
  vendors,
  clientVendors,
  gifts,
  guestGifts,
  timeline,
} from '@/lib/db/schema-features';
import { IDS, FIXED_NOW } from './deterministic-seed';

/** Fixed fixture PKs (…0010+ range, disjoint from deterministic-seed IDS …0001-…000b). */
export const FIDS = {
  guest2: '00000000-0000-4000-8000-000000000011', // guests: DELETE target
  hotel1: '00000000-0000-4000-8000-000000000012', // hotels: EDIT target
  hotel2: '00000000-0000-4000-8000-000000000013', // hotels: DELETE target
  transport1: '00000000-0000-4000-8000-000000000014',
  transport2: '00000000-0000-4000-8000-000000000015',
  vendor1: '00000000-0000-4000-8000-000000000016',
  vendor2: '00000000-0000-4000-8000-000000000017',
  clientVendor1: '00000000-0000-4000-8000-000000000018',
  clientVendor2: '00000000-0000-4000-8000-000000000019',
  gift1: '00000000-0000-4000-8000-00000000001a', // gifts table (received-from-guest)
  gift2: '00000000-0000-4000-8000-00000000001b',
  guestGift1: '00000000-0000-4000-8000-00000000001c', // guest_gifts table (given-to-guest)
  guestGift2: '00000000-0000-4000-8000-00000000001d',
  timeline1: '00000000-0000-4000-8000-00000000001e',
  timeline2: '00000000-0000-4000-8000-00000000001f',
} as const;

/** A second guest so the guests round-trip has an EDIT (IDS.guestId) + a DELETE target. */
export async function seedExtraGuest(): Promise<void> {
  await db.insert(guests).values({
    id: FIDS.guest2,
    clientId: IDS.clientId,
    companyId: IDS.companyId,
    firstName: 'Dave',
    lastName: 'Deletable',
    rsvpStatus: 'pending',
  } as never);
}

export async function seedHotels(): Promise<void> {
  await db.insert(hotels).values([
    {
      id: FIDS.hotel1,
      clientId: IDS.clientId,
      companyId: IDS.companyId,
      guestName: 'Carol Guest',
      hotelName: 'Grand Plaza',
      roomType: 'Suite',
      cost: '1200',
      accommodationNeeded: true,
    },
    {
      id: FIDS.hotel2,
      clientId: IDS.clientId,
      companyId: IDS.companyId,
      guestName: 'Dave Deletable',
      hotelName: 'Budget Inn',
      cost: '300',
      accommodationNeeded: true,
    },
  ] as never);
}

export async function seedTransport(): Promise<void> {
  await db.insert(guestTransport).values([
    {
      // guestId linked → export derives "Guest Name" from the guest (export.router
      // enriches transport from the guest lookup and BLANKS the name when guestId is
      // null, which the importer then skips — see FINDINGS C-export-enrich).
      id: FIDS.transport1,
      clientId: IDS.clientId,
      companyId: IDS.companyId,
      guestId: IDS.guestId,
      guestName: 'Carol Guest',
      pickupFrom: 'Airport',
      dropTo: 'Grand Plaza',
      legType: 'arrival',
    },
    {
      id: FIDS.transport2,
      clientId: IDS.clientId,
      companyId: IDS.companyId,
      guestId: FIDS.guest2,
      guestName: 'Dave Deletable',
      pickupFrom: 'Grand Plaza',
      dropTo: 'Venue',
      legType: 'arrival',
    },
  ] as never);
}

export async function seedVendors(): Promise<void> {
  await db.insert(vendors).values([
    { id: FIDS.vendor1, companyId: IDS.companyId, name: 'Bloom Florist', category: 'florist' },
    { id: FIDS.vendor2, companyId: IDS.companyId, name: 'Snap Studio', category: 'photography' },
  ] as never);
  await db.insert(clientVendors).values([
    {
      id: FIDS.clientVendor1,
      clientId: IDS.clientId,
      vendorId: FIDS.vendor1,
      companyId: IDS.companyId,
      eventId: IDS.eventId,
      contractAmount: '2500',
      paymentStatus: 'pending',
    },
    {
      id: FIDS.clientVendor2,
      clientId: IDS.clientId,
      vendorId: FIDS.vendor2,
      companyId: IDS.companyId,
      eventId: IDS.eventId,
      contractAmount: '4000',
      paymentStatus: 'pending',
    },
  ] as never);
}

/** gifts table = gifts received FROM guests. */
export async function seedGifts(): Promise<void> {
  await db.insert(gifts).values([
    { id: FIDS.gift1, clientId: IDS.clientId, companyId: IDS.companyId, name: 'Crystal Vase', value: 150, status: 'received' },
    { id: FIDS.gift2, clientId: IDS.clientId, companyId: IDS.companyId, name: 'Gift Card', value: 200, status: 'received' },
  ] as never);
}

/** guest_gifts table = gifts given TO guests (the combined-export "Gifts" sheet source). */
export async function seedGuestGifts(): Promise<void> {
  await db.insert(guestGifts).values([
    { id: FIDS.guestGift1, clientId: IDS.clientId, guestId: IDS.guestId, name: 'Favor Box', type: 'physical', quantity: 1 },
    { id: FIDS.guestGift2, clientId: IDS.clientId, guestId: FIDS.guest2, name: 'Keepsake Mug', type: 'physical', quantity: 2 },
  ] as never);
}

export async function seedTimeline(): Promise<void> {
  await db.insert(timeline).values([
    {
      id: FIDS.timeline1,
      clientId: IDS.clientId,
      companyId: IDS.companyId,
      eventId: IDS.eventId,
      title: 'Ceremony',
      startTime: FIXED_NOW,
      durationMinutes: 60,
      location: 'Main Hall',
      phase: 'showtime',
    },
    {
      id: FIDS.timeline2,
      clientId: IDS.clientId,
      companyId: IDS.companyId,
      eventId: IDS.eventId,
      title: 'Reception',
      startTime: new Date(FIXED_NOW.getTime() + 2 * 3600_000),
      durationMinutes: 120,
      location: 'Ballroom',
      phase: 'showtime',
    },
  ] as never);
}

/** Convenience: seed every module fixture (use sparingly; most tests need only their own). */
export async function seedAllModuleFixtures(): Promise<void> {
  await seedExtraGuest();
  await seedHotels();
  await seedTransport();
  await seedVendors();
  await seedGifts();
  await seedGuestGifts();
  await seedTimeline();
}

/** Count rows for a tenant table (debug/assert helper). */
export async function tableCount(table: string, companyOrClientCol: string, id: string): Promise<number> {
  const rows = (await db.execute(
    sql`SELECT count(*)::int AS n FROM ${sql.identifier(table)} WHERE ${sql.identifier(companyOrClientCol)} = ${id}`,
  )) as unknown as Array<{ n: number }>;
  return rows[0]?.n ?? 0;
}
