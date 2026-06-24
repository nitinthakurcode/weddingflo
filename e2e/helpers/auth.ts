import { Page, expect } from '@playwright/test'

/** Test credentials — overridable via env (CI sets TEST_USER_*). */
export const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'test@test.com'
export const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'E2eTest!Pass123'

/**
 * Logs in via the real BetterAuth sign-in form and waits for the dashboard.
 * The form uses id-based inputs (#email / #password) and a "Sign in" button.
 */
export async function login(page: Page): Promise<void> {
  await page.goto('/en/sign-in')
  await page.locator('#email').waitFor({ state: 'visible', timeout: 15000 })
  await page.locator('#email').fill(TEST_EMAIL)
  await page.locator('#password').fill(TEST_PASSWORD)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL(/\/dashboard/, { timeout: 20000 })
  await expect(page).toHaveURL(/\/dashboard/)
}
