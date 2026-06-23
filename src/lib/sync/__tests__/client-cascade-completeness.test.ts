/**
 * Client delete cascade completeness guard.
 *
 * The client delete in clients.router.ts SOFT-deletes the client row (sets
 * deletedAt) and HARD-deletes its children manually. Because the parent row is
 * never actually removed, the DB-level FK `onDelete: 'cascade'` NEVER fires — so
 * every child table that declares `references(() => clients.id, { onDelete:
 * 'cascade' })` MUST be deleted explicitly in the router, or its rows become
 * permanent orphans (CLAUDE.md rule 8).
 *
 * This static test fails the moment someone adds a new client-cascade table to
 * the schema without wiring it into the delete cascade.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const ROOT = process.cwd()
const SCHEMA_FILES = [
  'src/lib/db/schema-features.ts',
  'src/lib/db/schema-chatbot.ts',
]
const ROUTER_FILE = 'src/features/clients/server/routers/clients.router.ts'

/** Tables intentionally NOT hard-deleted on client delete, with justification. */
const ALLOWLIST = new Set<string>([
  // none — all client-cascade children are explicitly deleted
])

function collapse(s: string): string {
  return s.replace(/\s+/g, ' ')
}

/** All `export const <sym> = pgTable('<name>', {...})` whose body declares a
 *  clientId FK to clients with onDelete: 'cascade'. */
function findClientCascadeTables(): Set<string> {
  const found = new Set<string>()
  for (const rel of SCHEMA_FILES) {
    const src = readFileSync(join(ROOT, rel), 'utf8')
    // Split into per-table chunks on `export const X = pgTable(`
    const chunks = src.split(/export const /).slice(1)
    for (const chunk of chunks) {
      const symMatch = chunk.match(/^(\w+)\s*=\s*pgTable\(/)
      if (!symMatch) continue
      const sym = symMatch[1]
      const flat = collapse(chunk)
      if (/references\(\(\)\s*=>\s*clients\.id\s*,\s*\{\s*onDelete:\s*'cascade'/.test(flat)) {
        found.add(sym)
      }
    }
  }
  return found
}

/** All table symbols passed to `.delete(<sym>)` in the clients router. */
function findDeletedTables(): Set<string> {
  const src = readFileSync(join(ROOT, ROUTER_FILE), 'utf8')
  const deleted = new Set<string>()
  const re = /\.delete\(\s*(\w+)\s*\)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(src)) !== null) deleted.add(m[1])
  return deleted
}

describe('client delete cascade completeness', () => {
  it('hard-deletes every client-cascade child table (no orphans on soft-delete)', () => {
    const cascadeTables = findClientCascadeTables()
    const deleted = findDeletedTables()

    // Sanity: detection actually found the schema tables.
    expect(cascadeTables.size).toBeGreaterThan(20)

    const missing = [...cascadeTables].filter(
      (t) => !deleted.has(t) && !ALLOWLIST.has(t),
    )
    expect(missing, `client-cascade tables not deleted in clients.router.ts: ${missing.join(', ')}`).toEqual([])
  })
})
