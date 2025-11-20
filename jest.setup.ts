// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

type SuperJsonSerialized = {
  json: string
  meta: undefined
}

const mockSerialize = (value: unknown): SuperJsonSerialized => ({
  json: JSON.stringify(value),
  meta: undefined,
})

const mockDeserialize = (value: SuperJsonSerialized): unknown => JSON.parse(value.json)

// Mock superjson to avoid ESM import issues
jest.mock('superjson', () => {
  const superjsonMock = {
    serialize: mockSerialize,
    deserialize: mockDeserialize,
    stringify: JSON.stringify,
    parse: JSON.parse,
  }

  return {
    default: superjsonMock,
    ...superjsonMock,
  }
})

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      pathname: '/',
      query: {},
    }
  },
  useSearchParams() {
    return {
      get: jest.fn(),
    }
  },
  usePathname() {
    return '/'
  },
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock IntersectionObserver
class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null
  readonly rootMargin = ''
  readonly thresholds: ReadonlyArray<number> = []
  disconnect(): void {}
  observe(_target: Element): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return []
  }
  unobserve(_target: Element): void {}
}

global.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver

// Mock ResizeObserver
class MockResizeObserver implements ResizeObserver {
  disconnect(): void {}
  observe(_target: Element): void {}
  unobserve(_target: Element): void {}
}

global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver

// Mock Clerk (Session Claims architecture)
jest.mock('@clerk/nextjs', () => ({
  useAuth: () => ({
    userId: 'test-user-id',
    sessionId: 'test-session-id',
    isLoaded: true,
    isSignedIn: true,
  }),
  useUser: () => ({
    user: {
      id: 'test-user-id',
      publicMetadata: {
        company_id: 'test-company-id',
        role: 'company_admin',
        subscription_tier: 'premium',
      },
      firstName: 'Test',
      lastName: 'User',
      emailAddresses: [{ emailAddress: 'test@weddingflow.com' }],
    },
    isLoaded: true,
  }),
  auth: () => ({
    userId: 'test-user-id',
    sessionClaims: {
      metadata: {
        company_id: 'test-company-id',
        role: 'company_admin',
        subscription_tier: 'premium',
      },
    },
  }),
}))

// Mock @clerk/nextjs/server
jest.mock('@clerk/nextjs/server', () => ({
  auth: jest.fn(() => ({
    userId: 'test-user-id',
    sessionClaims: {
      metadata: {
        company_id: 'test-company-id',
        role: 'company_admin',
        subscription_tier: 'premium',
      },
    },
  })),
}))

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
          maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
        })),
        in: jest.fn(() => Promise.resolve({ data: [], error: null })),
        order: jest.fn(() => Promise.resolve({ data: [], error: null })),
        limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
    rpc: jest.fn(() => Promise.resolve({ data: null, error: null })),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(() => Promise.resolve({ data: { path: 'test.pdf' }, error: null })),
        download: jest.fn(() => Promise.resolve({ data: new Blob(), error: null })),
        getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'https://example.com/test.pdf' } })),
      })),
    },
  })),
}))

// Mock PostHog
jest.mock('posthog-js/react', () => ({
  PostHogProvider: ({ children }: { children: React.ReactNode }) => children,
  usePostHog: () => ({
    capture: jest.fn(),
    identify: jest.fn(),
    reset: jest.fn(),
  }),
}))

// Setup MSW
import { server } from './src/mocks/server'

beforeAll(() => {
  // Start MSW server
  server.listen({ onUnhandledRequest: 'warn' })
})

afterEach(() => {
  // Reset handlers after each test
  server.resetHandlers()
})

afterAll(() => {
  // Clean up after all tests
  server.close()
})

// Suppress console errors in tests
const originalError = console.error
const originalWarn = console.warn

beforeAll(() => {
  console.error = (...args: unknown[]) => {
    // Suppress known React warnings
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
        args[0].includes('Warning: useLayoutEffect') ||
        args[0].includes('Not implemented: HTMLFormElement.prototype.submit'))
    ) {
      return
    }
    originalError.call(console, ...args)
  }

  console.warn = (...args: unknown[]) => {
    // Suppress known warnings
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('componentWillReceiveProps') ||
        args[0].includes('componentWillMount'))
    ) {
      return
    }
    originalWarn.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
  console.warn = originalWarn
})
