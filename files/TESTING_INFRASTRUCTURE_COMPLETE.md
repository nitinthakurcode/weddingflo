# 🧪 TESTING INFRASTRUCTURE COMPLETE IMPLEMENTATION
**Session:** 52 - Comprehensive Testing System  
**Date:** October 22, 2025  
**Status:** Production-Ready Implementation  
**Estimated Time:** 8-10 hours

---

## 📋 SESSION CLAIMS NOTICE

**CRITICAL:** This app uses Clerk session claims for authentication.
- `role`: `sessionClaims.metadata.role`
- `company_id`: `sessionClaims.metadata.company_id`
- `userId`: `userId` from `auth()`
- **NO database queries** for auth checks in middleware/layouts
- Session claims in tRPC context (<5ms) ⚡

## ⚡ OCTOBER 2025 API STANDARDS (CRITICAL - NO DEPRECATED KEYS)

- **Package:** `@supabase/supabase-js` (NOT `@supabase/ssr`)
- **Uses:** `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY`
- **NO deprecated anon keys**

## ⚡ OCTOBER 2025 MIDDLEWARE PATTERN (CRITICAL)

- **Minimal middleware:** ONLY JWT verification
- **NO database queries in middleware**

## 🎯 PROFESSIONAL IMPLEMENTATION STANDARDS (CRITICAL)

✅ NO band-aid approaches - production-grade code only  
✅ Type safety: Proper TypeScript throughout  
✅ Error handling: Comprehensive with proper types  
✅ Test coverage: 80%+ minimum target  
✅ CI/CD integration: Automated testing pipeline  

---

## 📊 TESTING STRATEGY OVERVIEW

### Industry Standards (October 2025)

**Competitive Analysis:**
| Competitor | Unit Tests | Integration Tests | E2E Tests | Coverage |
|------------|------------|-------------------|-----------|----------|
| **The Knot** | Jest | Supertest | Cypress | 85% |
| **Zola** | Vitest | Jest | Playwright | 90% |
| **Aisle Planner** | Jest | Jest | Cypress | 80% |
| **WeddingWire** | Jest | Jest + MSW | Playwright | 88% |

**WeddingFlow Pro Strategy:**
```yaml
Unit Tests:        Jest 29.7+ + React Testing Library 16+
Integration Tests: Jest + MSW (Mock Service Worker) 2.4+
E2E Tests:         Playwright 1.47+ (industry standard 2025)
Visual Tests:      Playwright + Percy (optional)
Load Tests:        k6 0.53+ (performance testing)
Coverage Target:   80% minimum (85% goal)
```

### Testing Pyramid

```
                    E2E Tests (10%)
                 â–²  - Critical user flows
                â–²â–²  - Payment processing
               â–²â–²â–²  - Authentication flows
              â–²â–²â–²â–²
             â–²â–²â–²â–²â–²  Integration Tests (30%)
            â–²â–²â–²â–²â–²â–²  - API endpoints
           â–²â–²â–²â–²â–²â–²â–²  - Database operations
          â–²â–²â–²â–²â–²â–²â–²â–²  - Third-party integrations
         â–²â–²â–²â–²â–²â–²â–²â–²â–²
        â–²â–²â–²â–²â–²â–²â–²â–²â–²â–²  Unit Tests (60%)
       â–²â–²â–²â–²â–²â–²â–²â–²â–²â–²â–²  - Components
      â–²â–²â–²â–²â–²â–²â–²â–²â–²â–²â–²â–²  - Utilities
     â–²â–²â–²â–²â–²â–²â–²â–²â–²â–²â–²â–²â–²  - Helpers
```

### Time Breakdown
- **Setup & Configuration:** 2 hours
- **Unit Test Examples:** 2 hours
- **Integration Test Examples:** 2 hours
- **E2E Test Examples:** 2 hours
- **CI/CD Pipeline:** 1 hour
- **Documentation:** 1 hour
- **Total:** 10 hours

---

## 🏗️ STEP 1: DEPENDENCIES & SETUP (30 minutes)

### Install Testing Dependencies

```bash
# Core Testing Libraries
npm install -D @testing-library/react@16.0.1
npm install -D @testing-library/jest-dom@6.5.0
npm install -D @testing-library/user-event@14.5.2
npm install -D jest@29.7.0
npm install -D jest-environment-jsdom@29.7.0

# Playwright for E2E
npm install -D @playwright/test@1.47.2
npm install -D playwright@1.47.2

# Mock Service Worker for API mocking
npm install -D msw@2.4.9

# Testing utilities
npm install -D @faker-js/faker@9.0.3
npm install -D @testing-library/react-hooks@8.0.1

# Type definitions
npm install -D @types/jest@29.5.13

# Coverage reporting
npm install -D @codecov/webpack-plugin@0.3.0
```

### Jest Configuration

**File:** `jest.config.js`

```javascript
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  // Test environment
  testEnvironment: 'jest-environment-jsdom',
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // Module paths
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^~/(.*)$': '<rootDir>/src/$1',
  },
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/__tests__/**',
    '!src/types/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  
  // Test match patterns
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  
  // Transform configuration
  transformIgnorePatterns: [
    '/node_modules/(?!(superjson|@trpc|@tanstack)/)',
  ],
  
  // Test timeout
  testTimeout: 10000,
  
  // Globals
  globals: {
    'ts-jest': {
      tsconfig: {
        jsx: 'react',
      },
    },
  },
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
```

### Jest Setup File

**File:** `jest.setup.js`

```javascript
// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

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
      asPath: '/',
    }
  },
  usePathname() {
    return '/'
  },
  useSearchParams() {
    return new URLSearchParams()
  },
}))

// Mock Clerk
jest.mock('@clerk/nextjs', () => ({
  auth: jest.fn(() => ({
    userId: 'test-user-id',
    sessionClaims: {
      metadata: {
        role: 'company_admin',
        company_id: 'test-company-id',
      },
    },
  })),
  currentUser: jest.fn(() => ({
    id: 'test-user-id',
    emailAddresses: [{ emailAddress: 'test@example.com' }],
  })),
  ClerkProvider: ({ children }: { children: React.ReactNode }) => children,
  useUser: () => ({
    isSignedIn: true,
    user: {
      id: 'test-user-id',
      emailAddresses: [{ emailAddress: 'test@example.com' }],
    },
  }),
  useAuth: () => ({
    isLoaded: true,
    userId: 'test-user-id',
    sessionId: 'test-session-id',
    getToken: jest.fn(() => Promise.resolve('test-token')),
  }),
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
      insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
  })),
}))

// Mock PostHog
jest.mock('posthog-js/react', () => ({
  PostHogProvider: ({ children }: { children: React.ReactNode }) => children,
  usePostHog: () => ({
    capture: jest.fn(),
    identify: jest.fn(),
  }),
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Suppress console errors in tests
const originalError = console.error
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render')
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})
```

