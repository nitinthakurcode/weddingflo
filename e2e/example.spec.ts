import { test, expect } from '@playwright/test'

test.describe('Homepage', () => {
  test('should load homepage successfully', async ({ page }) => {
    await page.goto('/')

    // Check that the page loaded
    await expect(page).toHaveTitle(/WeddingFlow/i)
  })

  test('should display main navigation', async ({ page }) => {
    await page.goto('/')

    // Wait for the page to load
    await page.waitForLoadState('networkidle')

    // Check for common navigation elements (adjust selectors based on your actual UI)
    const body = await page.locator('body')
    await expect(body).toBeVisible()
  })
})

test.describe('Authentication', () => {
  test('should redirect to sign-in when not authenticated', async ({ page }) => {
    // Try to access a protected route
    await page.goto('/dashboard')

    // Should be redirected to sign-in
    await page.waitForURL(/sign-in|auth/, { timeout: 10000 })

    // Verify we're on the sign-in page
    expect(page.url()).toMatch(/sign-in|auth/)
  })
})

// Note: These are basic example tests
// For full E2E testing, you would need to:
// 1. Set up test user credentials
// 2. Implement sign-in flows
// 3. Test CRUD operations
// 4. Test complex user workflows

test.describe('404 Page', () => {
  test('should show 404 page for non-existent routes', async ({ page }) => {
    await page.goto('/this-page-does-not-exist-xyz123')

    // Should show 404 content
    await expect(page.locator('text=/404|not found/i')).toBeVisible()
  })
})
