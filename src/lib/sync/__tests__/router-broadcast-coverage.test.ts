/**
 * Contract test — every mutation in a shared-data router calls broadcastSync.
 *
 * The handbook's Rule 10 ("every mutation that changes shared data MUST call
 * broadcastSync") was convention-only. A mutation that forgets it silently breaks
 * real-time sync — other tabs/users keep stale data. This already bit events
 * (`updateStatus` shipped without a broadcast). This test parses every
 * shared-data router and fails CI if any `.mutation(` omits broadcastSync.
 *
 * Scope = the modules whose data is shared across the dashboard/portal and is
 * mirrored by SSE invalidation. A mutation that legitimately must not broadcast
 * (none today) would be added to BROADCAST_EXEMPT with a reason.
 */
import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

const ROUTERS: Record<string, string> = {
  clients: 'src/features/clients/server/routers/clients.router.ts',
  guests: 'src/features/guests/server/routers/guests.router.ts',
  budget: 'src/features/analytics/server/routers/budget.router.ts',
  vendors: 'src/features/events/server/routers/vendors.router.ts',
  events: 'src/features/events/server/routers/events.router.ts',
  timeline: 'src/features/events/server/routers/timeline.router.ts',
  hotels: 'src/features/events/server/routers/hotels.router.ts',
  transport: 'src/features/events/server/routers/guest-transport.router.ts',
  gifts: 'src/features/events/server/routers/gifts.router.ts',
  floorPlans: 'src/features/events/server/routers/floor-plans.router.ts',
}

const BROADCAST_EXEMPT: Record<string, Set<string>> = {}

function mutationsMissingBroadcast(src: string, exempt: Set<string>): string[] {
  const re = /^ {2}([a-zA-Z0-9_]+):\s*[a-zA-Z]*Procedure\b/gm
  const marks: Array<{ name: string; pos: number }> = []
  let m: RegExpExecArray | null
  while ((m = re.exec(src))) marks.push({ name: m[1], pos: m.index })
  const missing: string[] = []
  for (let i = 0; i < marks.length; i++) {
    const end = i + 1 < marks.length ? marks[i + 1].pos : src.length
    const body = src.slice(marks[i].pos, end)
    if (/\.mutation\(/.test(body) && !/broadcastSync/.test(body) && !exempt.has(marks[i].name)) {
      missing.push(marks[i].name)
    }
  }
  return missing
}

describe('shared-data router broadcast coverage', () => {
  for (const [mod, rel] of Object.entries(ROUTERS)) {
    it(`${mod}: every mutation calls broadcastSync`, () => {
      const src = fs.readFileSync(path.resolve(process.cwd(), rel), 'utf8')
      const missing = mutationsMissingBroadcast(src, BROADCAST_EXEMPT[mod] ?? new Set())
      expect(
        missing,
        `${mod} mutations missing broadcastSync (add the call, or add to BROADCAST_EXEMPT with a reason): ${missing.join(', ')}`,
      ).toEqual([])
    })
  }
})