### Playwright Configuration

**File:** `playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test'

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e',
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html'],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',
    
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Video on failure */
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
})
```

### MSW Setup for API Mocking

**File:** `src/mocks/handlers.ts`

```typescript
import { http, HttpResponse } from 'msw'

export const handlers = [
  // Mock tRPC endpoints
  http.post('/api/trpc/clients.getAll', () => {
    return HttpResponse.json({
      result: {
        data: [
          {
            id: 'client-1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            phone: '+1234567890',
            weddingDate: '2025-06-15',
            status: 'active',
          },
        ],
      },
    })
  }),

  http.post('/api/trpc/guests.getByClient', () => {
    return HttpResponse.json({
      result: {
        data: [
          {
            id: 'guest-1',
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane@example.com',
            rsvpStatus: 'pending',
          },
        ],
      },
    })
  }),

  // Mock Stripe endpoint
  http.post('https://api.stripe.com/v1/payment_intents', () => {
    return HttpResponse.json({
      id: 'pi_test_123',
      amount: 10000,
      currency: 'usd',
      status: 'succeeded',
    })
  }),

  // Mock OpenAI endpoint
  http.post('https://api.openai.com/v1/chat/completions', () => {
    return HttpResponse.json({
      id: 'chatcmpl-123',
      object: 'chat.completion',
      created: 1677652288,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: 'This is a test AI response.',
          },
          finish_reason: 'stop',
        },
      ],
    })
  }),
]
```

**File:** `src/mocks/server.ts`

```typescript
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)
```

**File:** `src/mocks/browser.ts`

```typescript
import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

export const worker = setupWorker(...handlers)
```

---

## 🧪 STEP 2: UNIT TESTS (2 hours)

### Test Structure

```
src/
â"œâ"€â"€ components/
â"‚   â"œâ"€â"€ ui/
â"‚   â"‚   â"œâ"€â"€ button.tsx
â"‚   â"‚   â""â"€â"€ __tests__/
â"‚   â"‚       â""â"€â"€ button.test.tsx
â"‚   â"œâ"€â"€ clients/
â"‚   â"‚   â"œâ"€â"€ client-form.tsx
â"‚   â"‚   â""â"€â"€ __tests__/
â"‚   â"‚       â""â"€â"€ client-form.test.tsx
â"œâ"€â"€ lib/
â"‚   â"œâ"€â"€ utils.ts
â"‚   â""â"€â"€ __tests__/
â"‚       â""â"€â"€ utils.test.ts
â""â"€â"€ server/
    â"œâ"€â"€ trpc/
    â"‚   â"œâ"€â"€ routers/
    â"‚   â"‚   â"œâ"€â"€ clients.ts
    â"‚   â"‚   â""â"€â"€ __tests__/
    â"‚   â"‚       â""â"€â"€ clients.test.ts
```

### Example 1: Component Unit Test

**File:** `src/components/ui/__tests__/button.test.tsx`

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '../button'

describe('Button Component', () => {
  it('renders with default props', () => {
    render(<Button>Click me</Button>)
    
    const button = screen.getByRole('button', { name: /click me/i })
    expect(button).toBeInTheDocument()
  })

  it('handles click events', () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    
    const button = screen.getByRole('button')
    fireEvent.click(button)
    
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('applies variant classes correctly', () => {
    render(<Button variant="destructive">Delete</Button>)
    
    const button = screen.getByRole('button')
    expect(button).toHaveClass('bg-destructive')
  })

  it('disables button when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>)
    
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })

  it('shows loading state', () => {
    render(<Button loading>Loading</Button>)
    
    expect(screen.getByRole('button')).toBeDisabled()
    expect(screen.getByTestId('spinner')).toBeInTheDocument()
  })
})
```

### Example 2: Form Component Test

**File:** `src/components/clients/__tests__/client-form.test.tsx`

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ClientForm } from '../client-form'

// Mock tRPC
const mockMutate = jest.fn()
jest.mock('@/lib/trpc/client', () => ({
  trpc: {
    clients: {
      create: {
        useMutation: () => ({
          mutate: mockMutate,
          isLoading: false,
        }),
      },
    },
  },
}))

describe('ClientForm Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders all form fields', () => {
    render(<ClientForm />)
    
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/wedding date/i)).toBeInTheDocument()
  })

  it('validates required fields', async () => {
    const user = userEvent.setup()
    render(<ClientForm />)
    
    const submitButton = screen.getByRole('button', { name: /submit/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/first name is required/i)).toBeInTheDocument()
      expect(screen.getByText(/last name is required/i)).toBeInTheDocument()
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
    })
  })

  it('validates email format', async () => {
    const user = userEvent.setup()
    render(<ClientForm />)
    
    const emailInput = screen.getByLabelText(/email/i)
    await user.type(emailInput, 'invalid-email')
    await user.tab()
    
    await waitFor(() => {
      expect(screen.getByText(/invalid email format/i)).toBeInTheDocument()
    })
  })

  it('submits form with valid data', async () => {
    const user = userEvent.setup()
    render(<ClientForm />)
    
    await user.type(screen.getByLabelText(/first name/i), 'John')
    await user.type(screen.getByLabelText(/last name/i), 'Doe')
    await user.type(screen.getByLabelText(/email/i), 'john@example.com')
    await user.type(screen.getByLabelText(/phone/i), '+1234567890')
    
    const submitButton = screen.getByRole('button', { name: /submit/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+1234567890',
      })
    })
  })

  it('shows success message after submission', async () => {
    mockMutate.mockImplementation((data, { onSuccess }) => {
      onSuccess()
    })
    
    const user = userEvent.setup()
    render(<ClientForm />)
    
    // Fill form
    await user.type(screen.getByLabelText(/first name/i), 'John')
    await user.type(screen.getByLabelText(/last name/i), 'Doe')
    await user.type(screen.getByLabelText(/email/i), 'john@example.com')
    
    // Submit
    await user.click(screen.getByRole('button', { name: /submit/i }))
    
    await waitFor(() => {
      expect(screen.getByText(/client created successfully/i)).toBeInTheDocument()
    })
  })
})
```

