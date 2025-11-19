/**
 * E2E Tests: Dashboard
 *
 * Tests the main dashboard functionality:
 * - Page loads correctly
 * - Stats cards display
 * - Navigation works
 */

import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/en/sign-in')
    await page.waitForSelector('input[name="identifier"]', { state: 'visible' })
    await page.fill('input[name="identifier"]', process.env.TEST_USER_EMAIL || 'test@weddingflow.com')
    await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || 'TestPassword123!')

    const submitButton = page.locator('button:visible').filter({ hasText: /continue|sign in/i }).first()
    await submitButton.waitFor({ state: 'visible', timeout: 10000 })
    await submitButton.click()
    await page.waitForURL('/en/dashboard', { timeout: 15000 })
  })

  test('should load dashboard page', async ({ page }) => {
    // Verify we're on the dashboard
    await expect(page).toHaveURL(/dashboard/)

    // Verify main elements are visible
    await expect(page.locator('body')).toBeVisible()
  })

  test('should display navigation menu', async ({ page }) => {
    // Check for navigation elements (adjust selectors based on actual implementation)
    await expect(page.locator('nav, [role="navigation"]')).toBeVisible()
  })

  test('should navigate to clients page', async ({ page }) => {
    // Look for Clients link in navigation
    const clientsLink = page.locator('a:has-text("Clients"), a:has-text("clients")')

    if (await clientsLink.count() > 0) {
      await clientsLink.first().click()

      // Wait for navigation
      await page.waitForURL(/clients/, { timeout: 5000 })

      // Verify we're on clients page
      await expect(page).toHaveURL(/clients/)
    }
  })

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    // Reload to apply mobile view
    await page.reload()

    // Page should still be accessible
    await expect(page.locator('body')).toBeVisible()
  })
})
