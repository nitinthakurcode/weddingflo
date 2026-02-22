import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { twoFactor } from 'better-auth/plugins';
import { db, eq } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import {
  logSignIn,
  logSignUp,
} from '@/lib/auth/auth-logger';
import { hashPassword, verifyPassword, rehashIfNeeded, isLegacyBcryptHash } from '@/lib/auth/argon2-password';
import { assertValidAuthEnv } from '@/lib/auth/validate-env';
import { Resend } from 'resend';

// Validate auth environment on module load (startup)
if (typeof window === 'undefined') {
  // Only validate on server-side
  assertValidAuthEnv();
}

/**
 * Verify password with transparent bcrypt→Argon2id rehash.
 *
 * BetterAuth's session hooks don't expose the plaintext password,
 * so this wrapper is the only place we can trigger rehashing.
 * On successful bcrypt verification, the hash is upgraded to Argon2id
 * in the background (fire-and-forget — sign-in is not blocked).
 */
async function verifyPasswordWithRehash(data: {
  hash: string;
  password: string;
}): Promise<boolean> {
  const isValid = await verifyPassword(data);

  if (isValid && isLegacyBcryptHash(data.hash)) {
    // Fire-and-forget: rehash in background without blocking sign-in.
    // We look up the userId from the account table by the hash value.
    import('drizzle-orm').then(({ sql: sqlTag }) => {
      db.execute(
        sqlTag`SELECT "userId" FROM account WHERE password = ${data.hash} AND "providerId" = 'credential' LIMIT 1`
      ).then(async (rows: any) => {
        const userId = rows[0]?.userId;
        if (userId) {
          await rehashIfNeeded(db, userId, data.hash, data.password);
          console.log(`[Auth] Migrated user ${userId} from bcrypt to Argon2id`);
        }
      }).catch((err: unknown) => {
        console.error('[Auth] Background rehash failed:', err);
      });
    });
  }

  return isValid;
}

// Initialize Resend for email sending
const resend = new Resend(process.env.RESEND_API_KEY);

// Email sending helper
async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Auth] RESEND_API_KEY not set, skipping email');
    return;
  }

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@weddingflow.pro',
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error('[Auth] Failed to send email:', error);
    throw error;
  }
}

/**
 * BetterAuth Configuration
 *
 * December 2025 - Main auth configuration for WeddingFlo
 * February 2026 - Added auth event logging hooks
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
    // Argon2id password hashing — Phase 2.3 security remediation
    // Replaces BetterAuth default bcrypt(10). Legacy bcrypt hashes
    // are still verified correctly (transparent migration).
    password: {
      hash: hashPassword,
      verify: verifyPasswordWithRehash,
    },
    // Email verification - Security February 2026
    requireEmailVerification: process.env.NODE_ENV === 'production',
    sendVerificationEmail: async ({ user, url }: { user: { email: string }; url: string }) => {
      await sendEmail({
        to: user.email,
        subject: 'Verify your WeddingFlo email',
        html: `
          <h1>Welcome to WeddingFlo!</h1>
          <p>Please verify your email address by clicking the link below:</p>
          <a href="${url}" style="display: inline-block; padding: 12px 24px; background-color: #8B5CF6; color: white; text-decoration: none; border-radius: 8px;">
            Verify Email
          </a>
          <p>If you didn't create an account, you can safely ignore this email.</p>
          <p>This link will expire in 24 hours.</p>
        `,
      });
    },
    sendResetPassword: async ({ user, url }: { user: { email: string }; url: string }) => {
      await sendEmail({
        to: user.email,
        subject: 'Reset your WeddingFlo password',
        html: `
          <h1>Password Reset Request</h1>
          <p>Click the link below to reset your password:</p>
          <a href="${url}" style="display: inline-block; padding: 12px 24px; background-color: #8B5CF6; color: white; text-decoration: none; border-radius: 8px;">
            Reset Password
          </a>
          <p>If you didn't request this, you can safely ignore this email.</p>
          <p>This link will expire in 1 hour.</p>
        `,
      });
    },
  },
  // Two-Factor Authentication - Security February 2026
  plugins: [
    twoFactor({
      issuer: 'WeddingFlo',
      totpOptions: {
        period: 30, // 30 second TOTP window
        digits: 6,
      },
      otpOptions: {
        // OTP via email as backup
        sendOTP: async ({ user, otp }) => {
          await sendEmail({
            to: user.email,
            subject: 'Your WeddingFlo verification code',
            html: `
              <h1>Your verification code</h1>
              <p>Use this code to complete your sign in:</p>
              <p style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #8B5CF6;">${otp}</p>
              <p>This code will expire in 5 minutes.</p>
              <p>If you didn't request this code, please secure your account immediately.</p>
            `,
          });
        },
        otpLength: 6,
        expiresIn: 5 * 60, // 5 minutes
      },
    }),
  ],
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    },
  },
  user: {
    // Include custom fields in session - eliminates extra DB queries
    // Note: Drizzle schema already maps camelCase to snake_case columns
    // Do NOT use fieldName - it tells BetterAuth to look for that property name in schema
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
      firstName: {
        type: 'string',
        defaultValue: null,
        input: false,
      },
      lastName: {
        type: 'string',
        defaultValue: null,
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
  // Advanced security settings - Security February 2026
  advanced: {
    // Secure cookie prefix (requires HTTPS)
    cookiePrefix: process.env.NODE_ENV === 'production' ? '__Secure-wf' : 'wf',
    // Use secure cookies in production
    useSecureCookies: process.env.NODE_ENV === 'production',
  },
  // Account settings
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ['google'],
    },
  },
  trustedOrigins: [
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    'https://weddingflow.pro',
    'https://www.weddingflow.pro',
    'https://app.weddingflow.pro',
  ],
  // Auth event logging hooks - February 2026
  // Note: Logging is done via databaseHooks instead of middleware hooks
  // for more reliable user data access
  databaseHooks: {
    session: {
      create: {
        async after(session) {
          // Log sign-in on session creation
          try {
            // Fetch user to get companyId for proper logging
            const [userData] = await db.select({ companyId: schema.user.companyId })
              .from(schema.user)
              .where(eq(schema.user.id, session.userId))
              .limit(1);

            await logSignIn(
              session.userId,
              userData?.companyId || null,
              session.ipAddress || undefined,
              session.userAgent || undefined,
              'email' // Default provider
            );
          } catch (error) {
            console.error('[Auth] Failed to log sign-in:', error);
          }
        },
      },
    },
    user: {
      create: {
        async after(user) {
          // Log sign-up on user creation
          try {
            await logSignUp(
              user.id,
              user.email,
              undefined,
              undefined
            );
          } catch (error) {
            console.error('[Auth] Failed to log sign-up:', error);
          }
        },
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
