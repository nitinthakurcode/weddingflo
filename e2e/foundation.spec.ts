/**
 * E2E foundation — proves the shared authenticated session (global-setup →
 * storageState) works: navigating to a protected route stays authenticated
 * instead of bouncing to /sign-in. No per-test login (avoids the rate limiter).
 */
import { test, expect } from '@playwright/test'

test('authenticated session reaches the dashboard without re-login', async ({ page }) => {
  await page.goto('/en/dashboard')
  await expect(page).toHaveURL(/\/dashboard/)
  await expect(page.locator('body')).toBeVisible()
})