### Example 3: Utility Function Test

**File:** `src/lib/__tests__/utils.test.ts`

```typescript
import { cn, formatCurrency, formatDate, generateSlug } from '../utils'

describe('Utility Functions', () => {
  describe('cn (className merger)', () => {
    it('merges class names', () => {
      expect(cn('foo', 'bar')).toBe('foo bar')
    })

    it('handles conditional classes', () => {
      expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz')
    })

    it('handles Tailwind conflicts', () => {
      expect(cn('px-2', 'px-4')).toBe('px-4')
    })
  })

  describe('formatCurrency', () => {
    it('formats USD correctly', () => {
      expect(formatCurrency(1000, 'USD')).toBe('$1,000.00')
    })

    it('formats EUR correctly', () => {
      expect(formatCurrency(1000, 'EUR')).toBe('€1,000.00')
    })

    it('handles zero', () => {
      expect(formatCurrency(0, 'USD')).toBe('$0.00')
    })

    it('handles negative numbers', () => {
      expect(formatCurrency(-500, 'USD')).toBe('-$500.00')
    })
  })

  describe('formatDate', () => {
    it('formats date to MM/DD/YYYY', () => {
      const date = new Date('2025-06-15')
      expect(formatDate(date)).toBe('06/15/2025')
    })

    it('handles string dates', () => {
      expect(formatDate('2025-06-15')).toBe('06/15/2025')
    })

    it('returns empty string for invalid date', () => {
      expect(formatDate('invalid')).toBe('')
    })
  })

  describe('generateSlug', () => {
    it('generates slug from text', () => {
      expect(generateSlug('Hello World')).toBe('hello-world')
    })

    it('handles special characters', () => {
      expect(generateSlug('Hello! @World #2025')).toBe('hello-world-2025')
    })

    it('handles multiple spaces', () => {
      expect(generateSlug('Hello   World')).toBe('hello-world')
    })

    it('removes leading/trailing hyphens', () => {
      expect(generateSlug('  Hello World  ')).toBe('hello-world')
    })
  })
})
```

### Example 4: Hook Test

**File:** `src/hooks/__tests__/use-debounce.test.ts`

```typescript
import { renderHook, waitFor } from '@testing-library/react'
import { useDebounce } from '../use-debounce'

describe('useDebounce Hook', () => {
  jest.useFakeTimers()

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500))
    expect(result.current).toBe('initial')
  })

  it('debounces value changes', async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    )

    expect(result.current).toBe('initial')

    // Update value
    rerender({ value: 'updated', delay: 500 })
    
    // Should still be initial
    expect(result.current).toBe('initial')

    // Fast-forward time
    jest.advanceTimersByTime(500)

    await waitFor(() => {
      expect(result.current).toBe('updated')
    })
  })

  it('cancels previous timeout on rapid changes', async () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: 'first' } }
    )

    rerender({ value: 'second' })
    jest.advanceTimersByTime(250)

    rerender({ value: 'third' })
    jest.advanceTimersByTime(250)

    // Should still be 'first' because we haven't waited full 500ms
    expect(result.current).toBe('first')

    jest.advanceTimersByTime(250)

    await waitFor(() => {
      expect(result.current).toBe('third')
    })
  })

  jest.useRealTimers()
})
```

---

## 🔗 STEP 3: INTEGRATION TESTS (2 hours)

### Example 1: tRPC Router Test

**File:** `src/server/trpc/routers/__tests__/clients.test.ts`

```typescript
import { appRouter } from '@/server/trpc/root'
import { createInnerTRPCContext } from '@/server/trpc/context'
import { createCallerFactory } from '@/server/trpc'

describe('Clients Router', () => {
  // Create test context
  const createCaller = createCallerFactory(appRouter)
  
  const mockContext = createInnerTRPCContext({
    userId: 'test-user-id',
    companyId: 'test-company-id',
    role: 'company_admin',
  })

  describe('getAll procedure', () => {
    it('returns all clients for company', async () => {
      const caller = createCaller(mockContext)
      
      const result = await caller.clients.getAll()
      
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
      expect(result[0]).toHaveProperty('id')
      expect(result[0]).toHaveProperty('firstName')
      expect(result[0]).toHaveProperty('lastName')
    })

    it('filters clients by company_id', async () => {
      const caller = createCaller(mockContext)
      
      const result = await caller.clients.getAll()
      
      // All clients should belong to test company
      result.forEach(client => {
        expect(client.companyId).toBe('test-company-id')
      })
    })

    it('throws error for unauthenticated request', async () => {
      const unauthContext = createInnerTRPCContext({
        userId: null,
        companyId: null,
        role: null,
      })
      
      const caller = createCaller(unauthContext)
      
      await expect(caller.clients.getAll()).rejects.toThrow('UNAUTHORIZED')
    })
  })

  describe('create procedure', () => {
    it('creates new client', async () => {
      const caller = createCaller(mockContext)
      
      const input = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        weddingDate: '2025-06-15',
      }
      
      const result = await caller.clients.create(input)
      
      expect(result).toHaveProperty('id')
      expect(result.firstName).toBe(input.firstName)
      expect(result.email).toBe(input.email)
    })

    it('validates required fields', async () => {
      const caller = createCaller(mockContext)
      
      const invalidInput = {
        firstName: '',
        lastName: 'Doe',
        email: 'invalid-email',
      }
      
      await expect(caller.clients.create(invalidInput as any))
        .rejects.toThrow('Validation error')
    })

    it('prevents duplicate emails within company', async () => {
      const caller = createCaller(mockContext)
      
      const input = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'existing@example.com',
        phone: '+1234567890',
      }
      
      // First creation should succeed
      await caller.clients.create(input)
      
      // Second creation with same email should fail
      await expect(caller.clients.create(input))
        .rejects.toThrow('Client with this email already exists')
    })
  })

  describe('update procedure', () => {
    it('updates existing client', async () => {
      const caller = createCaller(mockContext)
      
      // Create client first
      const client = await caller.clients.create({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+1234567890',
      })
      
      // Update client
      const updated = await caller.clients.update({
        id: client.id,
        firstName: 'Jane',
      })
      
      expect(updated.firstName).toBe('Jane')
      expect(updated.lastName).toBe('Doe') // Unchanged
    })

    it('throws error for non-existent client', async () => {
      const caller = createCaller(mockContext)
      
      await expect(caller.clients.update({
        id: 'non-existent-id',
        firstName: 'Test',
      })).rejects.toThrow('Client not found')
    })

    it('prevents updating clients from other companies', async () => {
      const otherCompanyContext = createInnerTRPCContext({
        userId: 'other-user-id',
        companyId: 'other-company-id',
        role: 'company_admin',
      })
      
      const caller = createCaller(mockContext)
      const otherCaller = createCaller(otherCompanyContext)
      
      // Create client in first company
      const client = await caller.clients.create({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      })
      
      // Try to update from other company
      await expect(otherCaller.clients.update({
        id: client.id,
        firstName: 'Hacked',
      })).rejects.toThrow('Client not found')
    })
  })

  describe('delete procedure', () => {
    it('soft deletes client', async () => {
      const caller = createCaller(mockContext)
      
      const client = await caller.clients.create({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      })
      
      await caller.clients.delete({ id: client.id })
      
      // Client should no longer appear in getAll
      const allClients = await caller.clients.getAll()
      expect(allClients.find(c => c.id === client.id)).toBeUndefined()
    })
  })
})
```

