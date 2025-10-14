# Testing Quick Reference

## Run All Tests
```bash
npm test
```

## Run Tests in Watch Mode
```bash
npm test -- --watch
```

## Run Specific Test File
```bash
npm test __tests__/lib/utils.test.ts
```

## Run Tests with Coverage
```bash
npm test -- --coverage
```

## Run E2E Tests
```bash
npm run e2e
# or
npx playwright test
```

## Run E2E Tests in UI Mode
```bash
npx playwright test --ui
```

## Run E2E Tests in Headed Mode (See Browser)
```bash
npx playwright test --headed
```

## Run Specific E2E Test
```bash
npx playwright test e2e/example.spec.ts
```

## Test File Structure

```
weddingflow-pro/
├── __tests__/              # Jest unit and component tests
│   ├── lib/                # Utility function tests
│   │   ├── utils.test.ts
│   │   ├── budget-calculations.test.ts
│   │   └── timeline-utils.test.ts
│   ├── hooks/              # Custom hook tests
│   │   ├── use-debounce.test.ts
│   │   └── use-local-storage.test.ts
│   └── components/         # Component tests
│       └── ui/
│           └── button.test.tsx
├── e2e/                    # Playwright E2E tests
│   └── example.spec.ts
├── jest.config.js          # Jest configuration
├── jest.setup.ts           # Jest setup (mocks, etc.)
└── playwright.config.ts    # Playwright configuration
```

## Current Test Coverage

```
Test Suites: 6 passed, 6 total
Tests:       115 passed, 115 total
Time:        ~0.5s
```

### Test Breakdown
- **utils.test.ts**: 9 tests - Class name utility
- **budget-calculations.test.ts**: 33 tests - Budget calculations
- **timeline-utils.test.ts**: 58 tests - Timeline utilities
- **use-debounce.test.ts**: 11 tests - Debounce hook
- **use-local-storage.test.ts**: 20 tests - LocalStorage hook
- **button.test.tsx**: 16 tests - Button component

## Writing New Tests

### Unit Test Template
```typescript
import { myFunction } from '@/lib/my-module'

describe('myFunction', () => {
  it('should do something', () => {
    const result = myFunction('input')
    expect(result).toBe('expected')
  })
})
```

### Component Test Template
```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MyComponent } from '@/components/MyComponent'

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Expected Text')).toBeInTheDocument()
  })

  it('should handle user interaction', async () => {
    const user = userEvent.setup()
    const handleClick = jest.fn()

    render(<MyComponent onClick={handleClick} />)

    await user.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
```

### Hook Test Template
```typescript
import { renderHook, act } from '@testing-library/react'
import { useMyHook } from '@/hooks/use-my-hook'

describe('useMyHook', () => {
  it('should return initial value', () => {
    const { result } = renderHook(() => useMyHook())
    expect(result.current).toBeDefined()
  })

  it('should update value', () => {
    const { result } = renderHook(() => useMyHook())

    act(() => {
      result.current.updateValue('new value')
    })

    expect(result.current.value).toBe('new value')
  })
})
```

### E2E Test Template
```typescript
import { test, expect } from '@playwright/test'

test.describe('Feature Name', () => {
  test('should perform action', async ({ page }) => {
    await page.goto('/path')

    await page.click('button')

    await expect(page.locator('text=Expected')).toBeVisible()
  })
})
```

## Common Test Commands

### Debug Tests
```bash
# Run tests with verbose output
npm test -- --verbose

# Run tests with more detail
npm test -- --no-coverage --maxWorkers=1

# Debug specific test
node --inspect-brk node_modules/.bin/jest __tests__/lib/utils.test.ts
```

### Playwright Commands
```bash
# Generate test
npx playwright codegen http://localhost:3000

# Show report
npx playwright show-report

# Update snapshots
npx playwright test --update-snapshots

# Run on specific browser
npx playwright test --project=chromium
```

## Error Handling Features

### Available Error Boundaries
- `src/app/error.tsx` - Global error boundary
- `src/app/not-found.tsx` - 404 page
- `src/app/(dashboard)/error.tsx` - Dashboard error boundary
- `src/components/errors/error-boundary.tsx` - Reusable error boundary

### Error Handler Usage
```typescript
import { handleError, ValidationError } from '@/lib/errors/error-handler'

try {
  // Your code
} catch (error) {
  const appError = handleError(error, {
    component: 'MyComponent',
    action: 'saving data'
  })

  // Use appError.message to show to user
}
```

### Custom Error Classes
```typescript
import {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NetworkError,
  NotFoundError
} from '@/lib/errors/error-handler'

// Example usage
throw new ValidationError('Email is required', {
  component: 'LoginForm',
  userId: user.id
})
```

## Loading States

### Using Skeleton
```typescript
import { Skeleton } from '@/components/ui/skeleton'

<Skeleton className="h-8 w-64" />
```

### Using Spinner
```typescript
import { Spinner, LoadingSpinner, FullPageSpinner } from '@/components/ui/spinner'

<Spinner size="lg" />
<LoadingSpinner message="Loading data..." />
<FullPageSpinner />
```

### Using Error Boundary
```typescript
import { ErrorBoundaryWrapper } from '@/components/errors/error-boundary'

<ErrorBoundaryWrapper>
  <MyComponent />
</ErrorBoundaryWrapper>
```

## Useful Testing Queries

### React Testing Library Queries (in order of preference)
1. `getByRole` - Most accessible
2. `getByLabelText` - For form fields
3. `getByPlaceholderText` - For inputs
4. `getByText` - For text content
5. `getByDisplayValue` - For input values
6. `getByAltText` - For images
7. `getByTitle` - For title attributes
8. `getByTestId` - Last resort

### Common Matchers
```typescript
expect(element).toBeInTheDocument()
expect(element).toBeVisible()
expect(element).toBeDisabled()
expect(element).toHaveClass('className')
expect(element).toHaveAttribute('attr', 'value')
expect(element).toHaveTextContent('text')
expect(fn).toHaveBeenCalled()
expect(fn).toHaveBeenCalledWith('arg')
expect(fn).toHaveBeenCalledTimes(2)
```

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test -- --coverage
      - run: npx playwright install
      - run: npx playwright test
```

## Tips

1. **Run tests before committing**: `git commit` hook with tests
2. **Use watch mode** during development
3. **Write tests first** (TDD) when possible
4. **Test user behavior**, not implementation details
5. **Keep tests simple** and focused
6. **Use descriptive test names**
7. **Mock external dependencies**
8. **Don't test third-party libraries**

## Next Steps

1. Add more tests as you add features
2. Aim for >70% code coverage
3. Add API route tests
4. Add integration tests
5. Set up CI/CD with automated testing
6. Configure Sentry for error tracking
7. Add performance testing
8. Add accessibility testing (jest-axe)
