/**
 * Integration Tests for Clients Router
 *
 * Tests tRPC procedures with mocked Drizzle client.
 * Validates business logic, permissions, and data transformations.
 */

import { clientsRouter } from '../clients.router'

// Valid UUIDs (version 4 format)
const TEST_COMPANY_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
const TEST_CLIENT_ID = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e'
const TEST_USER_ID = 'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f'

// Mock client data
const mockClient = {
  id: TEST_CLIENT_ID,
  companyId: TEST_COMPANY_ID,
  partner1FirstName: 'John',
  partner1LastName: 'Doe',
  partner2FirstName: 'Jane',
  partner2LastName: 'Doe',
  weddingDate: '2025-06-15',
  status: 'active',
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
}

// Create chainable mock for Drizzle query builder
// Returns array by default (Drizzle select returns arrays)
const createDrizzleMock = (returnData: any[] = []) => {
  const chainMock: any = {
    select: jest.fn(() => chainMock),
    from: jest.fn(() => chainMock),
    where: jest.fn(() => chainMock),
    orderBy: jest.fn(() => chainMock),
    limit: jest.fn(() => chainMock),
    offset: jest.fn(() => chainMock),
    leftJoin: jest.fn(() => chainMock),
    innerJoin: jest.fn(() => chainMock),
    // Make it thenable for async/await - always returns array
    then: (resolve: (value: any) => void) => resolve(returnData),
  }
  return chainMock
}

// Create mock db object
const createMockDb = (returnData: any[] = []) => {
  const drizzleMock = createDrizzleMock(returnData)
  return {
    select: jest.fn(() => drizzleMock),
    insert: jest.fn(() => ({
      values: jest.fn(() => ({
        returning: jest.fn(() => Promise.resolve(returnData)),
      })),
    })),
    update: jest.fn(() => ({
      set: jest.fn(() => ({
        where: jest.fn(() => ({
          returning: jest.fn(() => Promise.resolve(returnData)),
        })),
      })),
    })),
    delete: jest.fn(() => ({
      where: jest.fn(() => Promise.resolve()),
    })),
    query: {
      clients: {
        findFirst: jest.fn(() => Promise.resolve(returnData[0] || null)),
        findMany: jest.fn(() => Promise.resolve(returnData)),
      },
    },
    transaction: jest.fn((fn) => fn(createMockDb(returnData))),
  }
}

type TestContext = {
  userId: string
  companyId: string | null
  role: string
  subscriptionTier: string
  db: ReturnType<typeof createMockDb>
}

// Helper to create test context
const createTestContext = (overrides: Partial<TestContext> = {}): TestContext => {
  return {
    userId: TEST_USER_ID,
    companyId: TEST_COMPANY_ID,
    role: 'company_admin',
    subscriptionTier: 'premium',
    db: createMockDb([mockClient]),
    ...overrides,
  }
}

describe('Clients Router', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('list', () => {
    it('fetches clients for the authenticated company', async () => {
      const mockClients = [mockClient]
      const ctx = createTestContext({ db: createMockDb(mockClients) })
      const caller = clientsRouter.createCaller(ctx as any)

      const result = await caller.list({ search: undefined })

      expect(result).toEqual(mockClients)
      expect(ctx.db.select).toHaveBeenCalled()
    })

    it('filters by search term', async () => {
      const ctx = createTestContext({ db: createMockDb([]) })
      const caller = clientsRouter.createCaller(ctx as any)

      const result = await caller.list({ search: 'Smith' })

      expect(result).toEqual([])
      expect(ctx.db.select).toHaveBeenCalled()
    })

    it('throws error when company_id is missing', async () => {
      const ctx = createTestContext({ companyId: null })
      const caller = clientsRouter.createCaller(ctx as any)

      await expect(caller.list({})).rejects.toThrow()
    })
  })

  describe('getById', () => {
    it('returns client when found', async () => {
      // getById uses destructuring: const [data] = await ctx.db.select()...
      const ctx = createTestContext({ db: createMockDb([mockClient]) })
      const caller = clientsRouter.createCaller(ctx as any)

      const result = await caller.getById({ id: TEST_CLIENT_ID })

      expect(result).toEqual(mockClient)
    })

    it('throws error for invalid UUID', async () => {
      const ctx = createTestContext()
      const caller = clientsRouter.createCaller(ctx as any)

      await expect(caller.getById({ id: 'invalid-uuid' })).rejects.toThrow()
    })

    it('throws NOT_FOUND error when client not found', async () => {
      // Empty array means no result found
      const ctx = createTestContext({ db: createMockDb([]) })
      const caller = clientsRouter.createCaller(ctx as any)

      await expect(caller.getById({ id: TEST_CLIENT_ID })).rejects.toThrow('Client not found')
    })
  })
})
