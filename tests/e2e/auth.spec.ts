import { test, expect } from '@playwright/test';

/**
 * E2E Authentication Flow Test
 * December 2025 - BetterAuth + Drizzle + Hetzner PostgreSQL
 * Tests the complete authentication journey
 */

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start from the home page
    await page.goto('http://localhost:3000');
  });

  test('should redirect from root to /en locale', async ({ page }) => {
    await expect(page).toHaveURL(/\/en$/);
  });

  test('should display sign-in and sign-up buttons on home page', async ({ page }) => {
    await page.goto('http://localhost:3000/en');

    // Check for Sign In button
    const signInButton = page.getByRole('link', { name: /sign in/i });
    await expect(signInButton).toBeVisible();

    // Check for Sign Up button
    const signUpButton = page.getByRole('link', { name: /sign up/i });
    await expect(signUpButton).toBeVisible();
  });

  test('should navigate to sign-in page', async ({ page }) => {
    await page.goto('http://localhost:3000/en');
    await page.getByRole('link', { name: /sign in/i }).click();

    // Should be on sign-in page
    await expect(page).toHaveURL(/\/en\/sign-in/);

    // Auth form should be visible
    await expect(page.locator('form')).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to sign-up page', async ({ page }) => {
    await page.goto('http://localhost:3000/en');
    await page.getByRole('link', { name: /sign up/i }).click();

    // Should be on sign-up page
    await expect(page).toHaveURL(/\/en\/sign-up/);

    // Auth form should be visible
    await expect(page.locator('form')).toBeVisible({ timeout: 10000 });
  });

  test('should access superadmin sign-in page', async ({ page }) => {
    await page.goto('http://localhost:3000/en/superadmin/sign-in');

    // Should see super admin branding
    await expect(page.getByText(/super admin access/i)).toBeVisible();
    await expect(page.getByText(/restricted access/i)).toBeVisible();

    // Auth form should be visible
    await expect(page.locator('form')).toBeVisible({ timeout: 10000 });
  });

  test('should access portal sign-in page', async ({ page }) => {
    await page.goto('http://localhost:3000/en/portal/sign-in');

    // Auth form should be visible
    await expect(page.locator('form')).toBeVisible({ timeout: 10000 });
  });

  test('should show onboard page when accessed directly', async ({ page }) => {
    // This will redirect to sign-in if not authenticated
    await page.goto('http://localhost:3000/en/onboard');

    // Either shows onboard page (if auth mock) or redirects to sign-in
    const url = page.url();
    expect(url.includes('/en/onboard') || url.includes('/en/sign-in')).toBeTruthy();
  });

  test('should show dashboard page when accessed directly', async ({ page }) => {
    // This will redirect to sign-in if not authenticated
    await page.goto('http://localhost:3000/en/dashboard');

    // Either shows dashboard (if auth mock) or redirects to sign-in
    const url = page.url();
    expect(url.includes('/en/dashboard') || url.includes('/en/sign-in')).toBeTruthy();
  });
});

test.describe('API Endpoints', () => {
  test('stripe webhook endpoint should be accessible', async ({ request }) => {
    // GET should return 405 (Method Not Allowed) - webhook only accepts POST
    const response = await request.get('http://localhost:3000/api/webhooks/stripe');
    expect(response.status()).toBe(405);
  });

  test('health endpoint should return 200', async ({ request }) => {
    const response = await request.get('http://localhost:3000/api/health');
    expect(response.status()).toBe(200);
  });

  test('auth session endpoint should be accessible', async ({ request }) => {
    const response = await request.get('http://localhost:3000/api/auth/session');
    // Returns 200 even if not authenticated (session will be null)
    expect(response.status()).toBe(200);
  });
});

test.describe('Internationalization', () => {
  const locales = ['en', 'es', 'fr', 'de', 'ja', 'zh', 'hi'];

  for (const locale of locales) {
    test(`should work with ${locale} locale`, async ({ page }) => {
      await page.goto(`http://localhost:3000/${locale}`);

      // Should show the home page content
      await expect(page.getByText(/WeddingFlo/i)).toBeVisible();
    });
  }
});

test.describe('Responsive Design', () => {
  test('should work on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:3000/en');

    await expect(page.getByText(/WeddingFlo/i)).toBeVisible();
  });

  test('should work on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('http://localhost:3000/en');

    await expect(page.getByText(/WeddingFlo/i)).toBeVisible();
  });

  test('should work on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('http://localhost:3000/en');

    await expect(page.getByText(/WeddingFlo/i)).toBeVisible();
  });
});

test.describe('Performance', () => {
  test('home page should load quickly', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('http://localhost:3000/en');
    const loadTime = Date.now() - startTime;

    // Should load in under 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });
});
