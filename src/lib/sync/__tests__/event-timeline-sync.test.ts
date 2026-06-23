/**
 * Unit tests for the canonical event+timeline helper.
 *
 * Verifies the two bugs this refactor fixed are gone:
 *   1. companyId is ALWAYS set on the event AND every timeline item.
 *   2. Timeline items ARE generated from the template (no longer empty).
 * Plus the wedding-date shift preserves the linked timeline.
 */

import { createEventWithTimeline, shiftEventTimelineForDateChange } from '../event-timeline-sync'
import { events as eventsTable, timeline as timelineTable } from '@/lib/db/schema'

const COMPANY_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
const CLIENT_ID = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e'

/** Chainable mock tx that captures every insert and serves template rows. */
function makeInsertTx(customTemplates: any[] = []) {
  const inserts: Array<{ table: unknown; values: any }> = []
  const tx: any = {
    select: () => tx,
    from: () => tx,
    where: () => tx,
    // template lookup is awaited at .orderBy()
    orderBy: () => Promise.resolve(customTemplates),
    insert: (table: unknown) => ({
      values: (vals: any) => {
        inserts.push({ table, values: vals })
        return {
          returning: () => Promise.resolve(Array.isArray(vals) ? vals : [{ ...vals }]),
          // timeline insert is awaited without .returning()
          then: (resolve: (v: unknown) => void) => resolve(undefined),
        }
      },
    }),
  }
  return { tx, inserts }
}

describe('createEventWithTimeline', () => {
  it('sets companyId on the event and generates wedding timeline items', async () => {
    const { tx, inserts } = makeInsertTx()

    const result = await createEventWithTimeline(tx, {
      clientId: CLIENT_ID,
      companyId: COMPANY_ID,
      title: "Alex & Sam's Wedding",
      eventType: 'Wedding',
      eventDate: '2026-09-12',
      venueName: 'Grand Hall',
      status: 'planned',
    })

    const eventInsert = inserts.find((i) => i.table === eventsTable)
    const timelineInsert = inserts.find((i) => i.table === timelineTable)

    expect(eventInsert).toBeDefined()
    expect(eventInsert!.values.companyId).toBe(COMPANY_ID)
    expect(eventInsert!.values.clientId).toBe(CLIENT_ID)

    // Wedding template generates multiple timeline items (no longer empty).
    expect(timelineInsert).toBeDefined()
    expect(Array.isArray(timelineInsert!.values)).toBe(true)
    expect(timelineInsert!.values.length).toBeGreaterThan(0)
    expect(result.timelineCount).toBe(timelineInsert!.values.length)

    // Every timeline item is tenant-scoped and linked back to the event.
    for (const item of timelineInsert!.values) {
      expect(item.companyId).toBe(COMPANY_ID)
      expect(item.sourceModule).toBe('events')
      expect(item.sourceId).toBe(result.eventId)
      expect(item.eventId).toBe(result.eventId)
    }
  })

  it('uses the caller-supplied eventId when provided', async () => {
    const { tx } = makeInsertTx()
    const fixedId = 'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f'
    const result = await createEventWithTimeline(tx, {
      eventId: fixedId,
      clientId: CLIENT_ID,
      companyId: COMPANY_ID,
      title: 'Custom',
      eventType: 'Wedding',
      eventDate: '2026-09-12',
    })
    expect(result.eventId).toBe(fixedId)
  })
})

describe('shiftEventTimelineForDateChange', () => {
  const makeUpdateTx = (rowsReturned: Array<{ id: string }>) => {
    let updateCalled = false
    const tx: any = {
      update: () => tx,
      set: () => tx,
      where: () => tx,
      returning: () => {
        updateCalled = true
        return Promise.resolve(rowsReturned)
      },
    }
    return { tx, wasCalled: () => updateCalled }
  }

  it('returns 0 and skips the update when the date is unchanged', async () => {
    const { tx, wasCalled } = makeUpdateTx([{ id: 'x' }])
    const shifted = await shiftEventTimelineForDateChange(tx, 'evt-1', {
      oldEventDate: '2026-09-12',
      oldStartTime: null,
      newEventDate: '2026-09-12',
    })
    expect(shifted).toBe(0)
    expect(wasCalled()).toBe(false)
  })

  it('returns 0 when either date is missing', async () => {
    const { tx } = makeUpdateTx([{ id: 'x' }])
    expect(
      await shiftEventTimelineForDateChange(tx, 'evt-1', {
        oldEventDate: null,
        oldStartTime: null,
        newEventDate: '2026-09-12',
      })
    ).toBe(0)
  })

  it('shifts linked items and returns the count when the date changes', async () => {
    const { tx, wasCalled } = makeUpdateTx([{ id: 'a' }, { id: 'b' }, { id: 'c' }])
    const shifted = await shiftEventTimelineForDateChange(tx, 'evt-1', {
      oldEventDate: '2026-09-12',
      oldStartTime: null,
      newEventDate: '2026-09-20',
    })
    expect(wasCalled()).toBe(true)
    expect(shifted).toBe(3)
  })
})
