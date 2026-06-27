/**
 * E2E Tests: Dashboard
 *
 * Tests the main dashboard functionality:
 * - Page loads correctly
 * - Stats cards display
 * - Navigation works
 */

import { test, expect } from '@playwright/test'
import { openMobileNavIfPresent } from './helpers/nav'

test.describe('Dashboard', () => {
  // Authenticated via shared storageState (global-setup); just land on the page.
  test.beforeEach(async ({ page }) => {
    await page.goto('/en/dashboard')
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('should load dashboard page', async ({ page }) => {
    // Verify we're on the dashboard
    await expect(page).toHaveURL(/dashboard/)

    // Verify main elements are visible
    await expect(page.locator('body')).toBeVisible()
  })

  test('should display navigation menu', async ({ page }) => {
    // Below `lg` the desktop sidebar is hidden; open the hamburger drawer first.
    const mobile = await openMobileNavIfPresent(page)
    const nav = mobile
      ? page.getByRole('dialog').locator('nav')
      : page.locator('nav, [role="navigation"]')
    await expect(nav.first()).toBeVisible()
  })

  test('should navigate to clients page', async ({ page }) => {
    // On mobile the Clients link lives in the hamburger drawer; on desktop in
    // the sidebar. Scope the lookup so we click the *visible* one, not the
    // hidden desktop sidebar link that times out on mobile viewports.
    const mobile = await openMobileNavIfPresent(page)
    const scope = mobile ? page.getByRole('dialog') : page.locator('nav').first()
    await scope.getByRole('link', { name: /clients/i }).first().click()

    await page.waitForURL(/clients/, { timeout: 15000 })
    await expect(page).toHaveURL(/clients/)
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
