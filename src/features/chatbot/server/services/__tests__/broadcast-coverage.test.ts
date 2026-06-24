/**
 * Contract test — chatbot mutation tools always declare an invalidation set.
 *
 * Recurring bug class (every prior "bulletproof" audit re-found a variant): a new
 * chatbot mutation tool ships without a TOOL_QUERY_MAP entry, so its writes never
 * invalidate any query → the module page stays stale until a manual refresh. This
 * was convention-only ("remember to add the tool to the map"); this test makes it
 * a CI failure.
 *
 * Source of truth for which tools mutate: TOOL_METADATA[name].type in
 * tools/definitions.ts. We cross-check it against the invalidation map and the
 * isQueryOnlyTool() helper so the three can never drift.
 */
import { describe, it, expect } from 'vitest'
import { TOOL_METADATA } from '@/features/chatbot/tools/definitions'
import {
  TOOL_QUERY_MAP,
  isQueryOnlyTool,
} from '@/features/chatbot/server/services/query-invalidation-map'

const allTools = Object.values(TOOL_METADATA)
const mutationTools = allTools.filter((t) => t.type === 'mutation').map((t) => t.name)
const queryTools = allTools.filter((t) => t.type === 'query').map((t) => t.name)

describe('chatbot broadcast/invalidation coverage', () => {
  it('every mutation tool has a TOOL_QUERY_MAP entry', () => {
    const missing = mutationTools.filter((name) => !(name in TOOL_QUERY_MAP))
    expect(missing, `mutation tools missing from TOOL_QUERY_MAP: ${missing.join(', ')}`).toEqual([])
  })

  it('every TOOL_QUERY_MAP key is a real mutation tool (no stale/typo keys)', () => {
    const known = new Set(mutationTools)
    const unknown = Object.keys(TOOL_QUERY_MAP).filter((k) => !known.has(k))
    expect(unknown, `TOOL_QUERY_MAP keys that are not mutation tools: ${unknown.join(', ')}`).toEqual([])
  })

  it('query-only tools never invalidate (no TOOL_QUERY_MAP entry)', () => {
    const leaked = queryTools.filter((name) => name in TOOL_QUERY_MAP)
    expect(leaked, `query tools wrongly present in TOOL_QUERY_MAP: ${leaked.join(', ')}`).toEqual([])
  })

  it('isQueryOnlyTool() matches the query-type tools in TOOL_METADATA exactly', () => {
    // Both lists must agree — otherwise the executor mis-classifies a tool.
    for (const name of queryTools) {
      expect(isQueryOnlyTool(name), `${name} is type:'query' but isQueryOnlyTool() returned false`).toBe(true)
    }
    for (const name of mutationTools) {
      expect(isQueryOnlyTool(name), `${name} is type:'mutation' but isQueryOnlyTool() returned true`).toBe(false)
    }
  })

  it('every invalidation path is a well-formed `namespace.procedure` string', () => {
    const re = /^[a-z][a-zA-Z]+\.[a-z][a-zA-Z]+$/
    for (const [tool, paths] of Object.entries(TOOL_QUERY_MAP)) {
      expect(Array.isArray(paths), `${tool} must map to an array`).toBe(true)
      for (const p of paths) {
        expect(re.test(p), `${tool}: malformed query path "${p}"`).toBe(true)
      }
    }
  })
})
