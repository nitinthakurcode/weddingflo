import { Page, expect } from '@playwright/test'

/**
 * Opens the mobile nav drawer when the dashboard layout is in its mobile
 * breakpoint. Below `lg` the desktop sidebar is `hidden` and navigation lives
 * behind the hamburger — the first <button> in the <header> (classed
 * `lg:hidden`) — which mounts MobileNav as a Radix dialog. On desktop the
 * hamburger is `display:none`, so `isVisible()` is false and this is a no-op.
 *
 * Returns true when the mobile drawer was opened, so callers can scope link
 * lookups to the open dialog instead of the (hidden) desktop sidebar.
 */
export async function openMobileNavIfPresent(page: Page): Promise<boolean> {
  const hamburger = page.locator('header').first().locator('button').first()
  if (await hamburger.isVisible().catch(() => false)) {
    await hamburger.click()
    await expect(page.getByRole('dialog')).toBeVisible()
    return true
  }
  return false
}
