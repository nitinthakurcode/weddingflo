/**
 * Unauthenticated access control. Runs logged-OUT (overrides the shared
 * storageState) so it can assert that protected routes bounce to sign-in.
 */
import { test, expect } from '@playwright/test'

test.use({ storageState: { cookies: [], origins: [] } })

test.describe('Public + access control', () => {
  test('homepage loads', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('body')).toBeVisible()
  })

  test('protected route redirects to sign-in when not authenticated', async ({ page }) => {
    await page.goto('/en/dashboard')
    await page.waitForURL(/sign-in|auth/, { timeout: 15000 })
    expect(page.url()).toMatch(/sign-in|auth/)
  })

  test('unknown route shows a 404', async ({ page }) => {
    await page.goto('/en/this-page-does-not-exist-xyz123')
    await page.waitForLoadState('networkidle')
    const heading = page.locator('h1, h2').filter({ hasText: /404|not found/i })
    await expect(heading.first()).toBeVisible({ timeout: 10000 })
  })
})