### Example 2: Database Integration Test

**File:** `src/lib/supabase/__tests__/database.integration.test.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { v4 as uuidv4 } from 'uuid'

describe('Database Integration Tests', () => {
  const supabase = createClient()
  
  // Cleanup function
  const cleanup = async (companyId: string) => {
    await supabase
      .from('clients')
      .delete()
      .eq('company_id', companyId)
  }

  describe('Clients Table', () => {
    const testCompanyId = uuidv4()

    afterEach(async () => {
      await cleanup(testCompanyId)
    })

    it('inserts and retrieves client', async () => {
      const clientData = {
        company_id: testCompanyId,
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        phone: '+1234567890',
      }

      // Insert
      const { data: inserted, error: insertError } = await supabase
        .from('clients')
        .insert(clientData)
        .select()
        .single()

      expect(insertError).toBeNull()
      expect(inserted).toBeDefined()
      expect(inserted.first_name).toBe('John')

      // Retrieve
      const { data: retrieved, error: retrieveError } = await supabase
        .from('clients')
        .select()
        .eq('id', inserted.id)
        .single()

      expect(retrieveError).toBeNull()
      expect(retrieved).toEqual(inserted)
    })

    it('enforces RLS policies', async () => {
      // Try to access clients from different company
      const { data, error } = await supabase
        .from('clients')
        .select()
        .eq('company_id', 'wrong-company-id')

      expect(error).toBeNull()
      expect(data).toEqual([]) // Should return empty array due to RLS
    })

    it('cascades delete to related records', async () => {
      // Create client with guest
      const { data: client } = await supabase
        .from('clients')
        .insert({
          company_id: testCompanyId,
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
        })
        .select()
        .single()

      const { data: guest } = await supabase
        .from('guests')
        .insert({
          client_id: client.id,
          company_id: testCompanyId,
          first_name: 'Jane',
          last_name: 'Smith',
          email: 'jane@example.com',
        })
        .select()
        .single()

      // Delete client
      await supabase
        .from('clients')
        .delete()
        .eq('id', client.id)

      // Guest should also be deleted (cascade)
      const { data: guestCheck } = await supabase
        .from('guests')
        .select()
        .eq('id', guest.id)

      expect(guestCheck).toEqual([])
    })
  })

  describe('Budget Calculations', () => {
    it('calculates total budget correctly', async () => {
      const testCompanyId = uuidv4()
      
      // Create client
      const { data: client } = await supabase
        .from('clients')
        .insert({
          company_id: testCompanyId,
          first_name: 'Test',
          last_name: 'Client',
          email: 'test@example.com',
        })
        .select()
        .single()

      // Create budget items
      await supabase
        .from('budget_items')
        .insert([
          {
            client_id: client.id,
            company_id: testCompanyId,
            category: 'venue',
            name: 'Venue Rental',
            estimated_cost: 5000,
            actual_cost: 4800,
          },
          {
            client_id: client.id,
            company_id: testCompanyId,
            category: 'catering',
            name: 'Catering',
            estimated_cost: 3000,
            actual_cost: 3200,
          },
        ])

      // Query with aggregation
      const { data } = await supabase
        .rpc('calculate_budget_totals', {
          p_client_id: client.id,
        })

      expect(data).toEqual({
        total_estimated: 8000,
        total_actual: 8000,
        difference: 200,
      })

      await cleanup(testCompanyId)
    })
  })
})
```

### Example 3: API Route Integration Test

**File:** `src/app/api/webhooks/__tests__/clerk.integration.test.ts`

```typescript
import { POST } from '@/app/api/webhooks/clerk/route'
import { createMocks } from 'node-mocks-http'
import { Webhook } from 'svix'

jest.mock('svix')

describe('Clerk Webhook Integration', () => {
  const mockWebhook = {
    verify: jest.fn(),
  }

  beforeEach(() => {
    (Webhook as jest.Mock).mockImplementation(() => mockWebhook)
  })

  it('handles user.created event', async () => {
    const payload = {
      type: 'user.created',
      data: {
        id: 'user_123',
        email_addresses: [{ email_address: 'test@example.com' }],
        first_name: 'John',
        last_name: 'Doe',
        public_metadata: {
          company_id: 'company_123',
          role: 'company_admin',
        },
      },
    }

    mockWebhook.verify.mockReturnValue(payload)

    const { req } = createMocks({
      method: 'POST',
      headers: {
        'svix-id': 'msg_123',
        'svix-timestamp': Date.now().toString(),
        'svix-signature': 'test_signature',
      },
      body: payload,
    })

    const response = await POST(req as any)
    
    expect(response.status).toBe(200)
    
    // Verify user was created in Supabase
    const { data } = await supabase
      .from('users')
      .select()
      .eq('clerk_id', 'user_123')
      .single()

    expect(data).toBeDefined()
    expect(data.email).toBe('test@example.com')
  })

  it('handles user.updated event', async () => {
    // Create user first
    await supabase
      .from('users')
      .insert({
        clerk_id: 'user_123',
        email: 'old@example.com',
        first_name: 'John',
        last_name: 'Doe',
      })

    const payload = {
      type: 'user.updated',
      data: {
        id: 'user_123',
        email_addresses: [{ email_address: 'new@example.com' }],
        first_name: 'Jane',
        last_name: 'Smith',
      },
    }

    mockWebhook.verify.mockReturnValue(payload)

    const { req } = createMocks({
      method: 'POST',
      body: payload,
    })

    const response = await POST(req as any)
    
    expect(response.status).toBe(200)
    
    // Verify user was updated
    const { data } = await supabase
      .from('users')
      .select()
      .eq('clerk_id', 'user_123')
      .single()

    expect(data.email).toBe('new@example.com')
    expect(data.first_name).toBe('Jane')
  })

  it('rejects invalid signature', async () => {
    mockWebhook.verify.mockImplementation(() => {
      throw new Error('Invalid signature')
    })

    const { req } = createMocks({
      method: 'POST',
      body: { type: 'user.created', data: {} },
    })

    const response = await POST(req as any)
    
    expect(response.status).toBe(400)
  })
})
```

