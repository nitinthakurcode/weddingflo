/**
 * Contract test — every broadcastSync queryPath points at a real tRPC procedure.
 *
 * Recurring bug class: a queryPath typo or a phantom namespace (e.g. the
 * 'communications.list' / 'invoices.list' / 'creatives.list' paths that referenced
 * routers that don't exist) makes the client invalidate a key nothing subscribes
 * to → the module never refreshes after a chatbot/UI/import mutation. It looks
 * correct in code review (the string is plausible) and no test caught it.
 *
 * This validates every path used in:
 *   - the shared cascade-query-paths constants,
 *   - the chatbot TOOL_QUERY_MAP + MODULE_PRIMARY_QUERIES,
 *   - every `queryPaths: [...]` array passed to broadcastSync across the routers,
 * against the REAL router surface derived from source:
 *   - namespace ∈ the appRouter namespaces declared in _app.ts,
 *   - procedure ∈ the set of procedure names defined across all *.router.ts files.
 *
 * (We derive the surface from source rather than importing appRouter, because
 * importing it eagerly boots Stripe/Redis/db clients — env-dependent and unfit
 * for a fast unit test.)
 */
import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

const ROOT = process.cwd()
const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

function listRouterFiles(): string[] {
  return (fs.readdirSync(path.join(ROOT, 'src'), { recursive: true }) as string[])
    .filter((f) => f.endsWith('.router.ts'))
    .map((f) => path.join(ROOT, 'src', f))
}

const PATH_RE = /'([a-z][a-zA-Z]+\.[a-z][a-zA-Z]+)'/g

function buildSurface() {
  const app = stripComments(fs.readFileSync(path.join(ROOT, 'src/server/trpc/routers/_app.ts'), 'utf8'))
  const namespaces = new Set([...app.matchAll(/^\s+([a-zA-Z]+):\s*[a-zA-Z]+Router\b/gm)].map((x) => x[1]))
  const procedures = new Set<string>()
  for (const f of listRouterFiles()) {
    const src = stripComments(fs.readFileSync(f, 'utf8'))
    ;[...src.matchAll(/^\s+([a-zA-Z0-9_]+):\s*[a-zA-Z]*Procedure\b/gm)].forEach((x) => procedures.add(x[1]))
  }
  return { namespaces, procedures }
}

function collectUsedPaths(): Set<string> {
  const used = new Set<string>()
  for (const rel of [
    'src/lib/sync/cascade-query-paths.ts',
    'src/features/chatbot/server/services/query-invalidation-map.ts',
  ]) {
    const s = stripComments(fs.readFileSync(path.join(ROOT, rel), 'utf8'))
    ;[...s.matchAll(PATH_RE)].forEach((x) => used.add(x[1]))
  }
  for (const f of listRouterFiles()) {
    const src = stripComments(fs.readFileSync(f, 'utf8'))
    ;[...src.matchAll(/queryPaths:\s*\[([^\]]*)\]/gs)].forEach((mm) =>
      [...mm[1].matchAll(PATH_RE)].forEach((x) => used.add(x[1])),
    )
  }
  return used
}

describe('broadcastSync queryPath validity', () => {
  const { namespaces, procedures } = buildSurface()
  const used = collectUsedPaths()

  it('derives a non-trivial router surface and path set', () => {
    expect(namespaces.size).toBeGreaterThan(40)
    expect(procedures.size).toBeGreaterThan(100)
    expect(used.size).toBeGreaterThan(20)
  })

  it('every queryPath namespace is a real appRouter namespace', () => {
    const bad = [...used].filter((p) => !namespaces.has(p.split('.')[0])).sort()
    expect(bad, `phantom namespaces (not in _app.ts): ${bad.join(', ')}`).toEqual([])
  })

  it('every queryPath procedure is a real tRPC procedure name', () => {
    const bad = [...used].filter((p) => !procedures.has(p.split('.')[1])).sort()
    expect(bad, `phantom procedures (not defined in any router): ${bad.join(', ')}`).toEqual([])
  })
})
