import { db, sql, eq } from '@/lib/db';
import { weddingWebsites } from '@/lib/db/schema';
import { generateUniqueSubdomain as generateFromQuery } from '@/lib/db/queries/helpers';

/**
 * Subdomain Generation System
 * December 2025 - Drizzle ORM Implementation
 *
 * Generates unique subdomains like: john-jane.weddingflo.com
 * No Supabase dependencies
 */

/**
 * Generate unique subdomain from couple names
 * Uses database function for atomic uniqueness check
 */
export async function generateUniqueSubdomain(
  firstName: string,
  lastName: string
): Promise<string> {
  // Use the query helper function that uses Drizzle
  return generateFromQuery(`${firstName}-${lastName}`);
}

/**
 * Validate subdomain format
 */
export function validateSubdomain(subdomain: string): {
  valid: boolean;
  error?: string;
} {
  // Must be lowercase alphanumeric with hyphens
  if (!/^[a-z0-9-]+$/.test(subdomain)) {
    return {
      valid: false,
      error: 'Subdomain can only contain lowercase letters, numbers, and hyphens',
    };
  }

  // Must be 3-50 characters
  if (subdomain.length < 3 || subdomain.length > 50) {
    return {
      valid: false,
      error: 'Subdomain must be between 3 and 50 characters',
    };
  }

  // Cannot start or end with hyphen
  if (subdomain.startsWith('-') || subdomain.endsWith('-')) {
    return {
      valid: false,
      error: 'Subdomain cannot start or end with a hyphen',
    };
  }

  // Cannot have consecutive hyphens
  if (subdomain.includes('--')) {
    return {
      valid: false,
      error: 'Subdomain cannot contain consecutive hyphens',
    };
  }

  // Reserved subdomains
  const reserved = [
    'www',
    'api',
    'admin',
    'app',
    'dashboard',
    'portal',
    'auth',
    'login',
    'signup',
    'register',
    'superadmin',
    'system',
    'weddingflow',
    'weddingflo',
    'blog',
    'help',
    'support',
    'docs',
    'status',
  ];

  if (reserved.includes(subdomain)) {
    return {
      valid: false,
      error: 'This subdomain is reserved',
    };
  }

  return { valid: true };
}

/**
 * Check subdomain availability using Drizzle
 */
export async function checkSubdomainAvailability(subdomain: string): Promise<{
  available: boolean;
  subdomain: string;
}> {
  const result = await db
    .select({ id: weddingWebsites.id })
    .from(weddingWebsites)
    .where(eq(weddingWebsites.subdomain, subdomain))
    .limit(1);

  return {
    available: result.length === 0,
    subdomain,
  };
}

/**
 * Sanitize name for subdomain
 */
export function sanitizeForSubdomain(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '') // Remove non-alphanumeric except hyphens
    .replace(/--+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Suggest available subdomains based on names
 */
export async function suggestSubdomains(
  firstName: string,
  lastName: string,
  partner2FirstName?: string
): Promise<string[]> {
  const suggestions: string[] = [];

  const first = sanitizeForSubdomain(firstName);
  const last = sanitizeForSubdomain(lastName);
  const partner2 = partner2FirstName ? sanitizeForSubdomain(partner2FirstName) : null;

  // Generate suggestions
  if (partner2) {
    suggestions.push(`${first}-${partner2}`);
    suggestions.push(`${first}and${partner2}`);
    suggestions.push(`${first}-and-${partner2}`);
    suggestions.push(`${partner2}-${first}`);
  } else {
    suggestions.push(`${first}-${last}`);
    suggestions.push(`${first}${last}`);
    suggestions.push(`${last}-${first}`);
  }

  // Check availability for each suggestion
  const availabilityChecks = await Promise.all(
    suggestions.map(async (sub) => {
      const { available } = await checkSubdomainAvailability(sub);
      return { subdomain: sub, available };
    })
  );

  // Return only available ones
  return availabilityChecks.filter((s) => s.available).map((s) => s.subdomain);
}
