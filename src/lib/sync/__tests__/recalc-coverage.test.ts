/**
 * Contract test — every client-stat-coupled mutation recalcs + broadcasts.
 *
 * Two recurring bug classes prior audits kept re-finding by hand:
 *   1. A guest/budget/vendor mutation forgets recalcClientStats() → the dashboard
 *      client cards (guestCount / budget totals) silently drift from reality.
 *   2. A mutation forgets broadcastSync() → other tabs/users never refresh.
 *
 * These were enforced only by comments in the routers. This test parses the three
 * routers whose mutations feed `clients` stats and fails CI if any mutation omits
 * the calls. A new mutation that legitimately must NOT recalc (e.g. a flag-only
 * flip) is made a conscious decision: add it to RECALC_EXEMPT with a reason.
 *
 * Scoped to guests/budget/vendors on purpose — these are the only modules whose
 * writes change `clients` cached stats (see cascade-query-paths.ts rationale).
 */
import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

const ROUTERS = {
  guests: 'src/features/guests/server/routers/guests.router.ts',
  budget: 'src/features/analytics/server/routers/budget.router.ts',
  vendors: 'src/features/events/server/routers/vendors.router.ts',
} as const

/**
 * Mutations that intentionally do NOT call a recalc — verified against the data
 * coupling. They flip flags / write side tables that are not part of client stats.
 */
const RECALC_EXEMPT: Record<keyof typeof ROUTERS, Set<string>> = {
  guests: new Set([
    'checkIn', // flips checked-in flag only — no guestCount/budget change
  ]),
  budget: new Set([]),
  vendors: new Set([
    'updateApprovalStatus', // approval workflow flag — not a cost
    'updatePaymentStatus', // payment status label — not the estimated cost stat
    'addComment',
    'deleteComment', // vendor notes — no cost
    'addReview',
    'deleteReview', // ratings — no cost
    'addVendorAdvance',
    'updateVendorAdvance',
    'deleteVendorAdvance', // advances write the vendor payments side-table
  ]),
}

type Proc = { name: string; body: string; isMutation: boolean }

function parseProcedures(src: string): Proc[] {
  const re = /^ {2}([a-zA-Z0-9_]+):\s*[a-zA-Z]*Procedure\b/gm
  const marks: Array<{ name: string; pos: number }> = []
  let m: RegExpExecArray | null
  while ((m = re.exec(src))) marks.push({ name: m[1], pos: m.index })
  return marks.map((mk, i) => {
    const end = i + 1 < marks.length ? marks[i + 1].pos : src.length
    const body = src.slice(mk.pos, end)
    return { name: mk.name, body, isMutation: /\.mutation\(/.test(body) }
  })
}

describe('client-stat mutation coverage', () => {
  for (const [mod, rel] of Object.entries(ROUTERS) as Array<[keyof typeof ROUTERS, string]>) {
    const src = fs.readFileSync(path.resolve(process.cwd(), rel), 'utf8')
    const mutations = parseProcedures(src).filter((p) => p.isMutation)

    it(`${mod}: has mutations to check`, () => {
      expect(mutations.length).toBeGreaterThan(0)
    })

    it(`${mod}: every mutation recalcs client stats (or is explicitly exempt)`, () => {
      const offenders = mutations
        .filter((p) => !RECALC_EXEMPT[mod].has(p.name))
        .filter((p) => !/recalcClientStats|recalcPerGuestBudgetItems/.test(p.body))
        .map((p) => p.name)
      expect(
        offenders,
        `${mod} mutations missing recalc (add a recalc call, or add to RECALC_EXEMPT with a reason): ${offenders.join(', ')}`,
      ).toEqual([])
    })

    it(`${mod}: every mutation calls broadcastSync`, () => {
      const offenders = mutations.filter((p) => !/broadcastSync/.test(p.body)).map((p) => p.name)
      expect(offenders, `${mod} mutations missing broadcastSync: ${offenders.join(', ')}`).toEqual([])
    })
  }
})
