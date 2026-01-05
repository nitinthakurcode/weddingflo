import { render, RenderOptions, waitFor, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React, { ReactElement, ReactNode, createElement } from 'react'
import '@testing-library/jest-dom'

/**
 * Test Helper Utilities
 * @see TESTING_INFRASTRUCTURE_COMPLETE - Session 52
 */

// Create custom render with providers
export const renderWithProviders = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })

  function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }

  return render(ui, { wrapper: Wrapper, ...options })
}

// Wait for async operations
export const waitForLoadingToFinish = async () => {
  await waitFor(
    () => {
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument()
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
    },
    { timeout: 3000 }
  )
}

// Mock BetterAuth session (December 2025)
export const mockAuthSession = (overrides?: {
  userId?: string
  companyId?: string
  role?: string
  subscriptionTier?: string
}) => {
  return {
    userId: overrides?.userId || 'test-user-id',
    user: {
      id: overrides?.userId || 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      role: overrides?.role || 'company_admin',
      companyId: overrides?.companyId || 'test-company-id',
      subscriptionTier: overrides?.subscriptionTier || 'professional',
    },
  }
}

// Mock tRPC context
export const mockTRPCContext = (overrides?: {
  userId?: string
  companyId?: string
  role?: string
}) => {
  return {
    userId: overrides?.userId || 'test-user-id',
    companyId: overrides?.companyId || 'test-company-id',
    role: (overrides?.role as any) || 'company_admin',
    supabase: {} as any, // Mock Supabase client
  }
}

// Mock Supabase query builder
export const mockSupabaseQuery = (data: any = [], error: any = null) => {
  const query: any = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: data[0] || null, error }),
    maybeSingle: jest.fn().mockResolvedValue({ data: data[0] || null, error }),
  }

  // Make query chainable and return data/error at end
  Object.keys(query).forEach((key) => {
    if (key !== 'single' && key !== 'maybeSingle') {
      query[key].mockImplementation(() => {
        // Last call returns the data
        if (key === 'limit' || key === 'order') {
          return Promise.resolve({ data, error })
        }
        return query
      })
    }
  })

  return query
}

// Mock Supabase client
export const mockSupabaseClient = (tableData: Record<string, any[]> = {}) => {
  return {
    from: jest.fn((table: string) => {
      const data = tableData[table] || []
      return mockSupabaseQuery(data)
    }),
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn().mockResolvedValue({ data: { path: 'test.pdf' }, error: null }),
        download: jest.fn().mockResolvedValue({ data: new Blob(), error: null }),
        getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'https://example.com/test.pdf' } })),
      })),
    },
  }
}

// Wait for element to be removed
export const waitForElementToBeRemoved = async (element: HTMLElement) => {
  await waitFor(() => {
    expect(element).not.toBeInTheDocument()
  })
}

// Simulate delay
export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Mock console methods
export const mockConsole = () => {
  const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
  }

  const mocks = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  }

  beforeAll(() => {
    console.log = mocks.log
    console.error = mocks.error
    console.warn = mocks.warn
    console.info = mocks.info
  })

  afterAll(() => {
    console.log = originalConsole.log
    console.error = originalConsole.error
    console.warn = originalConsole.warn
    console.info = originalConsole.info
  })

  return mocks
}

// Create mock file
export const createMockFile = (name: string, size: number, type: string) => {
  const file = new File(['a'.repeat(size)], name, { type })
  return file
}

// Assert API call was made
export const expectAPICallMade = async (mockFn: jest.Mock, expectedArgs?: any) => {
  await waitFor(() => {
    expect(mockFn).toHaveBeenCalled()
    if (expectedArgs) {
      expect(mockFn).toHaveBeenCalledWith(expect.objectContaining(expectedArgs))
    }
  })
}

// Re-export commonly used testing library utilities
export { screen, waitFor, within, fireEvent } from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'
