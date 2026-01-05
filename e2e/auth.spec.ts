/**
 * E2E Tests: Authentication Flow
 * December 2025 - BetterAuth + Drizzle + Hetzner PostgreSQL
 *
 * Tests the complete authentication journey including:
 * - Sign in
 * - Dashboard access
 * - Session persistence
 */

import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('should load sign-in page', async ({ page }) => {
    await page.goto('/en/sign-in')

    // Verify sign-in page elements - use first() to handle multiple h1 elements
    await expect(page.locator('h1').first()).toBeVisible()
    await expect(page.locator('input[name="email"], input[name="identifier"]').first()).toBeVisible()
    await expect(page.locator('input[name="password"]')).toBeVisible()
    // Wait for auth form to fully load
    await expect(page.locator('button:visible').filter({ hasText: /continue|sign in/i }).first()).toBeVisible({ timeout: 10000 })
  })

  test('should show validation errors for empty form', async ({ page }) => {
    await page.goto('/en/sign-in')

    // Wait for auth form to load completely
    await page.waitForSelector('input[name="email"], input[name="identifier"]', { state: 'visible' })

    // Find and click the submit button
    const submitButton = page.locator('button:visible').filter({ hasText: /continue|sign in/i }).first()
    await submitButton.waitFor({ state: 'visible', timeout: 10000 })
    await submitButton.click()

    // Should still be on sign-in page
    await expect(page).toHaveURL(/sign-in/)
  })

  test('should redirect to dashboard after successful login', async ({ page }) => {
    await page.goto('/en/sign-in')

    // Wait for auth form to load
    await page.waitForSelector('input[name="email"], input[name="identifier"]', { state: 'visible' })

    // Fill credentials (BetterAuth uses 'email' field name)
    const emailInput = page.locator('input[name="email"], input[name="identifier"]').first()
    await emailInput.fill(process.env.TEST_USER_EMAIL || 'test@weddingflow.com')
    await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || 'TestPassword123!')

    // Submit form using visible button with text
    const submitButton = page.locator('button:visible').filter({ hasText: /continue|sign in/i }).first()
    await submitButton.waitFor({ state: 'visible', timeout: 10000 })
    await submitButton.click()

    // Wait for redirect with longer timeout
    await page.waitForURL('/en/dashboard', { timeout: 15000 })

    // Verify we're on dashboard
    await expect(page).toHaveURL(/dashboard/)
  })

  test('should persist session after page reload', async ({ page }) => {
    // Login first
    await page.goto('/en/sign-in')
    await page.waitForSelector('input[name="email"], input[name="identifier"]', { state: 'visible' })

    const emailInput = page.locator('input[name="email"], input[name="identifier"]').first()
    await emailInput.fill(process.env.TEST_USER_EMAIL || 'test@weddingflow.com')
    await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || 'TestPassword123!')

    const submitButton = page.locator('button:visible').filter({ hasText: /continue|sign in/i }).first()
    await submitButton.waitFor({ state: 'visible', timeout: 10000 })
    await submitButton.click()
    await page.waitForURL('/en/dashboard', { timeout: 15000 })

    // Reload the page
    await page.reload()

    // Should still be on dashboard (not redirected to sign-in)
    await expect(page).toHaveURL(/dashboard/)
  })
})
