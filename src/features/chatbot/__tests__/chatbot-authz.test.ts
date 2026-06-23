/**
 * Chatbot Authorization Tests
 *
 * Covers the central authz chokepoint (chatbot-authz.ts):
 * - tool access-policy completeness (every tool classified — fail-closed safety net)
 * - role allowlist
 * - per-client access (staff → assigned clients only)
 * - mutation policy (staff assigned-write; company/admin-only tools)
 * - per-user assistant identity in the system prompt
 */
import { CHATBOT_TOOLS } from '../tools/definitions'
import {
  TOOL_ACCESS_SCOPE,
  getToolAccessScope,
  isChatbotAdmin,
  assertChatbotEntry,
  authorizeClientForChatbot,
  enforceChatbotAccess,
} from '../server/services/chatbot-authz'
import { buildChatbotSystemPrompt } from '@/lib/ai/prompts/chatbot-system'
import { clients, teamClientAssignments } from '@/lib/db/schema-features'
import type { ChatbotContext } from '../server/services/context-builder'

// --- Minimal chainable db mock for assertClientAccess() ---
function makeDb(opts: { clientInCompany?: boolean; assigned?: boolean }) {
  const builder: any = {
    _tbl: null,
    select() {
      return this
    },
    from(tbl: unknown) {
      this._tbl = tbl
      return this
    },
    where() {
      return this
    },
    async limit() {
      if (this._tbl === clients) return opts.clientInCompany ? [{ id: 'client-1' }] : []
      if (this._tbl === teamClientAssignments) return opts.assigned ? [{ id: 'assign-1' }] : []
      return []
    },
  }
  return builder
}

function ctxFor(
  role: string,
  dbOpts: { clientInCompany?: boolean; assigned?: boolean } = {}
) {
  return {
    db: makeDb(dbOpts),
    role: role as any,
    userId: 'user-1',
    companyId: 'company-1',
  }
}

// ============================================
// TOOL ACCESS-POLICY COMPLETENESS (fail-closed safety net)
// ============================================
describe('Chatbot tool access policy', () => {
  it('classifies every CHATBOT_TOOLS entry (no tool may be unclassified)', () => {
    const toolNames = CHATBOT_TOOLS.map((t) => t.function.name)
    const missing = toolNames.filter((n) => !getToolAccessScope(n))
    expect(missing).toEqual([])
  })

  it('only uses known scope values', () => {
    const allowed = new Set(['client', 'cross_client', 'company', 'global'])
    for (const scope of Object.values(TOOL_ACCESS_SCOPE)) {
      expect(allowed.has(scope)).toBe(true)
    }
  })
})

// ============================================
// ROLE ALLOWLIST
// ============================================
describe('assertChatbotEntry', () => {
  it('allows planner roles', () => {
    expect(() => assertChatbotEntry(ctxFor('super_admin'))).not.toThrow()
    expect(() => assertChatbotEntry(ctxFor('company_admin'))).not.toThrow()
    expect(() => assertChatbotEntry(ctxFor('staff'))).not.toThrow()
  })
  it('rejects client_user and unknown roles', () => {
    expect(() => assertChatbotEntry(ctxFor('client_user'))).toThrow()
    expect(() => assertChatbotEntry(ctxFor('' as any))).toThrow()
  })
})

describe('isChatbotAdmin', () => {
  it('is true only for admins', () => {
    expect(isChatbotAdmin(ctxFor('super_admin'))).toBe(true)
    expect(isChatbotAdmin(ctxFor('company_admin'))).toBe(true)
    expect(isChatbotAdmin(ctxFor('staff'))).toBe(false)
  })
})

// ============================================
// PER-CLIENT ACCESS
// ============================================
describe('authorizeClientForChatbot', () => {
  it('admin: allowed when client is in company', async () => {
    await expect(
      authorizeClientForChatbot(ctxFor('company_admin', { clientInCompany: true }), 'client-1')
    ).resolves.toBeUndefined()
  })
  it('staff: allowed only when assigned', async () => {
    await expect(
      authorizeClientForChatbot(ctxFor('staff', { clientInCompany: true, assigned: true }), 'client-1')
    ).resolves.toBeUndefined()
    await expect(
      authorizeClientForChatbot(ctxFor('staff', { clientInCompany: true, assigned: false }), 'client-1')
    ).rejects.toThrow()
  })
  it('rejects a client outside the company', async () => {
    await expect(
      authorizeClientForChatbot(ctxFor('company_admin', { clientInCompany: false }), 'client-x')
    ).rejects.toThrow()
  })
})

