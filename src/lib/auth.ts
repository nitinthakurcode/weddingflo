import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';

/**
 * BetterAuth Configuration
 *
 * December 2025 - Main auth configuration for WeddingFlo
 *
 * Custom fields (role, companyId) are included in session via user.additionalFields
 * This eliminates the need for extra DB queries in dashboard layout
 */
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    },
  },
  user: {
    // Include custom fields in session - eliminates extra DB queries
    additionalFields: {
      role: {
        type: 'string',
        defaultValue: 'company_admin',
        input: false, // Not settable via API
      },
      companyId: {
        type: 'string',
        defaultValue: null,
        input: false,
      },
      onboardingCompleted: {
        type: 'boolean',
        defaultValue: false,
        input: false,
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },
  trustedOrigins: [
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  ],
});

export type Session = typeof auth.$Infer.Session;
