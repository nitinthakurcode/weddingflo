import { createServerSupabaseAdminClient } from '@/lib/supabase/server';
import dns from 'dns/promises';

/**
 * Domain DNS Verification System
 * Session 49: Custom domain ownership verification
 *
 * Verifies custom domain ownership via DNS TXT records
 * Following October 2025 standards
 */

export interface DNSVerificationResult {
  success: boolean;
  verified?: boolean;
  error?: string;
  found?: string[];
  expected?: string;
}

export interface DNSInstructions {
  txt: {
    type: string;
    name: string;
    value: string;
    instructions: string;
    ttl: number;
  };
  cname: {
    type: string;
    name: string;
    value: string;
    instructions: string;
    ttl: number;
  };
  alternativeA: {
    type: string;
    name: string;
    value: string;
    instructions: string;
    ttl: number;
  };
}

/**
 * Verify custom domain ownership via DNS TXT record
 */
export async function verifyCustomDomain(
  websiteId: string,
  domain: string
): Promise<DNSVerificationResult> {
  const supabase = createServerSupabaseAdminClient();

  try {
    // Get verification token
    const { data: website } = await supabase
      .from('wedding_websites')
      .select('dns_verification_token')
      .eq('id', websiteId)
      .single();

    if (!website?.dns_verification_token) {
      throw new Error('Verification token not found');
    }

    // Check DNS TXT record
    const txtRecordName = `_weddingflow.${domain}`;
    const expectedValue = website.dns_verification_token;

    try {
      const records = await dns.resolveTxt(txtRecordName);
      const flatRecords = records.flat();

      // Check if verification token exists
      if (flatRecords.includes(expectedValue)) {
        // Verification successful!
        await supabase
          .from('wedding_websites')
          .update({
            custom_domain_verified: true,
            custom_domain: domain,
          })
          .eq('id', websiteId);

        // Update DNS record status
        await supabase
          .from('domain_dns_records')
          .update({
            verified: true,
            verified_at: new Date().toISOString(),
          })
          .eq('website_id', websiteId)
          .eq('record_type', 'TXT');

        return { success: true, verified: true };
      } else {
        return {
          success: false,
          error: 'Verification token not found in DNS records',
          found: flatRecords,
          expected: expectedValue,
        };
      }
    } catch (dnsError: any) {
      return {
        success: false,
        error: `DNS lookup failed: ${dnsError.message}. DNS may not be configured yet.`,
      };
    }
  } catch (error: any) {
    console.error('Domain verification error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Generate DNS configuration instructions
 */
export function getDNSInstructions(
  domain: string,
  verificationToken: string
): DNSInstructions {
  return {
    txt: {
      type: 'TXT',
      name: `_weddingflow`,
      value: verificationToken,
      instructions: `Add a TXT record with name "_weddingflow" and value "${verificationToken}"`,
      ttl: 3600,
    },
    cname: {
      type: 'CNAME',
      name: domain === 'www' ? 'www' : '@',
      value: 'websites.weddingflow.com',
      instructions: `Add a CNAME record for "${
        domain === 'www' ? 'www' : '@'
      }" pointing to "websites.weddingflow.com"`,
      ttl: 3600,
    },
    alternativeA: {
      type: 'A',
      name: '@',
      value: '76.76.21.21',
      instructions: `Alternative: Add an A record for "@" pointing to "76.76.21.21"`,
      ttl: 3600,
    },
  };
}

/**
 * Check if domain is available
 */
export async function checkDomainAvailability(domain: string): Promise<{
  available: boolean;
  domain: string;
}> {
  const supabase = createServerSupabaseAdminClient();

  const { data, error } = await supabase
    .from('wedding_websites')
    .select('id')
    .eq('custom_domain', domain)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return {
    available: !data,
    domain,
  };
}

/**
 * Validate domain format
 */
export function validateDomain(domain: string): {
  valid: boolean;
  error?: string;
} {
  // Basic domain format validation
  const domainRegex = /^[a-z0-9.-]+\.[a-z]{2,}$/i;

  if (!domainRegex.test(domain)) {
    return {
      valid: false,
      error: 'Invalid domain format. Must be like example.com or www.example.com',
    };
  }

  // Cannot be weddingflow.com or subdomain
  if (domain.includes('weddingflow.com')) {
    return {
      valid: false,
      error: 'Cannot use weddingflow.com domains. Use the free subdomain feature instead.',
    };
  }

  return { valid: true };
}