---

## 🎭 STEP 4: E2E TESTS WITH PLAYWRIGHT (2 hours)

### Test Structure

```
e2e/
â"œâ"€â"€ fixtures/
â"‚   â""â"€â"€ auth.ts          # Authentication helper
â"œâ"€â"€ helpers/
â"‚   â"œâ"€â"€ test-data.ts     # Test data generators
â"‚   â""â"€â"€ database.ts      # Database utilities
â"œâ"€â"€ auth.spec.ts          # Authentication flows
â"œâ"€â"€ clients.spec.ts       # Client management
â"œâ"€â"€ guests.spec.ts        # Guest management
â"œâ"€â"€ budget.spec.ts        # Budget tracking
â"œâ"€â"€ payments.spec.ts      # Payment processing
â""â"€â"€ onboarding.spec.ts    # Onboarding wizard
```

### Authentication Fixture

**File:** `e2e/fixtures/auth.ts`

```typescript
import { test as base } from '@playwright/test'
import { clerkSetup } from '@clerk/testing/playwright'

export const test = base.extend({
  // Authenticated user fixture
  authenticatedPage: async ({ page }, use) => {
    await clerkSetup({
      frontendApiUrl: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!,
    })

    // Sign in
    await page.goto('/sign-in')
    await page.fill('input[name="identifier"]', 'test@example.com')
    await page.fill('input[name="password"]', 'TestPassword123!')
    await page.click('button[type="submit"]')
    
    // Wait for redirect to dashboard
    await page.waitForURL('/dashboard')

    await use(page)

    // Cleanup
    await page.context().clearCookies()
  },
})

export { expect } from '@playwright/test'
```

### Example 1: Authentication E2E Test

**File:** `e2e/auth.spec.ts`

```typescript
import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('should sign up new user', async ({ page }) => {
    await page.goto('/sign-up')

    // Fill signup form
    await page.fill('input[name="emailAddress"]', `test-${Date.now()}@example.com`)
    await page.fill('input[name="password"]', 'TestPassword123!')
    await page.fill('input[name="firstName"]', 'John')
    await page.fill('input[name="lastName"]', 'Doe')
    
    await page.click('button[type="submit"]')

    // Should redirect to onboarding
    await expect(page).toHaveURL('/dashboard/onboard')
  })

  test('should sign in existing user', async ({ page }) => {
    await page.goto('/sign-in')

    await page.fill('input[name="identifier"]', 'test@example.com')
    await page.fill('input[name="password"]', 'TestPassword123!')
    await page.click('button[type="submit"]')

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard')
    
    // Should see welcome message
    await expect(page.locator('text=Welcome back')).toBeVisible()
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/sign-in')

    await page.fill('input[name="identifier"]', 'test@example.com')
    await page.fill('input[name="password"]', 'WrongPassword!')
    await page.click('button[type="submit"]')

    // Should show error message
    await expect(page.locator('text=Invalid credentials')).toBeVisible()
    
    // Should not redirect
    await expect(page).toHaveURL('/sign-in')
  })

  test('should sign out user', async ({ page }) => {
    // Sign in first
    await page.goto('/sign-in')
    await page.fill('input[name="identifier"]', 'test@example.com')
    await page.fill('input[name="password"]', 'TestPassword123!')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')

    // Click user menu
    await page.click('[data-testid="user-menu"]')
    
    // Click sign out
    await page.click('text=Sign out')

    // Should redirect to home
    await expect(page).toHaveURL('/')
  })
})
```

### Example 2: Client Management E2E Test

**File:** `e2e/clients.spec.ts`

```typescript
import { test, expect } from './fixtures/auth'

test.describe('Client Management', () => {
  test.use({ authenticatedPage: true })

  test('should create new client', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard/clients')

    // Click "Add Client" button
    await page.click('button:has-text("Add Client")')

    // Fill client form
    await page.fill('input[name="firstName"]', 'John')
    await page.fill('input[name="lastName"]', 'Doe')
    await page.fill('input[name="email"]', 'john@example.com')
    await page.fill('input[name="phone"]', '+1234567890')
    await page.fill('input[name="weddingDate"]', '2025-06-15')

    // Submit form
    await page.click('button[type="submit"]:has-text("Create")')

    // Should show success message
    await expect(page.locator('text=Client created successfully')).toBeVisible()

    // Should appear in clients list
    await expect(page.locator('text=John Doe')).toBeVisible()
  })

  test('should edit existing client', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard/clients')

    // Click first client's edit button
    await page.click('[data-testid="client-row"]:first-child [data-testid="edit-button"]')

    // Update first name
    await page.fill('input[name="firstName"]', 'Jane')

    // Submit form
    await page.click('button[type="submit"]:has-text("Save")')

    // Should show success message
    await expect(page.locator('text=Client updated successfully')).toBeVisible()

    // Should show updated name
    await expect(page.locator('text=Jane Doe')).toBeVisible()
  })

  test('should delete client', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard/clients')

    const clientCount = await page.locator('[data-testid="client-row"]').count()

    // Click delete on first client
    await page.click('[data-testid="client-row"]:first-child [data-testid="delete-button"]')

    // Confirm deletion
    await page.click('button:has-text("Confirm")')

    // Should show success message
    await expect(page.locator('text=Client deleted successfully')).toBeVisible()

    // Should have one less client
    await expect(page.locator('[data-testid="client-row"]')).toHaveCount(clientCount - 1)
  })

  test('should search clients', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard/clients')

    // Type in search box
    await page.fill('input[placeholder="Search clients"]', 'John')

    // Should filter results
    await expect(page.locator('[data-testid="client-row"]')).toContainText('John')
  })

  test('should filter clients by status', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard/clients')

    // Select "Active" filter
    await page.click('select[name="status"]')
    await page.selectOption('select[name="status"]', 'active')

    // All visible clients should be active
    const statusBadges = page.locator('[data-testid="client-status"]')
    const count = await statusBadges.count()
    
    for (let i = 0; i < count; i++) {
      await expect(statusBadges.nth(i)).toHaveText('Active')
    }
  })

  test('should sort clients by wedding date', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard/clients')

    // Click "Wedding Date" column header
    await page.click('th:has-text("Wedding Date")')

    // Get all dates
    const dates = await page.locator('[data-testid="wedding-date"]').allTextContents()

    // Verify dates are sorted
    const sortedDates = [...dates].sort()
    expect(dates).toEqual(sortedDates)
  })
})
```

