/**
 * E2E: Authentication (BetterAuth). The sign-in form uses id-based inputs
 * (#email / #password) + a "Sign in" button — the old name="email"/"identifier"
 * selectors had bit-rotted and silently failed. Shared login lives in helpers/auth.
 *
 * These tests exercise the login MECHANISM, so they run logged-OUT (overriding the
 * shared storageState). Authenticated flows live in the other specs and reuse the
 * session captured by global-setup (so we only ever do ~2 real logins total).
 */
import { test, expect } from '@playwright/test'
import { login } from './helpers/auth'

test.use({ storageState: { cookies: [], origins: [] } })

test.describe('Authentication', () => {
  test('sign-in page renders the credential form', async ({ page }) => {
    await page.goto('/en/sign-in')
    await expect(page.locator('#email')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('#password')).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })

  test('rejects empty submit (stays on sign-in)', async ({ page }) => {
    await page.goto('/en/sign-in')
    await page.locator('#email').waitFor({ state: 'visible', timeout: 15000 })
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).toHaveURL(/sign-in/)
  })

  test('valid credentials redirect to the dashboard', async ({ page }) => {
    await login(page)
    await expect(page).toHaveURL(/\/dashboard/)
  })
})
