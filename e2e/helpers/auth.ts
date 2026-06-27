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
  const email = page.locator('#email')
  const password = page.locator('#password')
  await email.waitFor({ state: 'visible', timeout: 15000 })

  // WebKit/Safari drops the FIRST controlled-input fill (email) before React
  // commits it — the form then submits with a blank email, BetterAuth rejects it,
  // and no redirect happens (this is what hung auth.spec.ts:30 on webkit + Mobile
  // Safari; Chromium/Firefox commit the first fill, so they passed). Fill BOTH
  // fields and assert the values stuck, retrying, and re-verify immediately before
  // submit so a focus/re-render between fills can't leave email blank.
  await expect(async () => {
    await email.fill(TEST_EMAIL)
    await password.fill(TEST_PASSWORD)
    await expect(email).toHaveValue(TEST_EMAIL, { timeout: 1000 })
    await expect(password).toHaveValue(TEST_PASSWORD, { timeout: 1000 })
  }).toPass({ timeout: 10000 })

  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL(/\/dashboard/, { timeout: 20000 })
  await expect(page).toHaveURL(/\/dashboard/)
}
