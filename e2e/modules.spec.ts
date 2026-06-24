/**
 * E2E smoke — every top-level module page loads for an authenticated user
 * without throwing to the dashboard error boundary. Reuses the shared session.
 * Deeper data-driven flows (chatbot CRUD→automation, Excel/Sheets round-trip,
 * vendor-per-event with seeded data) are covered exhaustively by the real-DB
 * integration suite + the import round-trip contract; this guards the UI shell.
 */
import { test, expect } from '@playwright/test'

const MODULES = ['dashboard', 'dashboard/clients', 'dashboard/vendors', 'dashboard/events', 'dashboard/guests']

for (const route of MODULES) {
  test(`module page loads: /${route}`, async ({ page }) => {
    await page.goto(`/en/${route}`)
    // Stays authenticated (not bounced to sign-in) and renders without the error boundary.
    await expect(page).not.toHaveURL(/sign-in/)
    await expect(page.locator('body')).toBeVisible()
    await expect(page.getByText(/something went wrong|application error/i)).toHaveCount(0)
  })
}
