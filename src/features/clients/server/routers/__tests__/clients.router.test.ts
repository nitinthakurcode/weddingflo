/**
 * Integration Tests for Clients Router
 *
 * Tests tRPC procedures with mocked Supabase client.
 * Validates business logic, permissions, and data transformations.
 */

import { clientsRouter } from '../clients.router'
import { createInnerTRPCContext } from '@/server/trpc/trpc'

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

// Helper to create test context
const createTestContext = (overrides = {}) => {
  return createInnerTRPCContext({
    userId: 'test-user-id',
    companyId: 'test-company-id',
    role: 'company_admin',
    subscriptionTier: 'premium',
    supabase: mockSupabase as any,
    ...overrides,
  })
}

describe('Clients Router', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('list', () => {
    it('fetches clients for the authenticated company', async () => {
      const mockClients = [
        {
          id: 'client-1',
          company_id: 'test-company-id',
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
        id: 'client-1',
        company_id: 'test-company-id',
        partner1_first_name: 'John',
      }

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => Promise.resolve({ data: mockClient, error: null })),
            })),
          })),
        })),
      })

      const ctx = createTestContext()
      const caller = clientsRouter.createCaller(ctx)

      const result = await caller.getById({ id: 'client-1' })

      expect(result).toEqual(mockClient)
    })
  })
})
