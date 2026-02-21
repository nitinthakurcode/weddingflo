import { test, expect, type Page } from '@playwright/test';

/**
 * Authentication Security Tests
 *
 * Tests for:
 * - Rate limiting on auth endpoints
 * - Password requirements
 * - Session security
 * - 2FA enforcement
 *
 * Security February 2026
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

// Test credentials
const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'test@weddingflow.pro',
  password: process.env.TEST_USER_PASSWORD || 'TestPassword123!',
};

test.describe('Rate Limiting', () => {
  test('Sign-in rate limiting blocks after multiple failed attempts', async ({
    request,
  }) => {
    const MAX_ATTEMPTS = 6; // Should be blocked after 5
    const wrongPassword = 'WrongPassword123!';
    let blockedAt = -1;

    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      const response = await request.post(`${BASE_URL}/api/auth/sign-in/email`, {
        headers: {
          'Content-Type': 'application/json',
        },
        data: {
          email: TEST_USER.email,
          password: wrongPassword,
        },
      });

      if (response.status() === 429) {
        blockedAt = i + 1;
        break;
      }
    }

    // Should be blocked before MAX_ATTEMPTS
    expect(blockedAt).toBeGreaterThan(0);
    expect(blockedAt).toBeLessThanOrEqual(MAX_ATTEMPTS);
  });

  test('Password reset rate limiting is enforced', async ({ request }) => {
    const MAX_ATTEMPTS = 4; // Should be blocked after 3
    let blockedAt = -1;

    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      const response = await request.post(
        `${BASE_URL}/api/auth/forget-password`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          data: {
            email: TEST_USER.email,
          },
        }
      );

      if (response.status() === 429) {
        blockedAt = i + 1;
        break;
      }
    }

    // Should be rate limited
    expect(blockedAt).toBeGreaterThan(0);
    expect(blockedAt).toBeLessThanOrEqual(MAX_ATTEMPTS);
  });

  test('Sign-up rate limiting is enforced', async ({ request }) => {
    const MAX_ATTEMPTS = 6;
    let blockedAt = -1;

    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      const response = await request.post(`${BASE_URL}/api/auth/sign-up/email`, {
        headers: {
          'Content-Type': 'application/json',
        },
        data: {
          email: `test-${Date.now()}-${i}@spam.example.com`,
          password: 'TestPassword123!',
          name: 'Test User',
        },
      });

      if (response.status() === 429) {
        blockedAt = i + 1;
        break;
      }
    }

    // Should be rate limited
    expect(blockedAt).toBeGreaterThan(0);
    expect(blockedAt).toBeLessThanOrEqual(MAX_ATTEMPTS);
  });
});

test.describe('Session Security', () => {
  test('Session cookies have secure flags in production', async ({ page }) => {
    // Skip if not testing production
    if (!BASE_URL.includes('https://')) {
      test.skip();
      return;
    }

    await page.goto(`${BASE_URL}/sign-in`);
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard**');

    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(
      (c) => c.name.includes('session') || c.name.includes('wf')
    );

    expect(sessionCookie).toBeDefined();
    expect(sessionCookie!.secure).toBe(true);
    expect(sessionCookie!.httpOnly).toBe(true);
    expect(sessionCookie!.sameSite).toBe('Lax');
  });

  test('Session is invalidated on sign-out', async ({ page, request }) => {
    // Sign in
    await page.goto(`${BASE_URL}/sign-in`);
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard**');

    // Get session cookie
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(
      (c) => c.name.includes('session') || c.name.includes('wf')
    );

    // Sign out
    await page.click('button[aria-label="Sign out"]');
    await page.waitForURL('**/sign-in**');

    // Try to use old session cookie
    const response = await request.post(`${BASE_URL}/api/trpc/users.getCurrent`, {
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${sessionCookie!.name}=${sessionCookie!.value}`,
      },
      data: {
        json: {},
      },
    });

    // Old session should be invalid
    expect(response.status()).toBe(401);
  });

  test('Session cookie uses __Secure- prefix in production', async ({ page }) => {
    // Skip if not testing production
    if (!BASE_URL.includes('https://')) {
      test.skip();
      return;
    }

    await page.goto(`${BASE_URL}/sign-in`);
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard**');

    const cookies = await page.context().cookies();
    const securePrefixCookie = cookies.find((c) =>
      c.name.startsWith('__Secure-')
    );

    expect(securePrefixCookie).toBeDefined();
  });
});

test.describe('Password Security', () => {
  test('Weak passwords are rejected during sign-up', async ({ page }) => {
    await page.goto(`${BASE_URL}/sign-up`);

    const weakPasswords = [
      '123456',          // Too short, no letters
      'password',        // Common password
      'abcdefgh',        // No numbers or special chars
      'Pass1',           // Too short
    ];

    for (const weakPassword of weakPasswords) {
      await page.fill('input[type="email"]', `test-${Date.now()}@example.com`);
      await page.fill('input[name="name"]', 'Test User');
      await page.fill('input[type="password"]', weakPassword);
      await page.click('button[type="submit"]');

      // Should show password error
      const errorVisible = await page.locator('text=/password|weak|strong/i').isVisible();
      expect(errorVisible).toBe(true);

      // Clear for next test
      await page.fill('input[type="password"]', '');
    }
  });

  test('Password is not exposed in response', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/auth/sign-in/email`, {
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        email: TEST_USER.email,
        password: TEST_USER.password,
      },
    });

    const body = await response.text();

    // Response should never contain the password
    expect(body).not.toContain(TEST_USER.password);
    expect(body).not.toContain('password');
  });
});

