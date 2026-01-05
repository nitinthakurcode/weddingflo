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

// Mock BetterAuth client hooks
jest.mock('@/lib/auth-client', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user-id',
      email: 'test@weddingflo.com',
      name: 'Test User',
      image: null,
      role: 'company_admin',
      companyId: 'test-company-id',
      firstName: 'Test',
      lastName: 'User',
    },
    session: {
      id: 'test-session-id',
      userId: 'test-user-id',
    },
    isAuthenticated: true,
    isLoading: false,
    error: null,
  }),
  useSession: () => ({
    data: {
      user: {
        id: 'test-user-id',
        email: 'test@weddingflo.com',
        name: 'Test User',
        role: 'company_admin',
        companyId: 'test-company-id',
      },
      session: {
        id: 'test-session-id',
      },
    },
    isPending: false,
    error: null,
  }),
  useUserRole: () => ({
    role: 'company_admin',
    isSuperAdmin: false,
    isCompanyAdmin: true,
    isStaff: false,
    isClientUser: false,
  }),
  signIn: {
    email: jest.fn(() => Promise.resolve({ error: null })),
    social: jest.fn(() => Promise.resolve({ error: null })),
  },
  signUp: {
    email: jest.fn(() => Promise.resolve({ error: null })),
  },
  signOut: jest.fn(() => Promise.resolve()),
  signInWithEmail: jest.fn(() => Promise.resolve({ error: null })),
  signUpWithEmail: jest.fn(() => Promise.resolve({ error: null })),
  signInWithGoogle: jest.fn(() => Promise.resolve({ error: null })),
  signOutAndRedirect: jest.fn(() => Promise.resolve()),
}))

// Mock BetterAuth server functions
jest.mock('@/lib/auth/server', () => ({
  getServerSession: jest.fn(() => Promise.resolve({
    userId: 'test-user-id',
    user: {
      id: 'test-user-id',
      email: 'test@weddingflo.com',
      name: 'Test User',
      role: 'company_admin',
      companyId: 'test-company-id',
    },
    session: {
      id: 'test-session-id',
    },
  })),
  requireAuth: jest.fn(() => Promise.resolve({
    userId: 'test-user-id',
    user: {
      id: 'test-user-id',
      email: 'test@weddingflo.com',
      name: 'Test User',
      role: 'company_admin',
      companyId: 'test-company-id',
    },
    session: {
      id: 'test-session-id',
    },
  })),
  hasRole: jest.fn(() => Promise.resolve(true)),
  getCompanyId: jest.fn(() => Promise.resolve('test-company-id')),
  isSuperAdmin: jest.fn(() => Promise.resolve(false)),
  isCompanyAdmin: jest.fn(() => Promise.resolve(true)),
}))

// Mock BetterAuth session helpers
jest.mock('@/lib/auth/session', () => ({
  getAuthSession: jest.fn(() => Promise.resolve({
    session: {
      userId: 'test-user-id',
      authId: 'test-user-id',
      role: 'company_admin',
      companyId: 'test-company-id',
      email: 'test@weddingflo.com',
      isRepaired: false,
    },
    error: null,
  })),
  requireAuthSession: jest.fn(() => Promise.resolve({
    userId: 'test-user-id',
    authId: 'test-user-id',
    role: 'company_admin',
    companyId: 'test-company-id',
    email: 'test@weddingflo.com',
    isRepaired: false,
  })),
  hasValidSession: jest.fn(() => Promise.resolve(true)),
  invalidateUserSessionCache: jest.fn(() => Promise.resolve()),
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
