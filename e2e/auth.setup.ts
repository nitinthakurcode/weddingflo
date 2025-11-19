/**
 * Authentication Setup for E2E Tests
 *
 * This file handles authentication state for Playwright tests.
 * It logs in once and saves the authenticated state for reuse across tests.
 */

import { test as setup, expect } from '@playwright/test'

const authFile = 'playwright/.auth/user.json'

setup('authenticate', async ({ page }) => {
  // Navigate to sign-in page
  await page.goto('/en/sign-in')

  // Fill in credentials (use test account)
  await page.fill('input[name="identifier"]', process.env.TEST_USER_EMAIL || 'test@weddingflow.com')
  await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || 'TestPassword123!')

  // Click sign in button
  await page.click('button[type="submit"]')

  // Wait for redirect to dashboard
  await page.waitForURL('/en/dashboard', { timeout: 10000 })

  // Verify we're authenticated
  await expect(page.locator('body')).toBeVisible()

  // Save authentication state
  await page.context().storageState({ path: authFile })
})
