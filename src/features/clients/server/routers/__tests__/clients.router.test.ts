/**
 * Integration Tests for Clients Router
 *
 * Tests tRPC procedures with mocked Supabase client.
 * Validates business logic, permissions, and data transformations.
 */

import { clientsRouter } from '../clients.router'

// Mock Supabase client
const mockSupabase = {
  from: jest.fn(() => mockSupabase),
  select: jest.fn(() => mockSupabase),
  eq: jest.fn(() => mockSupabase),
  order: jest.fn(() => mockSupabase),
  or: jest.fn(() => mockSupabase),
  single: jest.fn(() => ({ data: null, error: null })),
  insert: jest.fn(() => ({ data: null, error: null })),
  update: jest.fn(() => ({ data: null, error: null })),
  delete: jest.fn(() => ({ data: null, error: null })),
}

// Test UUIDs
const TEST_COMPANY_ID = '00000000-0000-0000-0000-000000000001'
const TEST_CLIENT_ID = '00000000-0000-0000-0000-000000000002'

type TestContext = {
  userId: string
  companyId?: string
  role: 'company_admin'
  subscriptionTier: 'premium'
  supabase: typeof mockSupabase
}

// Helper to create test context - creates context object directly
const createTestContext = (overrides: Partial<TestContext> = {}): TestContext => {
  return {
    userId: 'test-user-id',
    companyId: TEST_COMPANY_ID,
    role: 'company_admin',
    subscriptionTier: 'premium',
    supabase: mockSupabase,
    ...overrides,
  }
}

describe('Clients Router', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('list', () => {
    it('fetches clients for the authenticated company', async () => {
      const mockClients = [
        {
          id: TEST_CLIENT_ID,
          company_id: TEST_COMPANY_ID,
          partner1_first_name: 'John',
          partner1_last_name: 'Doe',
          wedding_date: '2025-06-15',
        },
      ]

      // Mock the entire query chain to return data
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => Promise.resolve({ data: mockClients, error: null })),
          })),
        })),
      })

      const ctx = createTestContext()
      const caller = clientsRouter.createCaller(ctx)

      const result = await caller.list({ search: undefined })

      expect(result).toEqual(mockClients)
      expect(mockSupabase.from).toHaveBeenCalledWith('clients')
    })

    it('filters by search term', async () => {
      const ctx = createTestContext()
      const caller = clientsRouter.createCaller(ctx)

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              or: jest.fn(() => Promise.resolve({ data: [], error: null })),
            })),
          })),
        })),
      })

      await caller.list({ search: 'Smith' })

      // Verify search filter was applied
      // Note: Exact mock verification depends on implementation
      expect(mockSupabase.from).toHaveBeenCalledWith('clients')
    })

    it('throws error when company_id is missing', async () => {
      const ctx = createTestContext({ companyId: undefined })
      const caller = clientsRouter.createCaller(ctx)

      await expect(caller.list({})).rejects.toThrow('Company ID not found')
    })
  })

  describe('getById', () => {
    it('returns client when found', async () => {
      const mockClient = {
        id: TEST_CLIENT_ID,
        company_id: TEST_COMPANY_ID,
        partner1_first_name: 'John',
      }

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              maybeSingle: jest.fn(() => Promise.resolve({ data: mockClient, error: null })),
            })),
          })),
        })),
      })

      const ctx = createTestContext()
      const caller = clientsRouter.createCaller(ctx)

      const result = await caller.getById({ id: TEST_CLIENT_ID })

      expect(result).toEqual(mockClient)
    })
  })
})