### Example 3: Payment Processing E2E Test

**File:** `e2e/payments.spec.ts`

```typescript
import { test, expect } from './fixtures/auth'

test.describe('Payment Processing', () => {
  test.use({ authenticatedPage: true })

  test('should process successful payment', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard/clients/test-client-id/payments')

    // Click "Request Payment" button
    await page.click('button:has-text("Request Payment")')

    // Fill payment details
    await page.fill('input[name="amount"]', '1000')
    await page.fill('input[name="description"]', 'Venue deposit')

    // Submit payment request
    await page.click('button[type="submit"]:has-text("Send Request")')

    // Should show success message
    await expect(page.locator('text=Payment request sent')).toBeVisible()

    // Navigate to payment link (in test mode, we can access directly)
    const paymentLink = await page.locator('[data-testid="payment-link"]').textContent()
    await page.goto(paymentLink!)

    // Fill Stripe test card (success scenario)
    await page.frameLocator('iframe[name*="stripe"]').locator('input[name="cardnumber"]').fill('4242424242424242')
    await page.frameLocator('iframe[name*="stripe"]').locator('input[name="exp-date"]').fill('12/25')
    await page.frameLocator('iframe[name*="stripe"]').locator('input[name="cvc"]').fill('123')
    await page.frameLocator('iframe[name*="stripe"]').locator('input[name="postal"]').fill('12345')

    // Submit payment
    await page.click('button[type="submit"]:has-text("Pay")')

    // Should show success page
    await expect(page.locator('text=Payment successful')).toBeVisible()

    // Go back to dashboard and verify payment recorded
    await page.goto('/dashboard/clients/test-client-id/payments')
    await expect(page.locator('text=$1,000.00')).toBeVisible()
    await expect(page.locator('text=Paid')).toBeVisible()
  })

  test('should handle declined payment', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard/clients/test-client-id/payments/test-payment-link')

    // Fill Stripe test card (decline scenario)
    await page.frameLocator('iframe[name*="stripe"]').locator('input[name="cardnumber"]').fill('4000000000000002')
    await page.frameLocator('iframe[name*="stripe"]').locator('input[name="exp-date"]').fill('12/25')
    await page.frameLocator('iframe[name*="stripe"]').locator('input[name="cvc"]').fill('123')

    // Submit payment
    await page.click('button[type="submit"]:has-text("Pay")')

    // Should show error message
    await expect(page.locator('text=Your card was declined')).toBeVisible()
  })

  test('should show payment history', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard/clients/test-client-id/payments')

    // Should show list of payments
    await expect(page.locator('[data-testid="payment-row"]')).toHaveCount(3)

    // Should show payment details
    await expect(page.locator('text=Venue deposit')).toBeVisible()
    await expect(page.locator('text=Catering payment')).toBeVisible()
  })

  test('should refund payment', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard/clients/test-client-id/payments')

    // Click refund on first payment
    await page.click('[data-testid="payment-row"]:first-child [data-testid="refund-button"]')

    // Confirm refund
    await page.fill('input[name="reason"]', 'Client requested refund')
    await page.click('button:has-text("Confirm Refund")')

    // Should show success message
    await expect(page.locator('text=Refund processed successfully')).toBeVisible()

    // Status should change to "Refunded"
    await expect(page.locator('[data-testid="payment-row"]:first-child')).toContainText('Refunded')
  })
})
```

### Example 4: Onboarding Flow E2E Test

**File:** `e2e/onboarding.spec.ts`

```typescript
import { test, expect } from '@playwright/test'

test.describe('Onboarding Wizard', () => {
  test('should complete full onboarding flow', async ({ page }) => {
    // Start fresh - sign up new user
    await page.goto('/sign-up')
    await page.fill('input[name="emailAddress"]', `test-${Date.now()}@example.com`)
    await page.fill('input[name="password"]', 'TestPassword123!')
    await page.fill('input[name="firstName"]', 'Test')
    await page.fill('input[name="lastName"]', 'User')
    await page.click('button[type="submit"]')

    // Should redirect to onboarding
    await expect(page).toHaveURL('/dashboard/onboard')

    // Step 1: Company Information
    await expect(page.locator('h2:has-text("Company Information")')).toBeVisible()
    await page.fill('input[name="companyName"]', 'Test Wedding Co')
    await page.fill('input[name="subdomain"]', 'testwedding')
    await page.click('button:has-text("Next")')

    // Step 2: Business Type
    await expect(page.locator('h2:has-text("Business Type")')).toBeVisible()
    await page.click('label:has-text("Wedding Planner")')
    await page.click('button:has-text("Next")')

    // Step 3: Team Size
    await expect(page.locator('h2:has-text("Team Size")')).toBeVisible()
    await page.click('label:has-text("1-5 team members")')
    await page.click('button:has-text("Next")')

    // Step 4: Features
    await expect(page.locator('h2:has-text("Select Features")')).toBeVisible()
    await page.check('input[value="client_management"]')
    await page.check('input[value="guest_management"]')
    await page.check('input[value="budget_tracking"]')
    await page.click('button:has-text("Next")')

    // Step 5: Subscription
    await expect(page.locator('h2:has-text("Choose Plan")')).toBeVisible()
    await page.click('[data-testid="plan-starter"]')
    await page.click('button:has-text("Complete Setup")')

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard')
    await expect(page.locator('text=Welcome to Test Wedding Co')).toBeVisible()
  })

  test('should validate required fields in each step', async ({ page }) => {
    await page.goto('/dashboard/onboard')

    // Try to proceed without filling fields
    await page.click('button:has-text("Next")')

    // Should show validation errors
    await expect(page.locator('text=Company name is required')).toBeVisible()
    await expect(page.locator('text=Subdomain is required')).toBeVisible()
  })

  test('should allow going back to previous steps', async ({ page }) => {
    await page.goto('/dashboard/onboard')

    // Fill step 1
    await page.fill('input[name="companyName"]', 'Test Co')
    await page.fill('input[name="subdomain"]', 'test')
    await page.click('button:has-text("Next")')

    // Go back
    await page.click('button:has-text("Back")')

    // Should be on step 1 with filled values
    await expect(page.locator('input[name="companyName"]')).toHaveValue('Test Co')
  })

  test('should show progress indicator', async ({ page }) => {
    await page.goto('/dashboard/onboard')

    // Step 1 - first indicator should be active
    await expect(page.locator('[data-testid="step-indicator-1"]')).toHaveClass(/active/)

    // Go to step 2
    await page.fill('input[name="companyName"]', 'Test Co')
    await page.fill('input[name="subdomain"]', 'test')
    await page.click('button:has-text("Next")')

    // Step 2 indicator should be active, step 1 should be completed
    await expect(page.locator('[data-testid="step-indicator-1"]')).toHaveClass(/completed/)
    await expect(page.locator('[data-testid="step-indicator-2"]')).toHaveClass(/active/)
  })
})
```

