import { test, expect, type Page, type APIRequestContext } from '@playwright/test';

/**
 * Cross-Tenant Isolation Security Tests
 *
 * These tests verify that tenants (companies) cannot access each other's data.
 * This is critical for multi-tenant SaaS security.
 *
 * Security February 2026
 */

// Test configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

// Test users for different tenants (set in environment)
const ORG_A = {
  email: process.env.TEST_ORG_A_EMAIL || 'org-a@test.weddingflow.pro',
  password: process.env.TEST_ORG_A_PASSWORD || 'TestPassword123!',
  companyId: process.env.TEST_ORG_A_COMPANY_ID || 'company-a-id',
};

const ORG_B = {
  email: process.env.TEST_ORG_B_EMAIL || 'org-b@test.weddingflow.pro',
  password: process.env.TEST_ORG_B_PASSWORD || 'TestPassword123!',
  companyId: process.env.TEST_ORG_B_COMPANY_ID || 'company-b-id',
  clientId: process.env.TEST_ORG_B_CLIENT_ID || 'client-b-id',
  guestId: process.env.TEST_ORG_B_GUEST_ID || 'guest-b-id',
};

test.describe('Cross-Tenant Isolation', () => {
  let authCookies: { name: string; value: string }[];

  test.beforeAll(async ({ browser }) => {
    // Sign in as Org A user to get auth cookies
    const page = await browser.newPage();

    await page.goto(`${BASE_URL}/sign-in`);

    // Fill in credentials
    await page.fill('input[type="email"]', ORG_A.email);
    await page.fill('input[type="password"]', ORG_A.password);

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard**', { timeout: 10000 });

    // Store cookies for API requests
    const cookies = await page.context().cookies();
    authCookies = cookies.filter(
      (c) => c.name.includes('session') || c.name.includes('wf')
    );

    await page.close();
  });

  test('Org A cannot access Org B clients via API', async ({ request }) => {
    // Try to access Org B's client directly via tRPC
    const response = await request.post(`${BASE_URL}/api/trpc/clients.get`, {
      headers: {
        'Content-Type': 'application/json',
        Cookie: authCookies.map((c) => `${c.name}=${c.value}`).join('; '),
      },
      data: {
        json: { id: ORG_B.clientId },
      },
    });

    // Should either return 403/404 or empty data, never Org B's data
    if (response.ok()) {
      const body = await response.json();
      // If we get data back, ensure it's not from Org B
      expect(body.result?.data?.companyId).not.toBe(ORG_B.companyId);
    } else {
      // Expected: 403, 404, or 401
      expect([401, 403, 404]).toContain(response.status());
    }
  });

  test('Org A cannot list Org B guests via API', async ({ request }) => {
    // Try to list guests for Org B's client
    const response = await request.post(`${BASE_URL}/api/trpc/guests.list`, {
      headers: {
        'Content-Type': 'application/json',
        Cookie: authCookies.map((c) => `${c.name}=${c.value}`).join('; '),
      },
      data: {
        json: { clientId: ORG_B.clientId },
      },
    });

    if (response.ok()) {
      const body = await response.json();
      // Should return empty array, not Org B's guests
      const guests = body.result?.data || [];
      expect(guests.length).toBe(0);
    } else {
      expect([401, 403, 404]).toContain(response.status());
    }
  });

  test('Org A cannot access Org B events via API', async ({ request }) => {
    // Try to access Org B's events
    const response = await request.post(`${BASE_URL}/api/trpc/events.list`, {
      headers: {
        'Content-Type': 'application/json',
        Cookie: authCookies.map((c) => `${c.name}=${c.value}`).join('; '),
      },
      data: {
        json: { clientId: ORG_B.clientId },
      },
    });

    if (response.ok()) {
      const body = await response.json();
      const events = body.result?.data || [];
      // Should not contain any events from Org B
      events.forEach((event: { companyId?: string }) => {
        expect(event.companyId).not.toBe(ORG_B.companyId);
      });
    }
  });

  test('SQL injection returns no cross-tenant data', async ({ request }) => {
    // Attempt SQL injection in search/filter parameters
    const injectionPayloads = [
      "' OR '1'='1",
      "'; DROP TABLE clients; --",
      "1 UNION SELECT * FROM clients",
      "1' OR companyId != '" + ORG_A.companyId,
    ];

    for (const payload of injectionPayloads) {
      const response = await request.post(`${BASE_URL}/api/trpc/clients.list`, {
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookies.map((c) => `${c.name}=${c.value}`).join('; '),
        },
        data: {
          json: { search: payload },
        },
      });

      if (response.ok()) {
        const body = await response.json();
        const clients = body.result?.data || [];

        // Should only return Org A's clients, or empty
        clients.forEach((client: { companyId?: string }) => {
          expect(client.companyId).toBe(ORG_A.companyId);
        });
      }
    }
  });

  test('Unauthenticated requests return 401', async ({ request }) => {
    // Try to access protected endpoints without auth
    const protectedEndpoints = [
      '/api/trpc/clients.list',
      '/api/trpc/guests.list',
      '/api/trpc/events.list',
      '/api/trpc/users.getCurrent',
    ];

    for (const endpoint of protectedEndpoints) {
      const response = await request.post(`${BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        data: {
          json: {},
        },
      });

      // Should return 401 Unauthorized
      expect(response.status()).toBe(401);
    }
  });

  test('Org A cannot modify Org B data', async ({ request }) => {
    // Try to update Org B's client
    const response = await request.post(`${BASE_URL}/api/trpc/clients.update`, {
      headers: {
        'Content-Type': 'application/json',
        Cookie: authCookies.map((c) => `${c.name}=${c.value}`).join('; '),
      },
      data: {
        json: {
          id: ORG_B.clientId,
          data: { name: 'Hacked by Org A' },
        },
      },
    });

    // Should fail with 403 or 404
    expect([401, 403, 404]).toContain(response.status());
  });

  test('Org A cannot delete Org B data', async ({ request }) => {
    // Try to delete Org B's guest
    const response = await request.post(`${BASE_URL}/api/trpc/guests.delete`, {
      headers: {
        'Content-Type': 'application/json',
        Cookie: authCookies.map((c) => `${c.name}=${c.value}`).join('; '),
      },
      data: {
        json: { id: ORG_B.guestId },
      },
    });

    // Should fail with 403 or 404
    expect([401, 403, 404]).toContain(response.status());
  });
});

test.describe('CSRF Protection', () => {
  test('Cross-origin mutations are blocked', async ({ request }) => {
    // Try mutation with cross-origin Origin header
    const response = await request.post(`${BASE_URL}/api/trpc/clients.create`, {
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://evil-site.com',
      },
      data: {
        json: { name: 'Test Client' },
      },
    });

    // Should be blocked by CSRF middleware
    expect([401, 403]).toContain(response.status());
  });

  test('Same-origin mutations are allowed', async ({ request, browser }) => {
    // First authenticate
    const page = await browser.newPage();
    await page.goto(`${BASE_URL}/sign-in`);
    await page.fill('input[type="email"]', ORG_A.email);
    await page.fill('input[type="password"]', ORG_A.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard**');

    const cookies = await page.context().cookies();
    const authCookies = cookies
      .filter((c) => c.name.includes('session') || c.name.includes('wf'))
      .map((c) => `${c.name}=${c.value}`)
      .join('; ');

    await page.close();

    // Try mutation with same-origin (or no) Origin header
    const response = await request.post(`${BASE_URL}/api/trpc/users.getCurrent`, {
      headers: {
        'Content-Type': 'application/json',
        'Origin': BASE_URL,
        Cookie: authCookies,
      },
      data: {
        json: {},
      },
    });

    // Should be allowed
    expect(response.ok()).toBe(true);
  });
});

test.describe('Parameter Tampering', () => {
  test('Cannot access other tenant by manipulating companyId parameter', async ({
    request,
    browser,
  }) => {
    // Authenticate as Org A
    const page = await browser.newPage();
    await page.goto(`${BASE_URL}/sign-in`);
    await page.fill('input[type="email"]', ORG_A.email);
    await page.fill('input[type="password"]', ORG_A.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard**');

    const cookies = await page.context().cookies();
    const authCookies = cookies
      .filter((c) => c.name.includes('session') || c.name.includes('wf'))
      .map((c) => `${c.name}=${c.value}`)
      .join('; ');

    await page.close();

    // Try to list clients with Org B's companyId
    const response = await request.post(`${BASE_URL}/api/trpc/clients.list`, {
      headers: {
        'Content-Type': 'application/json',
        Cookie: authCookies,
      },
      data: {
        json: { companyId: ORG_B.companyId },
      },
    });

    if (response.ok()) {
      const body = await response.json();
      const clients = body.result?.data || [];

      // Should only return Org A's clients (companyId from session, not parameter)
      clients.forEach((client: { companyId?: string }) => {
        expect(client.companyId).toBe(ORG_A.companyId);
      });
    }
  });
});
