/**
 * Database Query Helpers
 *
 * Utility functions for common database operations.
 */

import { db } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { companies, weddingWebsites } from '../schema-features';
import { nanoid } from 'nanoid';

/**
 * Generate a unique subdomain for a company or wedding website
 *
 * @param baseName - The base name to derive the subdomain from
 * @param type - Whether this is for a company or wedding website
 * @returns A unique subdomain string
 */
export async function generateUniqueSubdomain(
  baseName: string,
  type: 'company' | 'wedding' = 'company'
): Promise<string> {
  // Clean the base name - lowercase, remove special chars, replace spaces with hyphens
  const cleanedName = baseName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 20);

  // Start with the cleaned name
  let subdomain = cleanedName || 'wedding';
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    // Check if subdomain exists
    const table = type === 'company' ? companies : weddingWebsites;
    const existing = await db
      .select({ id: table.id })
      .from(table)
      .where(eq(table.subdomain, subdomain))
      .limit(1);

    if (existing.length === 0) {
      return subdomain;
    }

    // Add a random suffix
    subdomain = `${cleanedName}-${nanoid(4).toLowerCase()}`;
    attempts++;
  }

  // Fallback to fully random subdomain
  return `wedding-${nanoid(8).toLowerCase()}`;
}

/**
 * Check if a subdomain is available
 */
export async function isSubdomainAvailable(
  subdomain: string,
  type: 'company' | 'wedding' = 'company'
): Promise<boolean> {
  const table = type === 'company' ? companies : weddingWebsites;
  const existing = await db
    .select({ id: table.id })
    .from(table)
    .where(eq(table.subdomain, subdomain))
    .limit(1);

  return existing.length === 0;
}

/**
 * Generate a secure public token
 */
export function generatePublicToken(length: number = 32): string {
  return nanoid(length);
}

/**
 * Validate subdomain format
 */
export function isValidSubdomain(subdomain: string): boolean {
  // Must be 3-63 characters, start and end with alphanumeric, only contain alphanumeric and hyphens
  const regex = /^[a-z0-9]([a-z0-9-]{1,61}[a-z0-9])?$/;
  return regex.test(subdomain);
}

/**
 * Reserved subdomains that cannot be used
 */
export const RESERVED_SUBDOMAINS = [
  'www',
  'api',
  'app',
  'admin',
  'dashboard',
  'portal',
  'mail',
  'email',
  'smtp',
  'ftp',
  'cdn',
  'static',
  'assets',
  'blog',
  'help',
  'support',
  'docs',
  'status',
  'weddingflo',
];

/**
 * Check if a subdomain is reserved
 */
export function isReservedSubdomain(subdomain: string): boolean {
  return RESERVED_SUBDOMAINS.includes(subdomain.toLowerCase());
}