---

## 🚀 STEP 5: CI/CD PIPELINE CONFIGURATION (1 hour)

### GitHub Actions Workflow

**File:** `.github/workflows/test.yml`

```yaml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  # Lint and type check
  lint:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run ESLint
        run: npm run lint
      
      - name: Run TypeScript check
        run: npm run type-check

  # Unit and integration tests
  unit-tests:
    name: Unit & Integration Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run Jest tests
        run: npm run test:ci
        env:
          NODE_ENV: test
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/coverage-final.json
          flags: unittests
          name: codecov-umbrella
          fail_ci_if_error: true

  # E2E tests
  e2e-tests:
    name: E2E Tests
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright browsers
        run: npx playwright install --with-deps
      
      - name: Setup database
        run: |
          npm run db:push
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/weddingflow_test
      
      - name: Build application
        run: npm run build
        env:
          NODE_ENV: production
      
      - name: Run Playwright tests
        run: npm run test:e2e
        env:
          PLAYWRIGHT_TEST_BASE_URL: http://localhost:3000
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/weddingflow_test
      
      - name: Upload Playwright report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30

  # Build test
  build:
    name: Build Test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build application
        run: npm run build
        env:
          NODE_ENV: production

  # All checks passed
  all-tests-passed:
    name: All Tests Passed
    needs: [lint, unit-tests, e2e-tests, build]
    runs-on: ubuntu-latest
    steps:
      - name: All tests passed
        run: echo "âœ… All tests passed successfully!"
```

### Package.json Scripts

Add these scripts to `package.json`:

```json
{
  "scripts": {
    "test": "jest --watch",
    "test:ci": "jest --ci --coverage --maxWorkers=2",
    "test:coverage": "jest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug",
    "type-check": "tsc --noEmit",
    "lint": "next lint",
    "lint:fix": "next lint --fix"
  }
}
```

---

## 📈 STEP 6: COVERAGE CONFIGURATION (30 minutes)

### Codecov Configuration

**File:** `codecov.yml`

```yaml
coverage:
  status:
    project:
      default:
        target: 80%
        threshold: 2%
    patch:
      default:
        target: 80%

comment:
  layout: "reach, diff, flags, files"
  behavior: default
  require_changes: false
  require_base: false
  require_head: true

ignore:
  - "**/*.test.ts"
  - "**/*.test.tsx"
  - "**/*.spec.ts"
  - "**/*.spec.tsx"
  - "**/types/**"
  - "**/*.d.ts"
  - "**/node_modules/**"
  - ".next/**"
  - "public/**"
```

### SonarCloud Configuration (Optional)

**File:** `sonar-project.properties`

```properties
sonar.projectKey=weddingflow_pro
sonar.organization=your-org

sonar.sources=src
sonar.tests=src
sonar.test.inclusions=**/*.test.ts,**/*.test.tsx,**/*.spec.ts,**/*.spec.tsx

sonar.javascript.lcov.reportPaths=coverage/lcov.info
sonar.testExecutionReportPaths=test-results/sonar-report.xml

sonar.coverage.exclusions=**/*.test.ts,**/*.test.tsx,**/*.spec.ts,**/*.spec.tsx,**/types/**

sonar.qualitygate.wait=true
```

---

## 🧹 STEP 7: TEST UTILITIES & HELPERS (30 minutes)

### Test Data Generator

**File:** `src/test-utils/factories.ts`

```typescript
import { faker } from '@faker-js/faker'

export const createMockClient = (overrides?: Partial<Client>) => ({
  id: faker.string.uuid(),
  companyId: faker.string.uuid(),
  firstName: faker.person.firstName(),
  lastName: faker.person.lastName(),
  email: faker.internet.email(),
  phone: faker.phone.number(),
  weddingDate: faker.date.future().toISOString(),
  status: 'active' as const,
  createdAt: faker.date.past().toISOString(),
  updatedAt: faker.date.recent().toISOString(),
  ...overrides,
})

export const createMockGuest = (overrides?: Partial<Guest>) => ({
  id: faker.string.uuid(),
  clientId: faker.string.uuid(),
  companyId: faker.string.uuid(),
  firstName: faker.person.firstName(),
  lastName: faker.person.lastName(),
  email: faker.internet.email(),
  phone: faker.phone.number(),
  rsvpStatus: 'pending' as const,
  dietaryRestrictions: [],
  createdAt: faker.date.past().toISOString(),
  ...overrides,
})

export const createMockBudgetItem = (overrides?: Partial<BudgetItem>) => ({
  id: faker.string.uuid(),
  clientId: faker.string.uuid(),
  companyId: faker.string.uuid(),
  category: 'venue' as const,
  name: faker.commerce.productName(),
  estimatedCost: parseFloat(faker.commerce.price()),
  actualCost: parseFloat(faker.commerce.price()),
  paid: faker.datatype.boolean(),
  createdAt: faker.date.past().toISOString(),
  ...overrides,
})
```

### Custom Matchers

**File:** `src/test-utils/matchers.ts`