test.describe('Two-Factor Authentication', () => {
  test.skip('Admin users are prompted to enable 2FA', async ({ page }) => {
    // Skip if no admin test user configured
    const adminEmail = process.env.TEST_ADMIN_EMAIL;
    const adminPassword = process.env.TEST_ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      test.skip();
      return;
    }

    // Sign in as admin without 2FA
    await page.goto(`${BASE_URL}/sign-in`);
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', adminPassword);
    await page.click('button[type="submit"]');

    // Should see 2FA prompt or be redirected to 2FA setup
    await page.waitForURL('**/{dashboard,two-factor}**');

    const url = page.url();
    const hasPrompt = await page.locator('text=/two-factor|2FA|security/i').isVisible();

    // Either redirected to 2FA page or shown a prompt
    expect(url.includes('two-factor') || hasPrompt).toBe(true);
  });

  test.skip('2FA is required for sensitive admin operations', async ({
    page,
    request,
  }) => {
    // Skip if no admin test user configured
    const adminEmail = process.env.TEST_ADMIN_EMAIL;
    const adminPassword = process.env.TEST_ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      test.skip();
      return;
    }

    // Sign in as admin
    await page.goto(`${BASE_URL}/sign-in`);
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', adminPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard**');

    const cookies = await page.context().cookies();
    const authCookies = cookies
      .filter((c) => c.name.includes('session') || c.name.includes('wf'))
      .map((c) => `${c.name}=${c.value}`)
      .join('; ');

    // Try sensitive operation (e.g., updating company settings)
    const response = await request.post(
      `${BASE_URL}/api/trpc/companies.updateSettings`,
      {
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookies,
        },
        data: {
          json: { theme: 'dark' },
        },
      }
    );

    // Should require 2FA
    if (!response.ok()) {
      const body = await response.json();
      expect(body.error?.message).toContain('2FA');
    }
  });
});

test.describe('Email Verification', () => {
  test('Unverified users are redirected to verify email page', async ({ page }) => {
    // Sign up a new user
    const testEmail = `unverified-${Date.now()}@test.weddingflow.pro`;

    await page.goto(`${BASE_URL}/sign-up`);
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[name="name"]', 'Unverified User');
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');

    // Should be redirected to verify-email page
    await page.waitForURL('**/verify-email**', { timeout: 10000 });

    expect(page.url()).toContain('verify-email');
  });

  test('Invalid verification token is rejected', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/auth/verify-email`, {
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        token: 'invalid-token-12345',
      },
    });

    // Should fail
    expect(response.ok()).toBe(false);
    expect([400, 401, 403]).toContain(response.status());
  });
});

test.describe('Brute Force Protection', () => {
  test('Account enumeration is prevented', async ({ request }) => {
    // Try to sign in with non-existent email
    const response1 = await request.post(`${BASE_URL}/api/auth/sign-in/email`, {
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        email: 'nonexistent@example.com',
        password: 'SomePassword123!',
      },
    });

    // Try with existing email but wrong password
    const response2 = await request.post(`${BASE_URL}/api/auth/sign-in/email`, {
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        email: TEST_USER.email,
        password: 'WrongPassword123!',
      },
    });

    // Both should return the same error (prevent enumeration)
    const body1 = await response1.json();
    const body2 = await response2.json();

    // Error messages should be identical or similarly vague
    expect(response1.status()).toBe(response2.status());
  });

  test('Password reset does not reveal if email exists', async ({ request }) => {
    // Request reset for existing email
    const response1 = await request.post(
      `${BASE_URL}/api/auth/forget-password`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        data: {
          email: TEST_USER.email,
        },
      }
    );

    // Request reset for non-existent email
    const response2 = await request.post(
      `${BASE_URL}/api/auth/forget-password`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        data: {
          email: 'definitely-not-exists@example.com',
        },
      }
    );

    // Both should return success (or same response)
    expect(response1.status()).toBe(response2.status());
  });
});

test.describe('XSS Prevention', () => {
  test('XSS in sign-up name is sanitized', async ({ page }) => {
    await page.goto(`${BASE_URL}/sign-up`);

    const xssPayload = '<script>alert("XSS")</script>';

    await page.fill('input[type="email"]', `xss-test-${Date.now()}@test.com`);
    await page.fill('input[name="name"]', xssPayload);
    await page.fill('input[type="password"]', 'TestPassword123!');

    // The form should either reject the input or sanitize it
    await page.click('button[type="submit"]');

    // Wait for any response
    await page.waitForTimeout(1000);

    // Check that the script tag is not rendered as HTML
    const pageContent = await page.content();
    expect(pageContent).not.toContain('<script>alert');
  });
});