// ============================================
// MUTATION + ADMIN-ONLY POLICY
// ============================================
describe('enforceChatbotAccess', () => {
  it('staff may mutate an assigned client', async () => {
    await expect(
      enforceChatbotAccess('add_guest', { clientId: 'client-1' }, ctxFor('staff', { clientInCompany: true, assigned: true }), 'mutation')
    ).resolves.toBeUndefined()
  })

  it('staff may NOT mutate an unassigned client', async () => {
    await expect(
      enforceChatbotAccess('add_guest', { clientId: 'client-1' }, ctxFor('staff', { clientInCompany: true, assigned: false }), 'mutation')
    ).rejects.toThrow()
  })

  it('staff may NOT use company-scoped mutations (create_client)', async () => {
    await expect(
      enforceChatbotAccess('create_client', {}, ctxFor('staff'), 'mutation')
    ).rejects.toThrow()
  })

  it('staff may NOT use admin-only tools (assign_team_member, query_analytics)', async () => {
    await expect(
      enforceChatbotAccess('assign_team_member', { clientId: 'client-1' }, ctxFor('staff', { clientInCompany: true, assigned: true }), 'mutation')
    ).rejects.toThrow()
    await expect(
      enforceChatbotAccess('query_analytics', {}, ctxFor('staff'), 'query')
    ).rejects.toThrow()
  })

  it('admin may use company-wide analytics + create clients', async () => {
    await expect(
      enforceChatbotAccess('query_analytics', {}, ctxFor('company_admin'), 'query')
    ).resolves.toBeUndefined()
    await expect(
      enforceChatbotAccess('create_client', {}, ctxFor('company_admin'), 'mutation')
    ).resolves.toBeUndefined()
  })

  it('staff querying an assigned client is allowed; client_user is blocked', async () => {
    await expect(
      enforceChatbotAccess('get_guest_stats', { clientId: 'client-1' }, ctxFor('staff', { clientInCompany: true, assigned: true }), 'query')
    ).resolves.toBeUndefined()
    await expect(
      enforceChatbotAccess('get_guest_stats', { clientId: 'client-1' }, ctxFor('client_user'), 'query')
    ).rejects.toThrow()
  })
})

// ============================================
// PER-USER IDENTITY
// ============================================
describe('per-user assistant identity', () => {
  const baseContext: ChatbotContext = {
    hasClient: false,
    client: null,
    events: { total: 0, upcoming: 0, completed: 0, nextEvent: null },
    guests: { total: 0, confirmed: 0, pending: 0, declined: 0, maybe: 0, needsHotel: 0, needsTransport: 0, dietarySpecial: 0 },
    budget: { totalBudget: 0, totalEstimated: 0, totalActual: 0, totalPaid: 0, remaining: 0, percentUsed: 0, itemCount: 0 },
    vendors: { total: 0, confirmed: 0, pending: 0, byCategory: {} },
    timeline: { totalItems: 0, upcomingToday: 0, nextItem: null },
    timestamp: new Date('2026-06-23T00:00:00Z'),
  }

  it('renders "{FirstName}\'s Assistant" when a name is present', () => {
    const prompt = buildChatbotSystemPrompt({ ...baseContext, userName: 'Nitin' })
    expect(prompt).toContain("Nitin's Assistant")
  })

  it('falls back to "WeddingFlo Assistant" without a name', () => {
    const prompt = buildChatbotSystemPrompt({ ...baseContext, userName: null })
    expect(prompt).toContain('WeddingFlo Assistant')
  })

  it('includes scope-confinement + injection-resistance rules', () => {
    const prompt = buildChatbotSystemPrompt(baseContext)
    expect(prompt).toContain('Security Rules')
    expect(prompt.toLowerCase()).toContain('untrusted')
  })
})