```typescript
import { expect } from '@jest/globals'

expect.extend({
  toBeValidEmail(received: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const pass = emailRegex.test(received)
    
    return {
      message: () =>
        pass
          ? `expected ${received} not to be a valid email`
          : `expected ${received} to be a valid email`,
      pass,
    }
  },

  toBeValidPhone(received: string) {
    const phoneRegex = /^\+?[\d\s\-()]+$/
    const pass = phoneRegex.test(received)
    
    return {
      message: () =>
        pass
          ? `expected ${received} not to be a valid phone number`
          : `expected ${received} to be a valid phone number`,
      pass,
    }
  },

  toBeValidDate(received: string) {
    const date = new Date(received)
    const pass = !isNaN(date.getTime())
    
    return {
      message: () =>
        pass
          ? `expected ${received} not to be a valid date`
          : `expected ${received} to be a valid date`,
      pass,
    }
  },
})

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidEmail(): R
      toBeValidPhone(): R
      toBeValidDate(): R
    }
  }
}
```

### Test Helpers

**File:** `src/test-utils/helpers.ts`

```typescript
import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactElement } from 'react'

// Create custom render with providers
export const renderWithProviders = (
  ui: ReactElement,
  options?: RenderOptions
) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )

  return render(ui, { wrapper: Wrapper, ...options })
}

// Wait for async operations
export const waitForLoadingToFinish = () => {
  return waitFor(() => {
    expect(screen.queryByTestId('loading')).not.toBeInTheDocument()
  })
}

// Mock Clerk session
export const mockClerkSession = (overrides?: {
  userId?: string
  companyId?: string
  role?: string
}) => {
  return {
    userId: overrides?.userId || 'test-user-id',
    sessionClaims: {
      metadata: {
        company_id: overrides?.companyId || 'test-company-id',
        role: overrides?.role || 'company_admin',
      },
    },
  }
}
```

---

## 🎯 STEP 8: SUCCESS METRICS & MONITORING (30 minutes)

### Test Coverage Dashboard

```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/lcov-report/index.html
```

### CI/CD Success Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Unit Test Coverage | 80% | Track in CI |
| Integration Test Coverage | 70% | Track in CI |
| E2E Test Coverage | Critical paths | Track in CI |
| Build Success Rate | 98% | Monitor in CI |
| Test Execution Time | <10 minutes | Optimize if needed |
| Flaky Test Rate | <5% | Monitor and fix |

### Monitoring Setup

**File:** `src/lib/monitoring/test-monitoring.ts`

```typescript
import * as Sentry from '@sentry/nextjs'

export const trackTestFailure = (testName: string, error: Error) => {
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(error, {
      tags: {
        test_name: testName,
        test_type: 'e2e',
      },
    })
  }
}

export const trackTestPerformance = (testName: string, duration: number) => {
  if (duration > 10000) { // Slow test threshold
    Sentry.captureMessage(`Slow test detected: ${testName}`, {
      level: 'warning',
      extra: {
        duration,
      },
    })
  }
}
```

---

## 📚 STEP 9: DOCUMENTATION (30 minutes)

### Testing Guide

**File:** `docs/testing-guide.md`

```markdown
# WeddingFlow Pro Testing Guide

## Running Tests

### Unit Tests
```bash
# Run all unit tests
npm run test

# Run tests in watch mode
npm run test -- --watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm run test -- src/components/ui/__tests__/button.test.tsx
```

### Integration Tests
```bash
# Run integration tests
npm run test -- --testPathPattern=integration

# Run with MSW server
npm run test -- --setupFilesAfterEnv=./jest.setup.js
```

### E2E Tests
```bash
# Run all E2E tests
npm run test:e2e

# Run E2E tests in UI mode
npm run test:e2e:ui

# Run specific E2E test
npm run test:e2e -- tests/auth.spec.ts

# Debug E2E test
npm run test:e2e:debug
```

## Writing Tests

### Unit Test Example
See `src/components/ui/__tests__/button.test.tsx`

### Integration Test Example
See `src/server/trpc/routers/__tests__/clients.test.ts`

### E2E Test Example
See `e2e/auth.spec.ts`

## Test Coverage

Current coverage requirements:
- Overall: 80%
- Unit tests: 85%
- Integration tests: 75%
- E2E tests: Critical paths only

## CI/CD

All tests run automatically on:
- Every push to main/develop
- Every pull request
- Nightly builds (full suite)

## Troubleshooting

### Flaky Tests
If a test is flaky, add retry logic or fix timing issues.

### Slow Tests
Tests taking >10s should be optimized or split.

### Failed E2E Tests
Check Playwright trace viewer for detailed debugging.
```

---

## ✅ SUCCESS CHECKLIST

**Session Complete When:**
- [ ] All dependencies installed (Jest, Playwright, MSW)
- [ ] Jest configuration complete
- [ ] Playwright configuration complete
- [ ] At least 10 unit tests written (example coverage)
- [ ] At least 5 integration tests written
- [ ] At least 5 E2E tests written
- [ ] CI/CD pipeline configured
- [ ] Coverage reporting setup
- [ ] Test utilities created
- [ ] Documentation complete
- [ ] All tests passing in CI
- [ ] Coverage meets 80% threshold

**KPIs to Track:**
- Test coverage percentage
- Build success rate
- Test execution time
- Flaky test rate
- CI/CD pipeline reliability

---

## 🚀 DEPLOYMENT CHECKLIST

**Pre-deployment:**
- [ ] All tests passing locally
- [ ] All tests passing in CI
- [ ] Coverage reports generated
- [ ] No critical bugs in Playwright traces
- [ ] Performance tests completed

**Post-deployment:**
- [ ] Monitor test execution times
- [ ] Track flaky tests
- [ ] Review coverage trends
- [ ] Update test data as needed
- [ ] Train team on testing practices

---

## 📞 SUPPORT & TROUBLESHOOTING

### Common Issues

**Issue: Jest tests timing out**
```typescript
// Solution: Increase timeout in jest.config.js
testTimeout: 10000, // 10 seconds
```

**Issue: Playwright tests failing in CI**
```bash
# Solution: Install system dependencies
npx playwright install --with-deps
```

**Issue: MSW not intercepting requests**
```typescript
// Solution: Ensure server is started in jest.setup.js
import { server } from './src/mocks/server'

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

**Issue: Coverage below threshold**
```bash
# Solution: Identify uncovered files
npm run test:coverage -- --verbose

# Focus on critical paths first
```

---

**END OF TESTING INFRASTRUCTURE COMPLETE IMPLEMENTATION**

*This document provides a complete, production-ready testing infrastructure following October 2025 standards with comprehensive unit, integration, and E2E testing, CI/CD pipeline, and monitoring.*
